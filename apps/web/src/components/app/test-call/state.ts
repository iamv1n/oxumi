import type { CallState, FieldValue, Outcome } from "@oxumi/flow-core";
import type { Handoff, ServerEvent } from "@/lib/api";

// The whole test console is a pure function of ConsoleState. The socket hook
// feeds it server events; the preview page feeds it hand-written ones.

// voice / text: a test call in this browser, over the call socket.
// phone: a real outbound phone call, followed through its saved record.
export type Mode = "voice" | "text" | "phone";
export type BrowserMode = Exclude<Mode, "phone">;

// Where a phone call is. "placing": the request to dial is still in flight.
export interface PhoneLeg {
  to: string;
  stage: "placing" | "queued" | "ringing" | "in_progress" | "ended";
  telephony: string | null;
}
export type Status = "idle" | "connecting" | "live" | "ended";
// Whose turn it is while a call is live.
export type Phase = "listening" | "thinking" | "speaking";
// Why the call stopped: the flow finished it, the tester hung up, or it broke.
export type EndReason = "finished" | "hangup" | "error" | "dropped";

// A hand-off to a person, as the console shows it in the transcript.
export type Transfer = Pick<Handoff, "to" | "summary" | "status" | "error">;

export interface Line {
  id: number;
  // "transfer": not speech, a note that the call was handed to a person.
  role: "agent" | "caller" | "transfer";
  text: string;
  turn?: number;
  // The agent is still producing this line.
  streaming?: boolean;
  interrupted?: boolean;
  // Set on "transfer" lines.
  transfer?: Transfer;
}

export interface Timing {
  turn: number;
  llmMs: number | null;
  audioMs: number | null;
  interrupted: boolean;
}

export interface ConsoleState {
  status: Status;
  mode: Mode;
  // What the call was started with, for the status line and error help.
  model: string;
  callId: string | null;
  lines: Line[];
  // Partial transcript of what the caller is saying right now.
  hearing: string;
  phase: Phase;
  call: CallState | null;
  timings: Timing[];
  result: { outcome: Outcome; fields: Record<string, FieldValue> } | null;
  error: string | null;
  endReason: EndReason | null;
  startedAt: number | null;
  endedAt: number | null;
  // Set for phone calls only.
  phone: PhoneLeg | null;
}

export type Action =
  | { type: "start"; mode: BrowserMode; model: string; at: number }
  | { type: "server"; event: ServerEvent; at: number }
  // The tester sent a typed reply; the server echoes it back as a transcript.
  | { type: "sent_text" }
  // The browser finished playing a turn's audio.
  | { type: "playback_done"; turn: number }
  | { type: "local_error"; message: string; at: number }
  | { type: "hangup"; at: number }
  | { type: "closed"; at: number }
  | { type: "reset" };

export const initialState: ConsoleState = {
  status: "idle",
  mode: "text",
  model: "",
  callId: null,
  lines: [],
  hearing: "",
  phase: "thinking",
  call: null,
  timings: [],
  result: null,
  error: null,
  endReason: null,
  startedAt: null,
  endedAt: null,
  phone: null,
};

const settle = (lines: Line[]): Line[] =>
  lines.some((line) => line.streaming)
    ? lines.map((line) => (line.streaming ? { ...line, streaming: false } : line))
    : lines;

function end(state: ConsoleState, reason: EndReason, at: number): ConsoleState {
  if (state.status === "ended") return state;
  return {
    ...state,
    status: "ended",
    hearing: "",
    lines: settle(state.lines),
    endReason: state.endReason ?? reason,
    endedAt: at,
  };
}

function reduceServer(state: ConsoleState, event: ServerEvent, at: number): ConsoleState {
  switch (event.type) {
    case "ready":
      return {
        ...state,
        status: "live",
        callId: event.callId,
        phase: "thinking",
        startedAt: at,
      };
    case "transcript":
      if (!event.final) return { ...state, hearing: event.text, phase: "listening" };
      return {
        ...state,
        hearing: "",
        phase: "thinking",
        lines: [
          ...settle(state.lines),
          { id: state.lines.length, role: "caller", text: event.text },
        ],
      };
    case "agent_text": {
      const last = state.lines.at(-1);
      if (last?.role === "agent" && last.turn === event.turn) {
        return {
          ...state,
          phase: "speaking",
          lines: [
            ...state.lines.slice(0, -1),
            { ...last, text: last.text + event.delta, streaming: true },
          ],
        };
      }
      return {
        ...state,
        phase: "speaking",
        lines: [
          ...settle(state.lines),
          {
            id: state.lines.length,
            role: "agent",
            text: event.delta,
            turn: event.turn,
            streaming: true,
          },
        ],
      };
    }
    case "clear":
      // The caller cut in; queued audio was dropped.
      return { ...state, phase: "listening" };
    case "turn":
      return {
        ...state,
        phase: state.phase === "speaking" ? "listening" : state.phase,
        timings: [
          ...state.timings.filter((t) => t.turn !== event.turn),
          {
            turn: event.turn,
            llmMs: event.llmMs,
            audioMs: event.audioMs,
            interrupted: event.interrupted,
          },
        ],
        lines: state.lines.map((line) =>
          line.turn === event.turn
            ? { ...line, streaming: false, interrupted: event.interrupted }
            : line,
        ),
      };
    case "state":
      return { ...state, call: event.state };
    case "transfer":
      // A test call only simulates it and then ends; a failed one carries on.
      return {
        ...state,
        lines: [
          ...settle(state.lines),
          {
            id: state.lines.length,
            role: "transfer",
            text: event.summary,
            transfer: {
              to: event.to,
              summary: event.summary,
              status: event.status,
              error: event.error,
            },
          },
        ],
      };
    case "ended":
      return {
        ...end(state, state.error ? "error" : "finished", at),
        result: { outcome: event.outcome, fields: event.fields },
      };
    case "error":
      return { ...state, error: event.message, endReason: state.endReason ?? "error" };
    default:
      return state;
  }
}

export function reducer(state: ConsoleState, action: Action): ConsoleState {
  switch (action.type) {
    case "start":
      return {
        ...initialState,
        status: "connecting",
        mode: action.mode,
        model: action.model,
      };
    case "server":
      return reduceServer(state, action.event, action.at);
    case "sent_text":
      return state.status === "live" ? { ...state, phase: "thinking" } : state;
    case "playback_done":
      return state.phase === "speaking" ? { ...state, phase: "listening" } : state;
    case "local_error":
      return end({ ...state, error: action.message, endReason: "error" }, "error", action.at);
    case "hangup":
      return end(state, "hangup", action.at);
    case "closed": {
      if (state.status === "ended") return state;
      if (state.status === "idle") return state;
      if (state.error) return end(state, "error", action.at);
      // The socket closed without the server saying why.
      const message =
        state.status === "connecting"
          ? "Could not connect to the call server."
          : "The connection to the call server was lost.";
      return end({ ...state, error: message }, "dropped", action.at);
    }
    case "reset":
      return initialState;
    default:
      return state;
  }
}

// ---- Derived values -------------------------------------------------------

export const isActive = (state: ConsoleState): boolean =>
  state.status === "connecting" || state.status === "live";

export function median(values: (number | null)[]): number | null {
  const sorted = values
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

// The fields collected so far: the final result once the call has ended.
export const collected = (state: ConsoleState): Record<string, FieldValue> =>
  state.result?.fields ?? state.call?.fields ?? {};

export type ErrorKind =
  | "llm_credentials"
  | "voice_credentials"
  | "microphone"
  | "not_ready"
  | "variables"
  | "signed_out"
  | "phone_unreachable"
  | "telephony_credentials"
  | "phone_number"
  | "phone_outcome"
  | "connection"
  | "other";

export function classifyError(
  message: string,
  reason: EndReason | null,
  // A phone call that was actually placed (it has a record).
  placedPhoneCall = false,
): ErrorKind {
  if (/^sign in\b/i.test(message)) return "signed_out";
  // Once dialled, the reason is about the call itself: nobody answered, busy…
  if (placedPhoneCall) return "phone_outcome";
  if (/public URL|PUBLIC_URL/i.test(message)) return "phone_unreachable";
  if (/telephony provider|twilio|exotel|vobiz/i.test(message)) return "telephony_credentials";
  if (/international format|phone number/i.test(message)) return "phone_number";
  if (/speech provider|ELEVENLABS|sarvam/i.test(message)) return "voice_credentials";
  if (/microphone/i.test(message)) return "microphone";
  if (/not ready/i.test(message)) return "not_ready";
  if (/missing variables/i.test(message)) return "variables";
  if (
    /is not connected|under Integrations|authentication|api[_ -]?key|apiKey|authToken|unauthori[sz]ed|\b401\b|invalid.*key|credentials/i.test(
      message,
    )
  )
    return "llm_credentials";
  if (reason === "dropped") return "connection";
  return "other";
}

export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const DEVANAGARI = /[ऀ-ॿ]/;
export const hasDevanagari = (text: string): boolean => DEVANAGARI.test(text);

export function formatValue(value: FieldValue): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).replaceAll("_", " ");
}
