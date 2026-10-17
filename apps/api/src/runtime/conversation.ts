import {
  applyTurn,
  type CallState,
  describeState,
  type FieldValue,
  handoffSummary,
  openingLines,
  renderTemplate,
  resumeAfterTransfer,
  SIGNALS,
  type Signal,
  startCall,
} from "@oxumi/flow-core";
import type { Flow } from "@oxumi/flow-core";
import { buildRecordTool, buildSystemPrompt } from "../llm/prompt";
import type { LlmMessage, LlmProvider, LlmTool } from "../llm/types";

export type TurnInput =
  | { kind: "connected" }
  | { kind: "caller"; text: string }
  // A hand-off to a person could not be made; the call carries on.
  | { kind: "transfer_failed" };

export interface TurnOutput {
  text: string;
  interrupted: boolean;
  state: CallState;
  accepted: Record<string, FieldValue>;
  rejected: { field: string; reason: string }[];
}

const FALLBACK_LINE = "Sorry, I am having trouble on my side. We will call you back.";
// Said when the model produced no words: silence is what makes callers ask
// "is anyone there?" and hang up.
const SAY_AGAIN: Record<"hi" | "en", string> = {
  hi: "माफ़ कीजिए, क्या आप एक बार फिर बोल सकते हैं?",
  en: "Sorry, could you say that again?",
};

// Passages from the project's knowledge base that bear on what the caller
// just said. Empty when nothing matches.
export type KnowledgeLookup = (question: string) => Promise<string[]>;

export interface ConversationOptions {
  // Said before the flow's own opening, e.g. a recording disclosure.
  preamble?: string;
  knowledge?: KnowledgeLookup;
  // Speak the opening the moment the call connects instead of waiting for
  // the model (voice calls). Off, the model says it in its own words.
  instantOpening?: boolean;
}

const KNOWLEDGE_TIMEOUT_MS = 400;

// ---- The opening line ------------------------------------------------------
// Waiting for the model before the first word is the longest silence of a
// call, and on a phone it is when the person says "Hello?" and talks over
// the agent. So the opening is spoken the moment the call connects, as
// written, and the model only continues from it. For a call that opens in
// Hindi the line is translated once by the model and kept here, placeholders
// intact; until that is ready, the call opens the old way.

const LANGUAGE_NAMES = { hi: "Hindi", en: "English" } as const;
const OPENING_CACHE_LIMIT = 500;
const openings = new Map<string, Promise<string | null>>();

// The opening as written, {{placeholders}} unfilled, disclosure first.
function openingTemplate(flow: Flow, preamble?: string): string {
  const lines: string[] = [];
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  let node = byId.get(flow.start);
  for (let step = 0; node && step < 20; step++) {
    if (node.type !== "start" && node.type !== "say") break;
    lines.push(node.say);
    node = byId.get(node.next);
  }
  return [preamble?.trim(), ...lines].filter(Boolean).join(" ");
}

async function translateOpening(llm: LlmProvider, text: string, language: string): Promise<string | null> {
  const signal = AbortSignal.timeout(20_000);
  const result = await llm.runTurn({
    system: "You adapt the opening line of an outbound phone call for a voice agent. Reply with the line only.",
    messages: [
      {
        role: "user",
        text: `Rewrite this opening as it should be spoken in ${language} on a polite, natural phone call${
          language === "Hindi" ? ", entirely in Hindi written in Devanagari; leave only names, brand names and placeholders as they are" : ""
        }. Keep the meaning, keep every {{placeholder}} exactly as written, and add nothing.\n\n<line>${text}</line>`,
      },
    ],
    // The interface requires a tool; this one is never needed.
    tool: { name: "skip", description: "Do not use.", inputSchema: { type: "object", properties: {} } },
    signal,
    onText: () => {},
  });
  const line = result.text.trim().replace(/^<line>|<\/line>$/g, "").trim();
  const kept = (text.match(/\{\{\s*[a-z][a-z0-9_]*\s*\}\}/g) ?? []).every((p) => line.includes(p));
  return !result.refused && line && kept && line.length < text.length * 3 ? line : null;
}

// The opening to speak now, or null while a translation is still being made.
function readyOpening(flow: Flow, llm: LlmProvider, preamble?: string): string | null | Promise<string | null> {
  const template = openingTemplate(flow, preamble);
  const language = flow.settings.languages[0] ?? "en";
  if (!template) return null;
  if (language === "en") return template;
  const key = `v2|${language}|${template}`;
  let entry = openings.get(key);
  if (!entry) {
    if (openings.size >= OPENING_CACHE_LIMIT) openings.delete(openings.keys().next().value!);
    entry = translateOpening(llm, template, LANGUAGE_NAMES[language]).catch(() => null);
    // A failed translation is forgotten, so a later call tries again.
    void entry.then((line) => line === null && openings.delete(key));
    openings.set(key, entry);
    return entry;
  }
  return entry;
}

// Starts the translation ahead of a call (while a phone rings), so the call
// can open without waiting.
export function prepareOpening(flow: Flow, llm: LlmProvider, preamble?: string): void {
  void readyOpening(flow, llm, preamble);
}

// For tests: forget every prepared opening.
export function clearOpenings(): void {
  openings.clear();
}

// One call's dialogue, independent of audio: text in, text out, flow state
// advanced by the engine. Voice and text channels both drive this class.
export class Conversation {
  state: CallState;
  readonly messages: LlmMessage[] = [];
  private system: string;
  private tool: LlmTool;
  private pendingToolResult?: { id: string; content: string };

  constructor(
    private flow: Flow,
    private variables: Record<string, string>,
    private llm: LlmProvider,
    private options: ConversationOptions = {},
  ) {
    this.state = startCall(flow);
    this.system = buildSystemPrompt(flow, variables, { knowledge: Boolean(options.knowledge) });
    this.tool = buildRecordTool(flow);
  }

  private flowState(): string {
    return `<flow_state>\n${describeState(this.flow, this.state, this.variables)}\n</flow_state>`;
  }

  private pushUser(text: string): void {
    this.messages.push({
      role: "user",
      text,
      toolResult: this.pendingToolResult,
    });
    this.pendingToolResult = undefined;
  }

  // What the person taking over a transferred call is told.
  handoffSummary(): string {
    return handoffSummary(this.flow, this.state, this.variables);
  }

  // The transfer could not be made: pick the flow up where it left off.
  resumeAfterTransfer(): void {
    this.state = resumeAfterTransfer(this.flow, this.state);
  }

  // Looked up on every caller turn, but never allowed to hold the reply up
  // for long: a slow lookup is skipped.
  private async knowledgeFor(text: string, signal: AbortSignal): Promise<string> {
    const lookup = this.options.knowledge;
    if (!lookup || signal.aborted) return "";
    const timeout = new Promise<string[]>((resolve) => setTimeout(() => resolve([]), KNOWLEDGE_TIMEOUT_MS).unref());
    const passages = await Promise.race([lookup(text).catch(() => []), timeout]);
    return knowledgeBlock(passages);
  }

  async respond(
    input: TurnInput,
    opts: { signal: AbortSignal; onText: (delta: string) => void },
  ): Promise<TurnOutput> {
    const opening = [this.options.preamble?.trim(), ...openingLines(this.flow, this.variables)]
      .filter(Boolean)
      .join(" ");
    // Spoken at once when it is ready; the model then carries on from it.
    let spokenOpening = "";
    if (input.kind === "connected" && this.options.instantOpening) {
      const ready = readyOpening(this.flow, this.llm, this.options.preamble);
      const template = ready instanceof Promise ? await settledNow(ready) : ready;
      if (template) {
        spokenOpening = renderTemplate(template, this.variables).replace(/\s+/g, " ").trim();
        opts.onText(`${spokenOpening} `);
      }
    }
    const lead =
      input.kind === "connected"
        ? spokenOpening
          ? `<event>The call just connected and you have already said: "${spokenOpening}" Do not repeat or rephrase it. Carry straight on with the current step; if what you said already asks for what this step needs, say nothing more.</event>`
          : `<event>The call just connected. Open with: "${opening}" Then begin the current step.</event>`
        : input.kind === "transfer_failed"
          ? "<event>The transfer to a person could not be made. In one short sentence, tell the caller nobody could be reached right now, then carry on with the current step.</event>"
          : `<caller_said>${input.text}</caller_said>${await this.knowledgeFor(input.text, opts.signal)}`;
    this.pushUser(`${lead}\n${this.flowState()}`);

    const output: TurnOutput = {
      text: spokenOpening ? `${spokenOpening} ` : "",
      interrupted: false,
      state: this.state,
      accepted: {},
      rejected: [],
    };

    // An opening that ends in a question has already asked the first step:
    // the turn is over, and asking the model only adds filler on top of it.
    if (spokenOpening && /[?？]\s*$/.test(spokenOpening)) {
      this.messages.push({ role: "assistant", text: spokenOpening });
      return output;
    }

    // A second pass only happens when the model recorded values but said
    // nothing; it then has to produce the spoken reply.
    let signalled: Signal = "none";
    for (let pass = 0; pass < 2; pass++) {
      let spoken = "";
      let result;
      const unbracket = new Unbracket();
      try {
        result = await this.llm.runTurn({
          system: this.system,
          messages: this.messages,
          tool: this.tool,
          // The second pass exists to get words; it may not record again.
          noTool: pass > 0,
          signal: opts.signal,
          onText: (delta) => {
            const clean = unbracket.push(delta);
            if (!clean) return;
            spoken += clean;
            opts.onText(clean);
          },
        });
      } catch (err) {
        if (!opts.signal.aborted) throw err;
        // The caller spoke over us. Keep what was said so far in history so
        // the next turn knows where the conversation stands.
        if (spoken) {
          this.messages.push({
            role: "assistant",
            text: `${spoken} [interrupted by the caller]`,
          });
        }
        output.text += spoken;
        output.interrupted = true;
        return output;
      }

      if (result.refused) {
        this.state = { ...this.state, ended: true, outcome: "failed" };
        opts.onText(FALLBACK_LINE);
        output.text = FALLBACK_LINE;
        output.state = this.state;
        return output;
      }

      this.messages.push({ role: "assistant", text: result.text, raw: result.raw });
      output.text += spoken;
      if (!result.toolCall) break;

      const { fields, signal } = parseToolInput(result.toolCall.input);
      signalled = signal;
      const turn = applyTurn(this.flow, this.state, fields, signal);
      this.state = turn.state;
      Object.assign(output.accepted, turn.accepted);
      output.rejected.push(...turn.rejected);
      this.pendingToolResult = {
        id: result.toolCall.id,
        content: summarise(turn.accepted, turn.rejected),
      };
      // Nothing is said to a recording; otherwise words are required.
      if (spoken.trim() || signal === "not_reached") break;
      this.pushUser(
        `You recorded that but said nothing. Now say your reply to the caller, in words only.\n${this.flowState()}`,
      );
    }

    if (!output.text.trim() && signalled !== "not_reached" && !opts.signal.aborted) {
      const line = SAY_AGAIN[this.flow.settings.languages[0] ?? "en"];
      opts.onText(line);
      output.text = line;
      this.messages.push({ role: "assistant", text: line });
    }

    output.state = this.state;
    return output;
  }
}

// Drops anything in brackets from streamed text: notes like "(waiting for
// their reply)" are never meant to be heard. Works across chunk boundaries.
class Unbracket {
  private depth = 0;

  push(delta: string): string {
    let out = "";
    for (const ch of delta) {
      if (ch === "(" || ch === "[") this.depth++;
      else if ((ch === ")" || ch === "]") && this.depth > 0) this.depth--;
      else if (this.depth === 0) out += ch;
    }
    return out;
  }
}

// The value if the promise has already settled, otherwise null: the call
// never waits for a translation in progress.
async function settledNow<T>(promise: Promise<T | null>): Promise<T | null> {
  const pending = Symbol();
  const value = await Promise.race([promise, Promise.resolve(pending)]);
  return value === pending ? null : (value as T | null);
}

export function knowledgeBlock(passages: string[]): string {
  if (!passages.length) return "";
  return `\n<knowledge>\n${passages.map((p, i) => `[${i + 1}] ${p}`).join("\n")}\n</knowledge>`;
}

function parseToolInput(input: unknown): {
  fields: Record<string, unknown>;
  signal: Signal;
} {
  const record = (input ?? {}) as { fields?: unknown; signal?: unknown };
  const fields =
    record.fields && typeof record.fields === "object"
      ? (record.fields as Record<string, unknown>)
      : {};
  const signal = SIGNALS.includes(record.signal as Signal)
    ? (record.signal as Signal)
    : "none";
  return { fields, signal };
}

function summarise(
  accepted: Record<string, FieldValue>,
  rejected: { field: string; reason: string }[],
): string {
  const parts = [
    Object.keys(accepted).length
      ? `Recorded: ${JSON.stringify(accepted)}.`
      : "Nothing recorded.",
  ];
  for (const r of rejected) parts.push(`Rejected ${r.field}: ${r.reason}.`);
  return parts.join(" ");
}
