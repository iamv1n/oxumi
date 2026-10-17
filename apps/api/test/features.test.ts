import { type Flow, type Outcome, parseFlow } from "@oxumi/flow-core";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { billableMinutes, costOf } from "../src/billing/pricing";
import { DEFAULT_HOURS, localClock, nextWindow, withinHours } from "../src/compliance/hours";
import { chunkText, htmlToText, searchTerms } from "../src/knowledge/text";
import type { LlmProvider, LlmTurnRequest, LlmTurnResult } from "../src/llm/types";
import { CallSession, type HandoffRecord, type TransferHandler } from "../src/runtime/call-session";
import type { ServerEvent, Transport } from "../src/runtime/transport";

// ---- Calling hours ----------------------------------------------------------

test("calling hours are read in the project's time zone", () => {
  // 03:30 UTC on a Monday is 09:00 in India.
  const monday = new Date("2026-10-12T03:30:00Z");
  assert.deepEqual(localClock(monday, "Asia/Kolkata"), { day: 1, minute: 540 });
  assert.equal(withinHours(DEFAULT_HOURS, "Asia/Kolkata", monday), true);
  // 15:30 UTC is 21:00 in India: the window has just closed.
  assert.equal(withinHours(DEFAULT_HOURS, "Asia/Kolkata", new Date("2026-10-12T15:30:00Z")), false);
  // Sunday is not a calling day by default.
  assert.equal(withinHours(DEFAULT_HOURS, "Asia/Kolkata", new Date("2026-10-11T06:00:00Z")), false);
});

test("the next window after Saturday evening is Monday morning", () => {
  const saturdayNight = new Date("2026-10-10T16:00:00Z"); // 21:30 IST Saturday
  const next = nextWindow(DEFAULT_HOURS, "Asia/Kolkata", saturdayNight);
  assert.equal(next?.toISOString(), "2026-10-12T03:30:00.000Z");
});

test("a window that runs past midnight is handled", () => {
  const night = { enabled: true, start: "22:00", end: "02:00", days: [1] };
  // 23:00 IST Monday, then 01:00 IST Tuesday (still Monday's window).
  assert.equal(withinHours(night, "Asia/Kolkata", new Date("2026-10-12T17:30:00Z")), true);
  assert.equal(withinHours(night, "Asia/Kolkata", new Date("2026-10-12T19:30:00Z")), true);
  assert.equal(withinHours(night, "Asia/Kolkata", new Date("2026-10-13T17:30:00Z")), false);
  assert.equal(withinHours({ ...night, enabled: false }, "UTC", new Date()), true);
});

// ---- Pricing ------------------------------------------------------------------

test("voice calls are charged per started minute; unanswered calls are free", () => {
  const start = new Date("2026-10-12T10:00:00Z");
  const after = (seconds: number) => new Date(+start + seconds * 1000);
  const phone = { channel: "phone" as const, startedAt: start, endedAt: after(61), turns: 4 };
  assert.equal(billableMinutes(phone), 2);
  assert.equal(costOf(phone, { phonePerMinute: 5, browserVoicePerMinute: 2, textPerCall: 1 }), 10);
  assert.equal(costOf({ ...phone, turns: 0 }), 0);
  assert.equal(billableMinutes({ ...phone, endedAt: after(5) }), 1);
  const text = { channel: "api_text" as const, startedAt: start, endedAt: after(600), turns: 3 };
  assert.equal(billableMinutes(text), 0);
  assert.equal(costOf(text, { phonePerMinute: 5, browserVoicePerMinute: 2, textPerCall: 1 }), 1);
});

// ---- Knowledge ----------------------------------------------------------------

test("text is cut into passages between paragraphs and sentences", () => {
  const paragraph = "The clinic opens at nine. ".repeat(60);
  const chunks = chunkText(`Short intro.\n\n${paragraph}\n\nParking is free.`);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((c) => c.length <= 900));
  assert.ok(chunks[0]!.startsWith("Short intro."));
  assert.ok(chunks.at(-1)!.endsWith("Parking is free."));
});

test("a web page is reduced to its readable text", () => {
  const { title, text } = htmlToText(
    "<html><head><title>OPD &amp; timings</title><style>p{}</style></head><body><nav>Menu</nav><p>Open 9 to 5.</p><script>x()</script><p>Closed Sunday.</p></body></html>",
  );
  assert.equal(title, "OPD & timings");
  assert.match(text, /Open 9 to 5\.\s+Closed Sunday\./);
  assert.doesNotMatch(text, /Menu|x\(\)/);
});

test("search terms keep meaningful words in any script", () => {
  assert.deepEqual(searchTerms("What are the OPD timings on Sunday?"), ["opd", "timings", "sunday"]);
  assert.deepEqual(searchTerms("क्लिनिक कब खुलता है"), ["क्लिनिक", "खुलता"]);
});

// ---- Hand-off in a live call ------------------------------------------------

const driver: Flow = parseFlow(
  JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../flows/driver-status-check.json"), "utf8"),
  ),
).flow;
const variables = {
  driver_name: "Ramesh",
  company: "Shakti Logistics",
  route: "Nagpur to Hyderabad",
  planned_eta: "9 pm",
};

class ScriptedLlm implements LlmProvider {
  requests: LlmTurnRequest[] = [];
  constructor(private steps: { text: string; signal?: string }[]) {}
  async runTurn(request: LlmTurnRequest): Promise<LlmTurnResult> {
    this.requests.push({ ...request, messages: [...request.messages] });
    const step = this.steps.shift();
    if (!step) throw new Error("ScriptedLlm ran out of steps");
    request.onText(step.text);
    return {
      text: step.text,
      raw: [{ type: "text", text: step.text }],
      refused: false,
      toolCall: { id: `t${this.requests.length}`, input: { fields: {}, signal: step.signal ?? "none" } },
    };
  }
}

class TextTransport implements Transport {
  readonly format = "pcm_16000" as const;
  events: ServerEvent[] = [];
  onAudio = () => {};
  onText: (text: string) => void = () => {};
  onPlaybackDone = () => {};
  onClose = () => {};
  sendAudio(): void {}
  sendEvent(event: ServerEvent): void {
    this.events.push(event);
  }
  clear(): void {}
  close(): void {}
}

function handoffCall(transfer: TransferHandler | undefined, steps: { text: string; signal?: string }[]) {
  const flow = structuredClone(driver);
  flow.settings.handoff = { to: "+919800000000" };
  const llm = new ScriptedLlm(steps);
  const transport = new TextTransport();
  const handoffs: HandoffRecord[] = [];
  const turns: string[] = [];
  let outcome: Outcome | undefined;
  new CallSession({
    flow,
    variables,
    llm,
    speech: null,
    transport,
    preamble: "This call is recorded.",
    knowledge: async () => ["Diesel allowance is paid on Fridays."],
    transfer,
    recorder: {
      turn: (record) => void turns.push(record.agentText),
      handoff: (record) => void handoffs.push(record),
      finish: (result) => void (outcome = result.outcome),
    },
  }).start();
  return { llm, transport, handoffs, turns, outcome: () => outcome };
}

async function until(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("timed out waiting");
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test("asking for a person transfers the call with a summary", async () => {
  const asked: { to: string; summary: string }[] = [];
  const call = handoffCall(
    async (request) => {
      asked.push(request);
      return { ok: true, status: "connected" };
    },
    [{ text: "Namaste Ramesh ji." }, { text: "Connecting you now.", signal: "human" }],
  );
  await until(() => call.turns.length === 1);
  // The disclosure opens the call.
  assert.match(call.llm.requests[0]!.messages[0]!.text, /Open with: "This call is recorded\. /);
  call.transport.onText("Mujhe manager se baat karni hai");
  await until(() => call.outcome() !== undefined);

  assert.equal(call.outcome(), "transferred");
  assert.equal(asked[0]?.to, "+919800000000");
  assert.match(asked[0]!.summary, /asked to speak to a person/);
  assert.equal(call.handoffs[0]?.status, "connected");
  // The caller's question came with the knowledge passages.
  assert.match(call.llm.requests[1]!.messages.at(-1)!.text, /<knowledge>\n\[1\] Diesel allowance/);
});

test("a transfer that fails is recorded and the call carries on", async () => {
  const call = handoffCall(undefined, [
    { text: "Namaste Ramesh ji." },
    { text: "Connecting you now.", signal: "human" },
    { text: "Sorry, nobody is free. Where are you now?" },
  ]);
  await until(() => call.turns.length === 1);
  call.transport.onText("Manager please");
  await until(() => call.turns.length === 3);

  assert.equal(call.outcome(), undefined);
  assert.equal(call.handoffs[0]?.status, "failed");
  assert.match(call.handoffs[0]!.error!, /cannot transfer/);
  assert.match(call.llm.requests[2]!.messages.at(-1)!.text, /transfer to a person could not be made/);
  const state = call.transport.events.filter((e) => e.type === "state").at(-1);
  assert.equal(state?.type === "state" && state.state.ended, false);
});
