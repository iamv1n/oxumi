import { type Flow, type Outcome, parseFlow } from "@oxumi/flow-core";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import type {
  LlmProvider,
  LlmTurnRequest,
  LlmTurnResult,
} from "../src/llm/types";
import { CallSession, type TurnRecord } from "../src/runtime/call-session";
import type { ServerEvent, Transport } from "../src/runtime/transport";
import type {
  SpeechProvider,
  SttStream,
  TtsStream,
} from "../src/speech/types";

const flow: Flow = parseFlow(
  JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../../../flows/driver-status-check.json"),
      "utf8",
    ),
  ),
).flow;
const variables = {
  driver_name: "Ramesh",
  company: "Shakti Logistics",
  route: "Nagpur to Hyderabad",
  planned_eta: "9 pm",
};

interface Step {
  text: string;
  fields?: Record<string, unknown>;
  signal?: string;
  // Resolves when the test wants generation to continue past the first word.
  hold?: Promise<void>;
}

class FakeLlm implements LlmProvider {
  requests: LlmTurnRequest[] = [];
  private calls = 0;
  constructor(private steps: Step[]) {}

  async runTurn(request: LlmTurnRequest): Promise<LlmTurnResult> {
    this.requests.push({ ...request, messages: [...request.messages] });
    const step = this.steps[this.calls++];
    if (!step) throw new Error("FakeLlm ran out of scripted steps");
    const [first, ...rest] = step.text.split(" ");
    request.onText(first!);
    if (step.hold) {
      await Promise.race([
        step.hold,
        new Promise<void>((resolve) =>
          request.signal.addEventListener("abort", () => resolve()),
        ),
      ]);
    }
    if (request.signal.aborted) throw new Error("aborted");
    if (rest.length) request.onText(` ${rest.join(" ")}`);
    return {
      text: step.text,
      raw: [{ type: "text", text: step.text }],
      refused: false,
      toolCall: {
        id: `tool_${this.calls}`,
        input: { fields: step.fields ?? {}, signal: step.signal ?? "none" },
      },
    };
  }
}

class FakeTts implements TtsStream {
  onAudio: (chunk: Buffer) => void = () => {};
  onError: (error: Error) => void = () => {};
  alive = true;
  cancelled = false;
  spoken: string[] = [];
  private finish!: () => void;
  readonly done = new Promise<void>((resolve) => (this.finish = resolve));

  sendText(text: string): void {
    if (!text.trim()) return;
    this.spoken.push(text);
    this.onAudio(Buffer.alloc(3200));
  }
  end(): void {
    this.alive = false;
    this.finish();
  }
  cancel(): void {
    this.cancelled = true;
    this.alive = false;
    this.finish();
  }
}

class FakeSpeech implements SpeechProvider {
  stt: SttStream = {
    sendAudio: () => {},
    close: () => {},
    onPartial: () => {},
    onFinal: () => {},
    onError: () => {},
  };
  tts: FakeTts[] = [];
  createStt(): SttStream {
    return this.stt;
  }
  createTts(): TtsStream {
    const tts = new FakeTts();
    this.tts.push(tts);
    return tts;
  }
}

class FakeTransport implements Transport {
  readonly format = "pcm_16000" as const;
  events: ServerEvent[] = [];
  audioChunks = 0;
  clears = 0;
  closed = false;
  onAudio: (chunk: Buffer) => void = () => {};
  onText: (text: string) => void = () => {};
  onPlaybackDone: (turn: number) => void = () => {};
  onClose: () => void = () => {};

  sendAudio(): void {
    this.audioChunks++;
  }
  sendEvent(event: ServerEvent): void {
    this.events.push(event);
    // Behave like a browser whose speaker drains instantly.
    if (event.type === "agent_audio_end")
      setImmediate(() => this.onPlaybackDone(event.turn));
  }
  clear(): void {
    this.clears++;
  }
  close(): void {
    this.closed = true;
  }
  of<T extends ServerEvent["type"]>(type: T) {
    return this.events.filter(
      (e): e is Extract<ServerEvent, { type: T }> => e.type === type,
    );
  }
}

function harness(steps: Step[], voice: boolean) {
  const llm = new FakeLlm(steps);
  const speech = new FakeSpeech();
  const transport = new FakeTransport();
  const turns: TurnRecord[] = [];
  let result: { outcome: Outcome; fields: Record<string, unknown> } | undefined;
  let clock = 0;
  new CallSession({
    flow,
    variables,
    llm,
    speech: voice ? speech : null,
    transport,
    recorder: {
      turn: (record) => void turns.push(record),
      finish: (r) => void (result = r),
    },
    now: () => (clock += 100),
  }).start();
  return { llm, speech, transport, turns, result: () => result };
}

async function until(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("timed out waiting");
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test("text call runs the flow to completion and stores the result", async () => {
  const h = harness(
    [
      { text: "Namaste Ramesh ji. Abhi aap kahan hain?" },
      {
        text: "Theek hai. Kya aap 9 baje tak pahunch jayenge?",
        fields: { current_location: "Adilabad toll" },
      },
      { text: "Achha. Koi dikkat?", fields: { on_schedule: true } },
      { text: "Dhanyavaad, drive safe.", fields: { needs_help: false } },
    ],
    false,
  );
  await until(() => h.turns.length === 1);
  h.transport.onText("Adilabad toll ke paas hoon");
  await until(() => h.turns.length === 2);
  h.transport.onText("haan pahunch jaunga");
  await until(() => h.turns.length === 3);
  h.transport.onText("nahi sab theek hai");
  await until(() => h.transport.closed);

  assert.deepEqual(h.result(), {
    outcome: "completed",
    fields: {
      current_location: "Adilabad toll",
      on_schedule: true,
      needs_help: false,
    },
  });
  assert.deepEqual(
    h.turns.map((t) => t.nodeId),
    ["ask_location", "ask_schedule", "ask_help", "goodbye"],
  );

  // The opening brief carries the scripted greeting and the first step.
  const opening = h.llm.requests[0]!.messages[0]!;
  assert.match(opening.text, /Namaste Ramesh ji, this is the automated assistant/);
  assert.match(opening.text, /Current step "ask_location"/);
  // Each tool call is answered on the following caller message.
  const second = h.llm.requests[2]!.messages.at(-1)!;
  assert.equal(second.role, "user");
  assert.deepEqual(second.role === "user" && second.toolResult, {
    id: "tool_2",
    content: 'Recorded: {"current_location":"Adilabad toll"}.',
  });
});

test("voice call streams audio and records time to first audio", async () => {
  const h = harness(
    [
      { text: "Namaste. Aap kahan hain?" },
      { text: "Theek hai.", fields: { current_location: "Nagpur" } },
    ],
    true,
  );
  await until(() => h.turns.length === 1);
  assert.ok(h.transport.audioChunks >= 2, "one chunk per spoken phrase");
  assert.equal(h.transport.of("agent_audio_end").length, 1);

  h.speech.stt.onFinal("Nagpur mein hoon");
  await until(() => h.turns.length === 2);
  const turn = h.turns[1]!;
  assert.equal(turn.callerText, "Nagpur mein hoon");
  assert.equal(turn.interrupted, false);
  assert.ok(turn.llmMs !== null && turn.audioMs !== null);
  assert.ok(turn.audioMs >= turn.llmMs);
});

test("caller speech stops the agent mid-reply and the next turn hears both", async () => {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  const h = harness(
    [
      { text: "Namaste. Aap kahan hain?" },
      { text: "Achha, aur kya aap samay par pahunchenge?", hold },
      {
        text: "Samajh gaya. Koi dikkat?",
        fields: { current_location: "Nagpur", on_schedule: true },
      },
    ],
    true,
  );
  await until(() => h.turns.length === 1);

  h.speech.stt.onFinal("Nagpur mein hoon");
  await until(() => h.llm.requests.length === 2);
  const interruptedTts = h.speech.tts.at(-2) ?? h.speech.tts.at(-1)!;

  // The driver keeps talking while the agent is still generating.
  h.speech.stt.onPartial("aur main time pe");
  await until(() => h.turns.length === 2);
  release();

  assert.equal(h.transport.clears, 1);
  assert.equal(h.turns[1]!.interrupted, true);
  assert.ok(h.speech.tts.some((t) => t.cancelled));
  assert.ok(interruptedTts);

  h.speech.stt.onFinal("aur main time pe pahunch jaunga");
  await until(() => h.turns.length === 3);
  const history = h.llm.requests[2]!.messages;
  assert.ok(
    history.some(
      (m) => m.role === "assistant" && m.text.includes("[interrupted by the caller]"),
    ),
  );
  assert.equal(h.turns[2]!.nodeId, "ask_help");
  assert.equal(h.turns[2]!.interrupted, false);
});

test("hanging up mid-call stores what was collected as partial", async () => {
  const h = harness(
    [
      { text: "Namaste. Aap kahan hain?" },
      { text: "Theek hai.", fields: { current_location: "Nagpur" } },
    ],
    false,
  );
  await until(() => h.turns.length === 1);
  h.transport.onText("Nagpur");
  await until(() => h.turns.length === 2);
  h.transport.onClose();
  await until(() => h.result() !== undefined);
  assert.deepEqual(h.result(), {
    outcome: "partial",
    fields: { current_location: "Nagpur" },
  });
});
