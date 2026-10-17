import type { CallState, FieldValue, Outcome } from "@oxumi/flow-core";
import type WebSocket from "ws";
import type { AudioFormat } from "../speech/types";

export type ServerEvent =
  | { type: "ready"; callId: string }
  | { type: "transcript"; role: "caller"; text: string; final: boolean }
  | { type: "agent_text"; turn: number; delta: string }
  | { type: "agent_audio_end"; turn: number }
  | { type: "clear" }
  | { type: "state"; state: CallState }
  | {
      type: "turn";
      turn: number;
      interrupted: boolean;
      llmMs: number | null;
      audioMs: number | null;
    }
  | {
      type: "ended";
      outcome: Outcome;
      fields: Record<string, FieldValue>;
    }
  | {
      type: "transfer";
      to: string;
      summary: string;
      status: "connected" | "simulated" | "failed";
      error?: string;
    }
  | { type: "error"; message: string };

// A channel to one caller. The session only ever talks to this interface, so
// the browser and a phone line are interchangeable.
export interface Transport {
  readonly format: AudioFormat;
  sendAudio(chunk: Buffer): void;
  sendEvent(event: ServerEvent): void;
  // Drop audio already queued for playback (the caller interrupted).
  clear(): void;
  close(): void;
  onAudio: (chunk: Buffer) => void;
  onText: (text: string) => void;
  onPlaybackDone: (turn: number) => void;
  onClose: () => void;
}

export class BrowserTransport implements Transport {
  readonly format = "pcm_16000" as const;
  onAudio: (chunk: Buffer) => void = () => {};
  onText: (text: string) => void = () => {};
  onPlaybackDone: (turn: number) => void = () => {};
  onClose: () => void = () => {};

  constructor(private ws: WebSocket) {
    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) return this.onAudio(data);
      let msg: { type?: string; text?: string; turn?: number };
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg.type === "text" && typeof msg.text === "string")
        this.onText(msg.text);
      else if (msg.type === "playback_done" && typeof msg.turn === "number")
        this.onPlaybackDone(msg.turn);
      else if (msg.type === "hangup") ws.close();
    });
    ws.on("close", () => this.onClose());
  }

  private get open(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }

  sendAudio(chunk: Buffer): void {
    if (this.open) this.ws.send(chunk, { binary: true });
  }

  sendEvent(event: ServerEvent): void {
    if (this.open) this.ws.send(JSON.stringify(event));
  }

  clear(): void {
    this.sendEvent({ type: "clear" });
  }

  close(): void {
    this.ws.close();
  }
}
