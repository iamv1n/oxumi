import type { AgentSummary, Credential, Health } from "@/lib/api";

// Hand-written data for /preview/integrations: the states a machine without
// provider keys cannot reach. The catalogue mirrors the server's
// (apps/api/src/credentials/credentials.service.ts); nothing here is a real key.

export const FIXTURES = ["empty", "mixed", "ready", "loading"] as const;
export type FixtureName = (typeof FIXTURES)[number];

const HOURS = 3600_000;
const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOURS).toISOString();

type Saved = Pick<Credential, "source" | "hint" | "options" | "verifiedAt" | "verifyError" | "updatedAt">;
const none: Saved = {
  source: null,
  hint: null,
  options: {},
  verifiedAt: null,
  verifyError: null,
  updatedAt: null,
};
const ok = (hint: string, hoursAgo: number, options: Record<string, string> = {}): Saved => ({
  source: "project",
  hint: `…${hint}`,
  options,
  verifiedAt: at(hoursAgo),
  verifyError: null,
  updatedAt: at(hoursAgo),
});

const CATALOGUE: Omit<Credential, keyof Saved | "missing">[] = [
  {
    provider: "anthropic",
    label: "Anthropic (Claude)",
    kind: "llm",
    keysUrl: "https://console.anthropic.com/settings/keys",
    secretLabel: "API key",
    optionFields: [],
  },
  {
    provider: "openai",
    label: "OpenAI",
    kind: "llm",
    keysUrl: "https://platform.openai.com/api-keys",
    secretLabel: "API key",
    optionFields: [],
  },
  {
    provider: "gemini",
    label: "Google Gemini",
    kind: "llm",
    keysUrl: "https://aistudio.google.com/apikey",
    secretLabel: "API key",
    optionFields: [],
  },
  {
    provider: "elevenlabs",
    label: "ElevenLabs",
    kind: "speech",
    keysUrl: "https://elevenlabs.io/app/settings/api-keys",
    secretLabel: "API key",
    optionFields: [
      { name: "voiceId", label: "Default voice ID", hint: "Used when an agent does not set its own voice." },
    ],
  },
  {
    provider: "sarvam",
    label: "Sarvam AI",
    kind: "speech",
    keysUrl: "https://dashboard.sarvam.ai/",
    secretLabel: "API subscription key",
    optionFields: [
      { name: "voiceId", label: "Default speaker", hint: "A Sarvam speaker name such as shubh or ritu_hi_conversational." },
      { name: "ttsModel", label: "Speech model", hint: "bulbul:v3 unless you need another." },
    ],
  },
  {
    provider: "twilio",
    label: "Twilio",
    kind: "telephony",
    keysUrl: "https://console.twilio.com/",
    secretLabel: "Auth token",
    optionFields: [
      { name: "accountSid", label: "Account SID", hint: "Starts with AC. Found on the Twilio console home page.", required: true },
      { name: "fromNumber", label: "Calling number", hint: "A Twilio number you own, in international format, e.g. +14155550123.", required: true },
    ],
  },
  {
    provider: "exotel",
    label: "Exotel",
    kind: "telephony",
    keysUrl: "https://my.exotel.com/apisettings/site#api-credentials",
    secretLabel: "API token",
    optionFields: [
      { name: "apiKey", label: "API key", hint: "From API settings in the Exotel dashboard.", required: true },
      { name: "accountSid", label: "Account SID", hint: "Your Exotel account's SID, from the same page.", required: true },
      { name: "callerId", label: "ExoPhone", hint: "The Exotel number calls are placed from.", required: true },
      { name: "appId", label: "App ID", hint: "The Exotel app whose Voicebot step points to this server. See the setup steps.", required: true },
      {
        name: "host",
        label: "API host",
        hint: "api.exotel.com (Singapore) or api.in.exotel.com (Mumbai). Defaults to api.exotel.com.",
        choices: [
          { value: "api.exotel.com", label: "api.exotel.com (Singapore)" },
          { value: "api.in.exotel.com", label: "api.in.exotel.com (Mumbai)" },
        ],
      },
    ],
  },
  {
    provider: "vobiz",
    label: "Vobiz",
    kind: "telephony",
    keysUrl: "https://console.vobiz.ai",
    secretLabel: "Auth token",
    optionFields: [
      { name: "authId", label: "Auth ID", hint: "Starts with MA_. Shown with the auth token on the Vobiz console dashboard.", required: true },
      { name: "fromNumber", label: "Calling number", hint: "A Vobiz number on your account, in international format, e.g. +918071387423.", required: true },
    ],
  },
];

const SAVED: Record<Exclude<FixtureName, "loading">, Record<string, Saved>> = {
  empty: {},
  // One of everything: verified, rejected, platform, untested, incomplete.
  mixed: {
    anthropic: ok("a1B2", 2),
    openai: {
      source: "project",
      hint: "…Zq9x",
      options: {},
      verifiedAt: null,
      verifyError: "The provider rejected this key.",
      updatedAt: at(26),
    },
    gemini: { ...none, source: "platform" },
    elevenlabs: {
      source: "project",
      hint: "…9fQ2",
      options: {},
      verifiedAt: null,
      verifyError: null,
      updatedAt: at(0.1),
    },
    twilio: {
      source: "project",
      hint: "…4f2a",
      options: { accountSid: "AC00000000000000000000000000000000" },
      verifiedAt: null,
      verifyError: null,
      updatedAt: at(1),
    },
  },
  ready: {
    anthropic: ok("a1B2", 2),
    elevenlabs: ok("9fQ2", 30, { voiceId: "preview-voice" }),
    twilio: ok("4f2a", 5, {
      accountSid: "AC00000000000000000000000000000000",
      fromNumber: "+14155550123",
    }),
  },
};

export function withMissing(credential: Omit<Credential, "missing">): Credential {
  return {
    ...credential,
    missing:
      credential.source === "project"
        ? credential.optionFields
            .filter((field) => field.required && !credential.options[field.name])
            .map((field) => field.name)
        : [],
  };
}

export const fixtureCredentials = (name: Exclude<FixtureName, "loading">): Credential[] =>
  CATALOGUE.map((entry) => withMissing({ ...entry, ...(SAVED[name][entry.provider] ?? none) }));

const MODELS: Record<string, { ref: string; label: string }[]> = {
  anthropic: [{ ref: "anthropic:preview-model", label: "Preview model" }],
  openai: [{ ref: "openai:preview-model", label: "Preview model" }],
  gemini: [{ ref: "gemini:preview-model", label: "Preview model" }],
};

// What the server would report for these credentials.
export function fixtureHealth(credentials: Credential[], serverReachable: boolean): Health {
  const of = (kind: Credential["kind"]) => credentials.filter((c) => c.kind === kind);
  const providers = of("llm").map((c) => ({
    id: c.provider,
    label: c.label,
    available: c.source !== null,
    source: c.source,
    models: MODELS[c.provider] ?? [],
  }));
  const speech = of("speech").map((c) => ({
    id: c.provider,
    label: c.label,
    available: c.source !== null,
    source: c.source,
    voiceSet: Boolean(c.options.voiceId),
  }));
  const lines = of("telephony")
    .filter((c) => c.source === "project" && c.missing.length === 0)
    .map((c) => c.provider);
  return {
    defaultModel: providers.find((p) => p.available)?.models[0]?.ref ?? "",
    providers,
    speech,
    voice: speech.some((s) => s.available),
    voiceIdSet: speech.some((s) => s.available && s.voiceSet),
    phone: {
      ready: lines.length > 0 && serverReachable,
      providers: lines,
      serverReachable,
      publicUrl: serverReachable ? "https://calls.example.com" : "",
    },
  };
}

const agent = (id: string, name: string, picks: Partial<AgentSummary>): AgentSummary => ({
  id,
  projectId: "preview-project",
  name,
  description: "",
  model: "",
  speech: "",
  telephony: "",
  phoneNumber: "",
  knowledge: true,
  ready: true,
  stepCount: 8,
  updatedAt: at(4),
  ...picks,
});

export const fixtureAgents: AgentSummary[] = [
  agent("preview-agent-1", "Driver check-in", {}),
  agent("preview-agent-2", "Delivery confirmation", { model: "openai:preview-model", telephony: "twilio" }),
  agent("preview-agent-3", "Payment reminder", { speech: "elevenlabs" }),
];

// A stand-in for the server's test: a key containing "bad" is rejected and
// one containing "offline" cannot be tested at all.
export const fixtureVerdict = (secret: string) =>
  secret.includes("offline") ? "offline" : secret.includes("bad") ? "rejected" : "ok";

