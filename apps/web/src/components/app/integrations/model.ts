import type { AgentSummary, Credential, Health } from "@/lib/api";

// What the integrations page works out from the server's data: each
// provider's status, which agents use it, and what the project can do.

export type Status = "ok" | "untested" | "rejected" | "incomplete" | "platform" | "none";
export type Tone = "success" | "warning" | "danger" | "info" | "muted";
export type Kind = Credential["kind"];

export const KINDS: { kind: Kind; title: string; description: string; tour: string }[] = [
  {
    kind: "llm",
    title: "Language model",
    description: "The AI that runs the conversation. One is enough.",
    tour: "integrations-llm",
  },
  {
    kind: "speech",
    title: "Speech",
    description: "Lets agents listen and talk on voice calls.",
    tour: "integrations-speech",
  },
  {
    kind: "telephony",
    title: "Telephony",
    description: "Places real phone calls from a number you own.",
    tour: "integrations-telephony",
  },
];

export const KIND_LABEL: Record<Kind, string> = {
  llm: "Language model",
  speech: "Speech",
  telephony: "Telephony",
};

export function statusOf(credential: Credential): Status {
  if (credential.source === "platform") return "platform";
  if (credential.source !== "project") return "none";
  if (credential.missing.length) return "incomplete";
  if (credential.verifyError) return "rejected";
  return credential.verifiedAt ? "ok" : "untested";
}

export const STATUS: Record<Status, { label: string; tone: Tone }> = {
  ok: { label: "Connected", tone: "success" },
  untested: { label: "Connected, not tested", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  incomplete: { label: "Incomplete", tone: "warning" },
  platform: { label: "Platform key", tone: "info" },
  none: { label: "Not connected", tone: "muted" },
};

// Saved and usable, as far as anyone knows.
export const isConnected = (status: Status) => status === "ok" || status === "untested";
export const needsAttention = (status: Status) => status === "rejected" || status === "incomplete";

// Labels of the required options a saved credential still lacks.
export const missingLabels = (credential: Credential): string[] =>
  credential.missing.map(
    (name) => credential.optionFields.find((field) => field.name === name)?.label ?? name,
  );

export const listed = (names: string[], last = "and") =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} ${last} ${names.at(-1)}`;

// For use mid-sentence: "auth token" and "account SID", but "API token" and
// "ExoPhone".
export const inSentence = (name: string) =>
  /^[A-Z][a-z]+(\s|$)/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name;

export function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// The one-line reason shown beside a status that needs explaining.
export function statusDetail(credential: Credential): string | null {
  const status = statusOf(credential);
  if (status === "incomplete")
    return `Add the ${listed(missingLabels(credential).map(inSentence))}`;
  if (status === "rejected") return credential.verifyError;
  if (status === "platform") return "Shared and may be limited";
  if (status === "untested") return "Test it to confirm it works";
  return null;
}

// ---- Which agents use a provider ------------------------------------------

export interface Usage {
  // Agents set to this provider by name.
  named: AgentSummary[];
  // Agents with no choice of their own, which fall to this provider.
  byDefault: AgentSummary[];
  // Whether this is the provider such agents fall to.
  isDefault: boolean;
}

const NO_USAGE: Usage = { named: [], byDefault: [], isDefault: false };

export function usageOf(
  credential: Credential,
  agents: AgentSummary[] | undefined,
  health: Health | undefined,
): Usage {
  if (!agents) return NO_USAGE;
  const id = credential.provider;
  const split =
    credential.kind === "llm"
      ? {
          named: (a: AgentSummary) => a.model.startsWith(`${id}:`),
          unset: (a: AgentSummary) => a.model === "",
          // The server names a default even when its provider has no key.
          fallback: health?.providers.find(
            (p) => p.available && p.id === health.defaultModel.split(":")[0],
          )?.id,
        }
      : credential.kind === "speech"
        ? {
            named: (a: AgentSummary) => a.speech === id,
            unset: (a: AgentSummary) => a.speech === "",
            fallback: health?.speech.find((s) => s.available)?.id,
          }
        : {
            named: (a: AgentSummary) => a.telephony === id,
            unset: (a: AgentSummary) => a.telephony === "",
            fallback: health?.phone.providers[0],
          };
  const isDefault = split.fallback === id;
  return {
    named: agents.filter(split.named),
    byDefault: isDefault ? agents.filter(split.unset) : [],
    isDefault,
  };
}

export const usageCount = (usage: Usage) => usage.named.length + usage.byDefault.length;

export const agentCount = (count: number) => `${count} ${count === 1 ? "agent" : "agents"}`;

// ---- What the project can do ----------------------------------------------

export interface Need {
  text: string;
  // The provider to open, when one provider would settle it.
  provider?: string;
  // The group to look at otherwise.
  kind?: Kind;
}

export interface Ability {
  key: "text" | "voice" | "phone";
  title: string;
  ready: boolean;
  // When ready: what it runs on. Otherwise empty.
  detail: string;
  needs: Need[];
}

export function abilities(credentials: Credential[], health: Health): Ability[] {
  const state = new Map(credentials.map((c) => [c.provider, statusOf(c)]));
  const label = (id: string) => credentials.find((c) => c.provider === id)?.label ?? id;
  // A saved key the provider turned down does not make anything ready.
  const works = (p: { id: string; available: boolean }) =>
    p.available && state.get(p.id) !== "rejected";
  const ofKind = (kind: Kind) => credentials.filter((c) => c.kind === kind);

  const need = (kind: Kind, what: string): Need => {
    const all = ofKind(kind);
    const rejected = all.filter((c) => state.get(c.provider) === "rejected");
    const unfinished = all.filter((c) => state.get(c.provider) === "incomplete");
    if (unfinished.length === 1)
      return {
        text: `the ${unfinished[0]!.label} ${listed(missingLabels(unfinished[0]!).map(inSentence))}`,
        provider: unfinished[0]!.provider,
      };
    if (rejected.length === 1)
      return {
        text: `a working ${rejected[0]!.label} key (the saved one was rejected)`,
        provider: rejected[0]!.provider,
      };
    return { text: what, kind };
  };

  const llm = health.providers.filter(works);
  const speech = health.speech.filter(works);
  const lines = health.phone.providers.filter((id) => state.get(id) !== "rejected");

  const needLlm = llm.length ? [] : [need("llm", "a language model")];
  const needSpeech = speech.length ? [] : [need("speech", "a speech provider")];
  const needLine = lines.length ? [] : [need("telephony", "a telephony provider")];
  const needAddress: Need[] = health.phone.serverReachable
    ? []
    : [{ text: "a public address for the server (PUBLIC_URL is not set)" }];

  const noVoice = speech.length > 0 && !speech.some((s) => s.voiceSet);
  const voiceNeeds = [...needLlm, ...needSpeech];
  const phoneNeeds = [...voiceNeeds, ...needLine, ...needAddress];

  return [
    {
      key: "text",
      title: "Text test call",
      ready: needLlm.length === 0,
      detail: `Runs on ${listed(llm.map((p) => p.label), "or")}.`,
      needs: needLlm,
    },
    {
      key: "voice",
      title: "Voice call in the browser",
      ready: voiceNeeds.length === 0,
      detail: `Speaks through ${listed(speech.map((s) => s.label), "or")}.${
        noVoice ? " No default voice is set, so each agent needs its own." : ""
      }`,
      needs: voiceNeeds,
    },
    {
      key: "phone",
      title: "Phone call",
      ready: phoneNeeds.length === 0,
      detail: `Placed from ${listed(lines.map(label), "or")}.`,
      needs: phoneNeeds,
    },
  ];
}

// ---- What the server does not describe ------------------------------------
// Layout and wording only. Which fields exist, what they are called and which
// are required all come from the server's catalogue.

export const PURPOSE: Record<string, string> = {
  anthropic: "Runs conversations on Claude models",
  openai: "Runs conversations on OpenAI models",
  gemini: "Runs conversations on Gemini models",
  elevenlabs: "Hears the caller and speaks the agent's replies",
  sarvam: "Hears the caller and speaks the agent's replies",
  twilio: "Places phone calls from your Twilio number",
  exotel: "Places phone calls from your ExoPhone",
  vobiz: "Places phone calls from your Vobiz number",
};

export const SECRET = "secret";

export interface Section {
  title: string;
  // Something about this step the field hints do not say.
  note?: string;
  // Option names, or SECRET for the key itself, in the order shown.
  fields: string[];
}

// How a provider's fields are grouped into steps. A provider not listed here
// gets one step holding its key and every option.
const SECTIONS: Record<string, Section[]> = {
  elevenlabs: [
    { title: "API key", fields: [SECRET] },
    { title: "Defaults", fields: ["voiceId"] },
  ],
  sarvam: [
    { title: "API key", fields: [SECRET] },
    { title: "Defaults", fields: ["voiceId", "ttsModel"] },
  ],
  twilio: [
    {
      title: "Account",
      fields: ["accountSid", SECRET],
    },
    {
      title: "Number to call from",
      fields: ["fromNumber"],
    },
  ],
  exotel: [
    {
      title: "Account",
      fields: ["apiKey", SECRET, "accountSid", "host"],
    },
    { title: "Number and app", fields: ["callerId", "appId"] },
  ],
  vobiz: [
    { title: "Account", fields: ["authId", SECRET] },
    {
      title: "Number to call from",
      fields: ["fromNumber"],
      note: "Nothing else to set up in Vobiz: each call tells Vobiz where to connect its audio. Vobiz only places calls from a number on your account.",
    },
  ],
};

export function sectionsOf(credential: Credential): Section[] {
  const known = SECTIONS[credential.provider];
  const names = credential.optionFields.map((field) => field.name);
  if (!known) return [{ title: credential.secretLabel, fields: [SECRET, ...names] }];
  // Anything the server has added since goes in the last step, so no field
  // is ever left out.
  const placed = new Set(known.flatMap((section) => section.fields));
  const extra = names.filter((name) => !placed.has(name));
  return known.map((section, index) => ({
    ...section,
    fields: [
      ...section.fields.filter((name) => name === SECRET || names.includes(name)),
      ...(index === known.length - 1 ? extra : []),
    ],
  }));
}

// What the free test does, in words.
export function testNote(credential: Credential): string {
  if (credential.provider === "sarvam")
    return "The test speaks one short word with Sarvam, which Sarvam bills to this key.";
  if (credential.kind === "telephony")
    return "The test reads your account. It is free and places no call. It does not check the number.";
  return "The test lists the models this key can use. It is free.";
}

const digits = (value: string) => value.replace(/[\s()-]/g, "");

// Formats that are certain. Anything else is left for the provider to judge.
const CHECKS: Record<string, Record<string, (value: string) => string | null>> = {
  twilio: {
    accountSid: (v) =>
      /^AC[0-9a-fA-F]{32}$/.test(v) ? null : "An Account SID is AC followed by 32 characters.",
    fromNumber: (v) =>
      /^\+[1-9]\d{7,14}$/.test(digits(v))
        ? null
        : "Use international format: + then the country code and number.",
  },
  vobiz: {
    fromNumber: (v) =>
      /^\+?\d{6,15}$/.test(digits(v)) ? null : "Enter the number as digits, with its country code.",
  },
  exotel: {
    callerId: (v) =>
      /^\+?\d{6,15}$/.test(digits(v)) ? null : "Enter the ExoPhone as digits only.",
  },
};

// Phone numbers are stored without spaces, brackets or dashes.
const CLEAN: Record<string, string[]> = {
  twilio: ["fromNumber"],
  exotel: ["callerId"],
  vobiz: ["fromNumber"],
};

export const cleanOption = (provider: string, name: string, value: string) =>
  CLEAN[provider]?.includes(name) ? digits(value.trim()) : value.trim();

export const optionProblem = (provider: string, name: string, value: string): string | null =>
  CHECKS[provider]?.[name]?.(value) ?? null;

// Mirrors the server's rule so the mistake is caught before the request.
export function secretProblem(secret: string, name: string): string | null {
  const what = inSentence(name);
  if (!secret) return `Paste the ${what}.`;
  if (/\s/.test(secret)) return `The ${what} has no spaces or line breaks. Paste it again.`;
  if (secret.length < 8) return `That is too short to be the ${what}.`;
  if (secret.length > 500) return `That is too long to be the ${what}.`;
  return null;
}

// The three calls the page makes, so a preview can stand in for the server.
export interface Actions {
  save: (provider: string, input: { secret?: string; options: Record<string, string> }) => Promise<void>;
  verify: (provider: string) => Promise<{ ok: boolean; error: string | null }>;
  remove: (provider: string) => Promise<void>;
}
