import { type FieldValue, type Flow, type Outcome, PHONE_NUMBER, renderTemplate } from "@oxumi/flow-core";
import type { LlmProvider } from "../llm/types";
import {
  BYTES_PER_SECOND,
  PhraseChunker,
  type SpeechProvider,
  type SttStream,
  type TtsStream,
} from "../speech/types";
import { Conversation, type KnowledgeLookup, type TurnInput } from "./conversation";
import type { Transport } from "./transport";

export interface TurnRecord {
  index: number;
  callerText: string | null;
  agentText: string;
  interrupted: boolean;
  nodeId: string;
  // Milliseconds from the caller finishing to the first LLM text / first audio.
  llmMs: number | null;
  audioMs: number | null;
}

// A hand-off to a person, as it happened.
export interface HandoffRecord {
  to: string;
  reason: "step" | "requested";
  summary: string;
  // connected: the provider is putting the caller through. simulated: a test
  // call, where nobody is actually dialled. failed: the call carried on.
  status: "connected" | "simulated" | "failed";
  error?: string;
  at: string;
}

// Puts the caller through to `to`. Resolves with how it went; a transfer
// that cannot be made resolves with ok false rather than throwing.
export type TransferHandler = (request: {
  to: string;
  summary: string;
}) => Promise<{ ok: true; status: "connected" | "simulated" } | { ok: false; error: string }>;

export interface CallRecorder {
  turn(record: TurnRecord): void | Promise<void>;
  handoff?(record: HandoffRecord): void | Promise<void>;
  finish(result: {
    outcome: Outcome;
    fields: Record<string, FieldValue>;
  }): void | Promise<void>;
}

export interface CallSessionOptions {
  flow: Flow;
  variables: Record<string, string>;
  llm: LlmProvider;
  // Null runs the call as typed text: same flow and LLM, no audio.
  speech: SpeechProvider | null;
  transport: Transport;
  recorder: CallRecorder;
  // Said before the flow's opening, e.g. a recording disclosure.
  preamble?: string;
  knowledge?: KnowledgeLookup;
  // Open voice calls without waiting for the model; see Conversation.
  instantOpening?: boolean;
  // Whether the caller speaking cuts the agent off (the default). Off, the
  // agent always finishes what it is saying; what the caller said meanwhile
  // is still transcribed live and answered next, prepared while the current
  // reply is still playing.
  bargeIn?: boolean;
  // How this channel hands a caller to a person. Without one, a transfer
  // fails and the call carries on.
  transfer?: TransferHandler;
  now?: () => number;
}

// Shorter fragments are usually breath or echo, not an attempt to speak.
const MIN_INTERRUPT_CHARS = 3;
const PLAYBACK_GRACE_MS = 1500;
// Without barge-in, how long the caller must stay quiet after a transcript
// before it is answered. Recognisers cut one sentence into pieces at short
// pauses; answering each piece separately makes the agent talk over the rest.
const SETTLE_MS = 500;
// The caller started speaking again but no transcript followed (noise):
// answer what was already said after this long.
const SETTLE_MAX_MS = 2500;

// Runs one call: turn-taking, interruption, timing and teardown. Dialogue
// content comes from Conversation; this class only orchestrates.
export class CallSession {
  private conversation: Conversation;
  private stt?: SttStream;
  private warmTts?: TtsStream;
  private activeTts?: TtsStream;
  private abort?: AbortController;
  private speaking = false;
  private turnIndex = 0;
  private pendingTexts: string[] = [];
  private chain: Promise<void> = Promise.resolve();
  private releasePlayback?: () => void;
  private waitingForTurn = -1;
  // Whether the reply now playing may be left to play out on its own while
  // the next one is prepared (not a goodbye or a transfer line).
  private canOverlap = false;
  private settleTimer?: NodeJS.Timeout;
  private timer?: NodeJS.Timeout;
  private closed = false;
  private now: () => number;

  constructor(private opts: CallSessionOptions) {
    this.conversation = new Conversation(opts.flow, opts.variables, opts.llm, {
      preamble: opts.preamble,
      knowledge: opts.knowledge,
      instantOpening: opts.instantOpening,
    });
    this.now = opts.now ?? Date.now;
  }

  start(): void {
    const { transport, speech, flow } = this.opts;
    transport.onAudio = (chunk) => this.stt?.sendAudio(chunk);
    transport.onText = (text) => this.callerSaid(text);
    transport.onPlaybackDone = (turn) => {
      if (turn === this.waitingForTurn) this.releasePlayback?.();
    };
    transport.onClose = () => void this.finish();

    if (speech) {
      try {
        this.stt = speech.createStt(transport.format, flow.settings.languages);
        this.stt.onPartial = (text) => this.callerSpeaking(text);
        this.stt.onSpeechStart = () => this.bargeIn();
        this.stt.onFinal = (text) => this.callerSaid(text);
        this.stt.onError = (err) => this.fail(err);
        this.warm();
      } catch (err) {
        return this.fail(err);
      }
    }
    this.timer = setTimeout(
      () => void this.finish(),
      flow.settings.maxDurationSec * 1000,
    );
    // The call's sockets keep the process alive, not this timer.
    this.timer.unref();
    this.enqueue(() => this.runTurn({ kind: "connected" }));
  }

  private callerSpeaking(text: string): void {
    this.opts.transport.sendEvent({
      type: "transcript",
      role: "caller",
      text,
      final: false,
    });
    if (text.trim().length >= MIN_INTERRUPT_CHARS) this.bargeIn();
  }

  // The caller is talking again: hold any pending answer for the rest.
  private holdForMore(): void {
    if (this.settleTimer) this.settle(SETTLE_MAX_MS);
  }

  private settle(ms: number): void {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settleTimer = undefined;
      this.answerPending();
    }, ms);
  }

  private callerSaid(raw: string): void {
    const text = raw.trim();
    if (!text || this.closed) return;
    this.opts.transport.sendEvent({
      type: "transcript",
      role: "caller",
      text,
      final: true,
    });
    this.bargeIn();
    // Utterances that land while a turn is still unwinding are answered
    // together, in one reply.
    this.pendingTexts.push(text);
    if (this.opts.bargeIn === false) this.settle(SETTLE_MS);
    else this.answerPending();
  }

  private answerPending(): void {
    if (this.closed || !this.pendingTexts.length) return;
    // Without barge-in the reply keeps playing, but the answer to this is
    // started now rather than after the last word has been heard.
    if (this.opts.bargeIn === false && this.canOverlap) this.releasePlayback?.();
    this.enqueue(async () => {
      if (!this.pendingTexts.length) return;
      const combined = this.pendingTexts.join(" ");
      this.pendingTexts = [];
      await this.runTurn({ kind: "caller", text: combined });
    });
  }

  // The caller started talking: cut the agent off, unless barge-in is off.
  private bargeIn(): void {
    if (this.opts.bargeIn !== false) this.interrupt();
    else this.holdForMore();
  }

  private interrupt(): void {
    if (!this.abort && !this.speaking) return;
    this.abort?.abort();
    this.activeTts?.cancel();
    this.opts.transport.clear();
    this.speaking = false;
    this.releasePlayback?.();
  }

  private enqueue(task: () => Promise<void>): void {
    this.chain = this.chain
      .then(() => (this.closed ? undefined : task()))
      .catch((err) => this.fail(err));
  }

  private warm(): void {
    const { speech, transport, flow } = this.opts;
    if (!speech || this.warmTts?.alive) return;
    this.warmTts = speech.createTts(transport.format, flow.settings.voiceId);
  }

  private takeTts(): TtsStream | undefined {
    if (!this.opts.speech) return undefined;
    this.warm();
    const tts = this.warmTts;
    this.warmTts = undefined;
    return tts;
  }

  private async runTurn(input: TurnInput): Promise<void> {
    const { transport } = this.opts;
    const turn = ++this.turnIndex;
    const abort = (this.abort = new AbortController());
    const started = this.now();
    let firstText: number | null = null;
    let firstAudio: number | null = null;
    let audioBytes = 0;

    const tts = (this.activeTts = this.takeTts());
    const chunker = new PhraseChunker();
    if (tts) {
      tts.onError = (err) =>
        transport.sendEvent({ type: "error", message: err.message });
      tts.onAudio = (chunk) => {
        if (abort.signal.aborted) return;
        firstAudio ??= this.now();
        audioBytes += chunk.length;
        this.speaking = true;
        transport.sendAudio(chunk);
      };
    }

    const output = await this.conversation.respond(input, {
      signal: abort.signal,
      onText: (delta) => {
        firstText ??= this.now();
        transport.sendEvent({ type: "agent_text", turn, delta });
        if (tts) for (const phrase of chunker.push(delta)) tts.sendText(phrase);
      },
    });

    if (tts && !abort.signal.aborted) {
      tts.sendText(chunker.flush());
      tts.end();
      await Promise.race([tts.done, aborted(abort.signal)]);
    }
    if (tts && !abort.signal.aborted && audioBytes) {
      transport.sendEvent({ type: "agent_audio_end", turn });
      // A goodbye or a transfer line always plays to the end.
      this.canOverlap = !output.state.ended && !output.state.transfer;
      if (!(this.opts.bargeIn === false && this.canOverlap && this.pendingTexts.length))
        await this.playbackFinished(turn, audioBytes, abort.signal);
      this.canOverlap = false;
    }
    const interrupted = output.interrupted || abort.signal.aborted;
    if (interrupted) tts?.cancel();

    this.speaking = false;
    this.activeTts = undefined;
    if (this.abort === abort) this.abort = undefined;

    const record: TurnRecord = {
      index: turn,
      callerText: input.kind === "caller" ? input.text : null,
      agentText: output.text,
      interrupted,
      nodeId: output.state.nodeId,
      llmMs: firstText === null ? null : firstText - started,
      audioMs: firstAudio === null ? null : firstAudio - started,
    };
    await this.opts.recorder.turn(record);
    transport.sendEvent({
      type: "turn",
      turn,
      interrupted,
      llmMs: record.llmMs,
      audioMs: record.audioMs,
    });
    transport.sendEvent({ type: "state", state: output.state });

    if (output.state.transfer && !interrupted) return this.handOff(output.state.transfer);
    if (output.state.ended) return this.finish();
    if (this.opts.speech) this.warm();
  }

  // The agent has said its transfer line. Put the caller through, or tell
  // them it could not be done and carry on with the flow.
  private async handOff(transfer: { to: string; reason: "step" | "requested" }): Promise<void> {
    const to = renderTemplate(transfer.to, this.opts.variables).replace(/[\s()-]/g, "");
    const summary = this.conversation.handoffSummary();
    const result = !PHONE_NUMBER.test(to)
      ? { ok: false as const, error: `"${to || transfer.to}" is not a phone number in international format.` }
      : this.opts.transfer
        ? await this.opts.transfer({ to, summary }).catch((err: unknown) => ({
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          }))
        : { ok: false as const, error: "This channel cannot transfer calls." };

    await this.opts.recorder.handoff?.({
      to,
      reason: transfer.reason,
      summary,
      status: result.ok ? result.status : "failed",
      error: result.ok ? undefined : result.error,
      at: new Date(this.now()).toISOString(),
    });
    this.opts.transport.sendEvent({
      type: "transfer",
      to,
      summary,
      status: result.ok ? result.status : "failed",
      error: result.ok ? undefined : result.error,
    });
    if (result.ok) return this.finish("transferred");

    this.conversation.resumeAfterTransfer();
    this.opts.transport.sendEvent({ type: "state", state: this.conversation.state });
    if (this.conversation.state.ended) return this.finish();
    if (this.opts.speech) this.warm();
    this.enqueue(() => this.runTurn({ kind: "transfer_failed" }));
  }

  // The client reports when its speaker has drained; the timeout covers a
  // client that never does.
  private playbackFinished(
    turn: number,
    audioBytes: number,
    signal: AbortSignal,
  ): Promise<void> {
    const durationMs =
      (audioBytes / BYTES_PER_SECOND[this.opts.transport.format]) * 1000;
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timeout);
        this.releasePlayback = undefined;
        resolve();
      };
      const timeout = setTimeout(done, durationMs + PLAYBACK_GRACE_MS);
      this.waitingForTurn = turn;
      this.releasePlayback = done;
      signal.addEventListener("abort", done, { once: true });
    });
  }

  private fail(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.opts.transport.sendEvent({ type: "error", message });
    void this.finish("failed");
  }

  private async finish(forced?: Outcome): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timer);
    clearTimeout(this.settleTimer);
    this.abort?.abort();
    this.releasePlayback?.();
    this.activeTts?.cancel();
    this.warmTts?.cancel();
    this.stt?.close();

    const { state } = this.conversation;
    const fields = state.fields;
    // Ended by the flow, or cut short by a hang-up, timeout or error.
    const outcome: Outcome =
      forced ??
      state.outcome ??
      (Object.keys(fields).length ? "partial" : "failed");
    await this.opts.recorder.finish({ outcome, fields });
    this.opts.transport.sendEvent({ type: "ended", outcome, fields });
    this.opts.transport.close();
  }
}

function aborted(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}
