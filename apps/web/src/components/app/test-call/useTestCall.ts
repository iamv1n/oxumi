"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { refreshCalls, type ServerEvent, type StartCallMessage, WS_URL } from "@/lib/api";
import { CallAudio } from "@/lib/audio";
import { createLevel, pcmLevel } from "./level";
import { type BrowserMode, initialState, reducer } from "./state";

// How long the agent's goodbye may keep playing after the socket closes.
const AUDIO_TAIL_MS = 4000;

export interface StartOptions {
  mode: BrowserMode;
  variables: Record<string, string>;
  // "<provider>:<model>", or "" to let the agent / server decide.
  model: string;
  // The model the call will actually run on, for display.
  resolvedModel: string;
}

// Runs one test call at a time over the call socket and exposes it as a
// single state object. See apps/api/src/runtime/transport.ts for the protocol.
export function useTestCall(projectId: string, agentId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Live microphone loudness for the level meter (voice calls only).
  const [mic] = useState(createLevel);
  const socket = useRef<WebSocket | null>(null);
  const audio = useRef<CallAudio | null>(null);
  const audioTail = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every start and on unmount; stale callbacks compare and bail.
  const generation = useRef(0);

  const stopAudio = useCallback(() => {
    if (audioTail.current) clearTimeout(audioTail.current);
    audioTail.current = null;
    audio.current?.stop();
    audio.current = null;
    mic.reset();
  }, [mic]);

  const teardown = useCallback(() => {
    generation.current += 1;
    const ws = socket.current;
    socket.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
        ws.close();
    }
    stopAudio();
  }, [stopAudio]);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(
    async ({ mode, variables, model, resolvedModel }: StartOptions) => {
      teardown();
      const run = generation.current;
      const current = () => generation.current === run;
      dispatch({ type: "start", mode, model: resolvedModel, at: Date.now() });

      let ws: WebSocket | null = null;
      let ready = false;
      const send = (message: object) => {
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      };

      // Voice: ask for the microphone first, while we still hold the click
      // that started the call, so a refusal costs nothing and the agent's
      // greeting is never played into an audio graph that is not built yet.
      let player: CallAudio | null = null;
      if (mode === "voice") {
        player = audio.current = new CallAudio();
        try {
          await player.start(
            (pcm) => {
              if (current()) mic.set(pcmLevel(pcm));
              if (ready && ws?.readyState === WebSocket.OPEN) ws.send(pcm);
            },
            (turn) => {
              send({ type: "playback_done", turn });
              if (current()) dispatch({ type: "playback_done", turn });
            },
          );
        } catch {
          player.stop();
          if (!current()) return;
          audio.current = null;
          dispatch({
            type: "local_error",
            message: "Microphone access was denied or no microphone was found.",
            at: Date.now(),
          });
          return;
        }
        if (!current()) return player.stop();
      }

      try {
        ws = socket.current = new WebSocket(WS_URL);
      } catch {
        stopAudio();
        dispatch({ type: "closed", at: Date.now() });
        return;
      }
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        const message: StartCallMessage = {
          type: "start",
          agentId,
          mode,
          variables,
          ...(model ? { model } : {}),
        };
        send(message);
      };

      ws.onmessage = ({ data }) => {
        if (!current()) return;
        if (typeof data !== "string") return player?.play(data as ArrayBuffer);
        let event: ServerEvent;
        try {
          event = JSON.parse(data) as ServerEvent;
        } catch {
          return;
        }
        if (event.type === "ready") ready = true;
        if (event.type === "agent_audio_end") player?.mark(event.turn);
        if (event.type === "clear") player?.clear();
        dispatch({ type: "server", event, at: Date.now() });
        if (event.type === "ended") void refreshCalls(projectId);
      };

      ws.onclose = () => {
        if (!current()) return;
        socket.current = null;
        // Let the goodbye finish playing before the audio graph is torn down.
        if (player) {
          audioTail.current = setTimeout(() => {
            player?.stop();
            if (audio.current === player) audio.current = null;
          }, AUDIO_TAIL_MS);
        }
        dispatch({ type: "closed", at: Date.now() });
        void refreshCalls(projectId);
      };
    },
    [agentId, mic, projectId, stopAudio, teardown],
  );

  const sendText = useCallback((text: string): boolean => {
    const ws = socket.current;
    const trimmed = text.trim();
    if (!trimmed || ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ type: "text", text: trimmed }));
    dispatch({ type: "sent_text" });
    return true;
  }, []);

  const hangUp = useCallback(() => {
    const ws = socket.current;
    dispatch({ type: "hangup", at: Date.now() });
    // The tester ended it: silence the agent and release the mic right away.
    audio.current?.clear();
    stopAudio();
    if (!ws) return teardown();
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "hangup" }));
    ws.close();
  }, [stopAudio, teardown]);

  const reset = useCallback(() => {
    teardown();
    dispatch({ type: "reset" });
  }, [teardown]);

  return { state, mic, start, sendText, hangUp, reset };
}
