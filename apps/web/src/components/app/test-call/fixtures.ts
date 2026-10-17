import type { CallState, FieldValue } from "@oxumi/flow-core";
import type { AgentDetail, CallDetail, Credential, Health, ServerEvent, Turn } from "@/lib/api";
import { fromCallRecord, placingState, refusedState } from "./phone";
import { type BrowserMode, type ConsoleState, initialState, reducer } from "./state";

// Hand-written data for /preview/test-call: the states a machine without LLM
// or speech keys can never reach. Calls are written as the server events a
// real one would send and run through the real reducer, so the preview shows
// what the console would do with them, not a parallel mock of its state.

const PROJECT_ID = "preview-project";
const MODEL = "anthropic:claude-haiku-5-5";

export const fixtureProjectId = PROJECT_ID;

export const fixtureAgent: AgentDetail = {
  id: "preview-agent",
  projectId: PROJECT_ID,
  name: "Driver check-in",
  description: "Calls a driver mid-trip and records location, schedule and any issue.",
  model: "",
  speech: "",
  telephony: "",
  phoneNumber: "",
  knowledge: true,
  ready: true,
  stepCount: 10,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-12T21:26:42.639Z",
  layout: {},
  issues: [],
  flow: {
    id: "driver-status-check",
    name: "Truck driver status check",
    description: "Calls a driver mid-trip and records location, schedule and any issue.",
    settings: {
      persona: "You are a dispatch assistant checking in with a truck driver who is on the road.",
      languages: ["hi", "en"],
      maxAttempts: 2,
      maxDurationSec: 240,
    },
    variables: [
      { name: "driver_name", description: "Driver's first name", example: "Ramesh" },
      { name: "company", description: "Fleet operator the call is made for", example: "Shakti Logistics" },
      { name: "route", description: "Origin and destination", example: "Nagpur to Hyderabad" },
      { name: "planned_eta", description: "Planned arrival time", example: "tonight at 9 pm" },
    ],
    fields: [
      { name: "current_location", type: "string", required: true, description: "Where the truck is right now: a city, town or highway landmark" },
      { name: "on_schedule", type: "boolean", required: true, description: "Whether the driver expects to arrive by the planned time" },
      { name: "delay_reason", type: "enum", required: true, options: ["traffic", "breakdown", "loading_delay", "weather", "paperwork", "rest_stop", "other"], description: "Main cause of the delay" },
      { name: "revised_eta", type: "string", required: true, description: "New expected arrival time, as the driver said it" },
      { name: "needs_help", type: "boolean", required: true, description: "Whether the driver has a problem that needs the office's help" },
      { name: "issue_details", type: "string", required: true, description: "What the problem is, in the driver's words" },
    ],
    start: "greeting",
    nodes: [
      { id: "greeting", type: "start", say: "Namaste {{driver_name}} ji, this is the automated assistant from {{company}}, calling for a quick update on your {{route}} trip.", next: "ask_location" },
      { id: "ask_location", type: "ask", fields: ["current_location"], guidance: "A nearby town, toll plaza or highway number is enough.", next: "ask_schedule" },
      { id: "ask_schedule", type: "ask", fields: ["on_schedule"], guidance: "The planned arrival is {{planned_eta}}.", next: "check_schedule" },
      { id: "check_schedule", type: "branch", branches: [{ when: { field: "on_schedule", op: "eq", value: false }, next: "ask_delay" }], default: "ask_help" },
      { id: "ask_delay", type: "ask", fields: ["delay_reason", "revised_eta"], guidance: "Ask what is causing the delay.", next: "ask_help" },
      { id: "ask_help", type: "ask", fields: ["needs_help"], guidance: "Ask whether the office should help with anything.", next: "check_help" },
      { id: "check_help", type: "branch", branches: [{ when: { field: "needs_help", op: "eq", value: true }, next: "ask_issue" }], default: "goodbye" },
      { id: "ask_issue", type: "ask", fields: ["issue_details"], guidance: "Let them describe it.", next: "goodbye_help" },
      { id: "goodbye_help", type: "end", say: "Thank you, I have noted this and the office will call you shortly. Drive safe.", outcome: "completed" },
      { id: "goodbye", type: "end", say: "Thank you, your update is recorded. Drive safe.", outcome: "completed" },
    ],
  },
};

export const fixtureBrokenAgent: AgentDetail = {
  ...fixtureAgent,
  id: "preview-broken-agent",
  name: "Feedback call",
  ready: false,
  issues: [
    { level: "error", message: '"ask_schedule" is not connected to a next step.' },
    { level: "error", message: '"check_help" has no "otherwise" connection.' },
  ],
};

const models = [
  { ref: "anthropic:claude-opus-5-5", label: "Claude Opus 5.5" },
  { ref: "anthropic:claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { ref: MODEL, label: "Claude Haiku 5.5 (fastest)" },
];

const NOT_CONNECTED = "Add an API key under Integrations";

// A project with a language model and a speech provider connected.
export const fixtureHealth: Health = {
  defaultModel: MODEL,
  providers: [
    { id: "anthropic", label: "Anthropic", available: true, source: "project", models },
    { id: "openai", label: "OpenAI", available: false, source: null, note: NOT_CONNECTED, models: [] },
    { id: "gemini", label: "Google Gemini", available: false, source: null, note: NOT_CONNECTED, models: [] },
  ],
  speech: [
    { id: "elevenlabs", label: "ElevenLabs", available: true, source: "project", voiceSet: true },
    { id: "sarvam", label: "Sarvam AI", available: false, source: null, voiceSet: false },
  ],
  voice: true,
  voiceIdSet: true,
  phone: { ready: true, providers: ["twilio"], serverReachable: true },
};

// A new project: nothing connected yet.
export const fixtureBareHealth: Health = {
  defaultModel: "anthropic:claude-opus-5-5",
  providers: fixtureHealth.providers.map((p) =>
    p.id === "anthropic" ? { ...p, available: false, source: null, note: NOT_CONNECTED } : p,
  ),
  speech: fixtureHealth.speech.map((s) => ({ ...s, available: false, source: null, voiceSet: false })),
  voice: false,
  voiceIdSet: false,
  phone: { ready: false, providers: [], serverReachable: false },
};

export const fixtureVariables: Record<string, string> = Object.fromEntries(
  fixtureAgent.flow.variables.map((v) => [v.name, v.example ?? ""]),
);

// ---- The scripted call --------------------------------------------------------

export interface Step {
  // Milliseconds after the previous step (used when the script is replayed).
  wait: number;
  event?: ServerEvent;
  // The browser finished playing this turn's audio.
  playbackDone?: number;
}

const state = (
  nodeId: string,
  path: string[],
  fields: Record<string, FieldValue>,
  ended = false,
): CallState => ({
  nodeId,
  path,
  fields,
  attempts: {},
  skipped: [],
  ended,
  ...(ended ? { outcome: "completed" as const } : {}),
});

// The agent's reply, token by token, then the audio hand-off.
const say = (turn: number, text: string, firstWait: number): Step[] => {
  const words = text.match(/\S+\s*/g) ?? [];
  return [
    ...words.map((delta, i) => ({
      wait: i === 0 ? firstWait : 55,
      event: { type: "agent_text" as const, turn, delta },
    })),
    { wait: 120, event: { type: "agent_audio_end", turn } },
  ];
};

// The caller speaking: partial transcripts, then the final one.
const hear = (text: string, wait = 1500): Step[] => {
  const words = text.split(" ");
  const partials = [0.35, 0.7].map((share) =>
    words.slice(0, Math.max(1, Math.round(words.length * share))).join(" "),
  );
  return [
    ...partials.map((partial, i) => ({
      wait: i === 0 ? wait : 450,
      event: { type: "transcript" as const, role: "caller" as const, text: partial, final: false },
    })),
    { wait: 500, event: { type: "transcript", role: "caller", text, final: true } },
  ];
};

const turnDone = (
  turn: number,
  llmMs: number | null,
  audioMs: number | null,
  next: CallState,
  interrupted = false,
): Step[] => [
  ...(interrupted ? [] : [{ wait: 5200, playbackDone: turn }]),
  { wait: 60, event: { type: "turn", turn, interrupted, llmMs, audioMs } },
  { wait: 20, event: { type: "state", state: next } },
];

const LOCATION = { current_location: "Adilabad toll plaza, NH 44" };
const LATE = { ...LOCATION, on_schedule: false, delay_reason: "traffic" };
const NEW_ETA = { ...LATE, revised_eta: "around 11:30 pm" };
const DONE = { ...NEW_ETA, needs_help: false };

const PATH_1 = ["greeting", "ask_location"];
const PATH_2 = [...PATH_1, "ask_schedule"];
const PATH_3 = [...PATH_2, "check_schedule", "ask_delay"];
const PATH_4 = [...PATH_3, "ask_help"];
const PATH_5 = [...PATH_4, "check_help", "goodbye"];

const opening: Step[] = [
  { wait: 400, event: { type: "ready", callId: "preview-call" } },
  ...say(
    0,
    "Namaste Ramesh ji, this is the automated assistant from Shakti Logistics, calling for a quick update on your Nagpur to Hyderabad trip. अभी आप कहाँ तक पहुँचे हैं?",
    500,
  ),
  ...turnDone(0, 438, 702, state("ask_location", PATH_1, {})),

  ...hear("हाँ जी, अभी Adilabad toll plaza cross किया है, NH 44 पर हूँ।"),
  ...say(1, "ठीक है, Adilabad toll plaza, NH 44. क्या आप आज रात 9 बजे तक Hyderabad पहुँच जाएँगे?", 610),
  ...turnDone(1, 612, 918, state("ask_schedule", PATH_2, LOCATION)),

  ...hear("नहीं, थोड़ा late होगा। Nirmal के पास बहुत traffic था।"),
  ...say(2, "कोई बात नहीं, traffic में देर हो जाती है। तो अब आप लगभग कितने बजे तक", 560),
  // The driver answers before the agent has finished asking.
  { wait: 200, event: { type: "transcript", role: "caller", text: "ग्यारह", final: false } },
  { wait: 10, event: { type: "clear" } },
  ...turnDone(2, 557, 861, state("ask_delay", PATH_3, LATE), true),
  { wait: 700, event: { type: "transcript", role: "caller", text: "ग्यारह, साढ़े ग्यारह बजे तक पहुँच जाऊँगा।", final: true } },
  ...say(3, "ठीक है, around 11:30 pm note कर लिया। गाड़ी, load या paperwork में कोई problem है जिसमें office मदद करे?", 720),
  ...turnDone(3, 724, 1043, state("ask_help", PATH_4, NEW_ETA)),

  // The preview's "live" state stops here, mid-answer.
  { wait: 900, event: { type: "transcript", role: "caller", text: "नहीं नहीं, सब", final: false } },
];

const closing: Step[] = [
  { wait: 600, event: { type: "transcript", role: "caller", text: "नहीं नहीं, सब ठीक है। गाड़ी भी ठीक चल रही है।", final: true } },
  ...say(4, "Thank you, your update is recorded. Drive safe.", 480),
  ...turnDone(4, 481, 766, state("goodbye", PATH_5, DONE, true)),
  { wait: 200, event: { type: "ended", outcome: "completed", fields: DONE } },
];

export const scriptedCall: Step[] = [...opening, ...closing];
export const liveSteps = opening.length;

// ---- Fixture states ---------------------------------------------------------

export function begin(mode: BrowserMode, model = MODEL, at = 0): ConsoleState {
  return reducer(initialState, { type: "start", mode, model, at });
}

export function applyStep(current: ConsoleState, step: Step, at: number): ConsoleState {
  if (step.event) return reducer(current, { type: "server", event: step.event, at });
  if (step.playbackDone !== undefined)
    return reducer(current, { type: "playback_done", turn: step.playbackDone });
  return current;
}

// Runs the first `count` steps of the script on a clock that starts at `origin`.
export function play(mode: BrowserMode, count: number, origin: number): ConsoleState {
  let at = origin;
  return scriptedCall.slice(0, count).reduce(
    (current, step) => applyStep(current, step, (at += step.wait)),
    begin(mode, MODEL, origin),
  );
}

const AUTH_ERROR = "Anthropic is not connected. Add its API key under Integrations.";

// What a project with no model key produces: ready, an error, ended.
export function failed(origin: number): ConsoleState {
  const events: ServerEvent[] = [
    { type: "ready", callId: "preview-failed-call" },
    { type: "error", message: AUTH_ERROR },
    { type: "ended", outcome: "failed", fields: {} },
  ];
  return events.reduce(
    (current, event, i) => reducer(current, { type: "server", event, at: origin + 300 * (i + 1) }),
    begin("text", "anthropic:claude-opus-5-5", origin),
  );
}

export const FIXTURES = [
  "idle",
  "connecting",
  "live",
  "live-text",
  "ended",
  "hangup",
  "error",
  "error-voice",
  "error-dropped",
  "not-ready",
  "phone-placing",
  "phone-ringing",
  "phone-live",
  "phone-ended",
  "phone-no-answer",
  "phone-refused",
] as const;
export type FixtureName = (typeof FIXTURES)[number];

export interface Fixture {
  agent: AgentDetail;
  health: Health;
  state: ConsoleState;
}

// ---- Phone calls: saved records, as polling would return them ------------------

const PHONE_TO = "+919876543210";

// Twilio connected with a calling number; nothing else matters to the console.
export const fixtureCredentials: Credential[] = [
  {
    provider: "twilio",
    label: "Twilio",
    kind: "telephony",
    keysUrl: "https://console.twilio.com/",
    secretLabel: "Auth token",
    optionFields: [],
    missing: [],
    source: "project",
    hint: "4f2a",
    options: { accountSid: "AC0000", fromNumber: "+14155550123" },
    verifiedAt: null,
    verifyError: null,
    updatedAt: null,
  },
];

const turn = (
  index: number,
  callerText: string | null,
  agentText: string,
  nodeId: string,
  llmMs: number | null,
  audioMs: number | null,
  at: number,
  interrupted = false,
): Turn => ({
  id: `preview-turn-${index}`,
  index,
  callerText,
  agentText,
  interrupted,
  nodeId,
  llmMs,
  audioMs,
  createdAt: new Date(at).toISOString(),
});

function phoneRecord(
  origin: number,
  status: CallDetail["status"],
  turns: Turn[],
  rest: Partial<CallDetail> = {},
): CallDetail {
  return {
    id: "preview-phone-call",
    projectId: PROJECT_ID,
    agentId: fixtureAgent.id,
    agent: { id: fixtureAgent.id, name: fixtureAgent.name },
    channel: "phone",
    model: MODEL,
    variables: fixtureVariables,
    fields: {},
    outcome: null,
    status,
    error: null,
    to: PHONE_TO,
    telephony: "twilio",
    metadata: {},
    startedAt: new Date(origin).toISOString(),
    endedAt: null,
    handoff: null,
    turns,
    ...rest,
  };
}

const phoneTurns = (origin: number): Turn[] => [
  turn(0, null, "Namaste Ramesh ji, this is the automated assistant from Shakti Logistics, calling for a quick update on your Nagpur to Hyderabad trip. अभी आप कहाँ तक पहुँचे हैं?", "ask_location", 512, 1180, origin + 9_000),
  turn(1, "हाँ जी, अभी Adilabad toll plaza cross किया है, NH 44 पर हूँ।", "ठीक है, Adilabad toll plaza, NH 44. क्या आप आज रात 9 बजे तक Hyderabad पहुँच जाएँगे?", "ask_schedule", 688, 1342, origin + 24_000),
  turn(2, "नहीं, थोड़ा late होगा। Nirmal के पास बहुत traffic था।", "कोई बात नहीं। तो अब आप लगभग कितने बजे तक पहुँचेंगे?", "ask_delay", 631, 1265, origin + 41_000),
];

export function fixture(name: FixtureName, now: number): Fixture {
  const ok = { agent: fixtureAgent, health: fixtureHealth };
  const bare = { agent: fixtureAgent, health: fixtureBareHealth };
  // A call that began two minutes ago, so the live timer reads believably.
  const origin = now - 118_000;
  switch (name) {
    case "idle":
      return { ...ok, state: initialState };
    case "connecting":
      return { ...ok, state: begin("voice") };
    case "live":
      return { ...ok, state: { ...play("voice", liveSteps, origin), startedAt: origin } };
    case "live-text": {
      // Text calls have no partial transcripts or audio timings.
      const text = play("text", liveSteps - 1, origin);
      return {
        ...ok,
        state: {
          ...text,
          startedAt: origin,
          timings: text.timings.map((t) => ({ ...t, audioMs: null })),
        },
      };
    }
    case "ended":
      return { ...ok, state: play("voice", scriptedCall.length, origin) };
    case "hangup":
      return {
        ...ok,
        state: reducer(play("voice", liveSteps - 1, origin), { type: "hangup", at: origin + 61_000 }),
      };
    case "error":
      return { ...bare, state: failed(origin) };
    case "error-voice":
      return {
        ...bare,
        state: reducer(
          reducer(begin("voice", "anthropic:claude-opus-5-5"), {
            type: "server",
            event: { type: "error", message: "No speech provider is connected. Add an ElevenLabs or Sarvam key under Integrations, or use text mode." },
            at: origin,
          }),
          { type: "closed", at: origin },
        ),
      };
    case "error-dropped":
      return {
        ...ok,
        state: reducer(play("voice", liveSteps - 1, origin), { type: "closed", at: origin + 48_000 }),
      };
    case "not-ready":
      return { agent: fixtureBrokenAgent, health: fixtureHealth, state: initialState };
    case "phone-placing":
      return { ...ok, state: placingState(PHONE_TO) };
    case "phone-ringing":
      return {
        ...ok,
        state: fromCallRecord(phoneRecord(now - 6_000, "ringing", []), fixtureAgent.flow),
      };
    case "phone-live":
      return {
        ...ok,
        state: fromCallRecord(
          phoneRecord(origin, "in_progress", phoneTurns(origin), { fields: LATE }),
          fixtureAgent.flow,
        ),
      };
    case "phone-ended": {
      const turns = [
        ...phoneTurns(origin),
        turn(3, "ग्यारह, साढ़े ग्यारह बजे तक पहुँच जाऊँगा।", "ठीक है, around 11:30 pm note कर लिया। गाड़ी, load या paperwork में कोई problem है जिसमें office मदद करे?", "ask_help", 702, 1398, origin + 58_000),
        turn(4, "नहीं नहीं, सब ठीक है।", "Thank you, your update is recorded. Drive safe.", "goodbye", 498, 1104, origin + 71_000),
      ];
      return {
        ...ok,
        state: fromCallRecord(
          phoneRecord(origin, "ended", turns, {
            fields: DONE,
            outcome: "completed",
            endedAt: new Date(origin + 78_000).toISOString(),
          }),
          fixtureAgent.flow,
        ),
      };
    }
    case "phone-no-answer":
      return {
        ...ok,
        state: fromCallRecord(
          phoneRecord(origin, "ended", [], {
            outcome: "failed",
            error: "Nobody answered.",
            endedAt: new Date(origin + 32_000).toISOString(),
          }),
          fixtureAgent.flow,
        ),
      };
    case "phone-refused":
      return {
        ...bare,
        state: refusedState(
          PHONE_TO,
          "Phone calls are not available: the server has no public URL configured (PUBLIC_URL).",
          now,
        ),
      };
  }
}
