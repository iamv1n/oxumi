import WebSocket from "ws";
import {
  type AudioFormat,
  type CallLanguage,
  SAMPLE_RATE,
  type SpeechProvider,
  type SttStream,
  type TtsStream,
} from "./types";

export interface SarvamOptions {
  apiKey: string;
  // Default speaker when an agent does not set one, e.g. "shubh".
  speaker?: string;
  ttsModel: string;
  sttModel: string;
}

const STT_URL = "wss://api.sarvam.ai/speech-to-text/ws";
const TTS_URL = "https://api.sarvam.ai/text-to-speech/stream";
const WAV_HEADER_BYTES = 44;

// Sarvam's streaming recogniser returns finished utterances only (no
// word-by-word partials), plus a signal when the caller starts speaking,
// which is what lets the agent be interrupted.
class SarvamStt implements SttStream {
  onPartial: (text: string) => void = () => {};
  onFinal: (text: string) => void = () => {};
  onSpeechStart: () => void = () => {};
  onError: (error: Error) => void = () => {};
  private ws: WebSocket;
  private backlog: Buffer[] = [];
  private rate: string;
  private mulaw: boolean;

  constructor(opts: SarvamOptions, format: AudioFormat, languages: CallLanguage[] = []) {
    // Phone audio arrives as mu-law, which Sarvam does not take; it is decoded
    // to 16-bit PCM at the same 8 kHz before being sent.
    this.mulaw = format === "ulaw_8000";
    this.rate = String(SAMPLE_RATE[format]);
    const query = new URLSearchParams({
      // Pinned to the call's language. Auto-detect heard short Hindi and
      // English replies as Telugu or Punjabi; hi-IN also takes Hinglish.
      "language-code": languages.includes("hi") ? "hi-IN" : languages.includes("en") ? "en-IN" : "unknown",
      model: opts.sttModel,
      sample_rate: this.rate,
      input_audio_codec: "pcm_s16le",
      vad_signals: "true",
      high_vad_sensitivity: "true",
    });
    this.ws = new WebSocket(`${STT_URL}?${query}`, {
      headers: { "Api-Subscription-Key": opts.apiKey },
    });
    this.ws.on("open", () => {
      for (const chunk of this.backlog) this.write(chunk);
      this.backlog = [];
    });
    this.ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as {
        type: "data" | "events" | "error";
        data?: { transcript?: string; signal_type?: string; error?: string };
      };
      if (msg.type === "data") this.onFinal(msg.data?.transcript ?? "");
      else if (msg.type === "events" && msg.data?.signal_type === "START_SPEECH")
        this.onSpeechStart();
      else if (msg.type === "error")
        this.onError(new Error(`Sarvam speech-to-text: ${msg.data?.error ?? "error"}`));
    });
    this.ws.on("error", (err) => this.onError(err));
  }

  private write(chunk: Buffer): void {
    this.ws.send(
      JSON.stringify({
        audio: {
          data: (this.mulaw ? decodeMulaw(chunk) : chunk).toString("base64"),
          sample_rate: this.rate,
          encoding: "audio/wav",
        },
      }),
    );
  }

  sendAudio(chunk: Buffer): void {
    if (this.ws.readyState === WebSocket.OPEN) this.write(chunk);
    else if (this.ws.readyState === WebSocket.CONNECTING) this.backlog.push(chunk);
  }

  close(): void {
    this.ws.close();
  }
}

// G.711 mu-law to 16-bit little-endian PCM.
function decodeMulaw(input: Buffer): Buffer {
  const out = Buffer.allocUnsafe(input.length * 2);
  for (let i = 0; i < input.length; i++) {
    const byte = ~input[i]! & 0xff;
    const magnitude = (((byte & 0x0f) << 3) + 0x84) << ((byte & 0x70) >> 4);
    const sample = byte & 0x80 ? 0x84 - magnitude : magnitude - 0x84;
    out.writeInt16LE(sample, i * 2);
  }
  return out;
}

// Speech is requested one phrase at a time over Sarvam's streaming HTTP
// endpoint and played in order.
class SarvamTts implements TtsStream {
  onAudio: (chunk: Buffer) => void = () => {};
  onError: (error: Error) => void = () => {};
  readonly done: Promise<void>;
  private queue: string[] = [];
  private running = false;
  private ended = false;
  private cancelled = false;
  private abort = new AbortController();
  private finish!: () => void;

  constructor(
    private opts: SarvamOptions,
    private format: AudioFormat,
    private speaker: string | undefined,
  ) {
    this.done = new Promise((resolve) => (this.finish = resolve));
  }

  get alive(): boolean {
    return !this.cancelled && !this.ended;
  }

  sendText(text: string): void {
    if (!text.trim() || this.cancelled) return;
    this.queue.push(text.trim());
    void this.pump();
  }

  end(): void {
    this.ended = true;
    if (!this.running && !this.queue.length) this.finish();
  }

  cancel(): void {
    this.cancelled = true;
    this.queue = [];
    this.abort.abort();
    this.finish();
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length && !this.cancelled) await this.speak(this.queue.shift()!);
    } catch (err) {
      if (!this.cancelled) this.onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.running = false;
      if (this.ended || this.cancelled) this.finish();
    }
  }

  private async speak(text: string): Promise<void> {

    const res = await fetch(TTS_URL, {
      method: "POST",
      signal: this.abort.signal,
      headers: {
        "api-subscription-key": this.opts.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model: this.opts.ttsModel,
        ...(this.speaker ? { speaker: this.speaker } : {}),
        speech_sample_rate: SAMPLE_RATE[this.format],
        output_audio_codec: this.format === "ulaw_8000" ? "mulaw" : "linear16",
      }),
    });
    if (!res.ok || !res.body) {
      const detail = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(
        `Sarvam text-to-speech: ${detail?.error?.message ?? `request failed (${res.status})`}`,
      );
    }
    let first = true;
    for await (const piece of res.body as unknown as AsyncIterable<Uint8Array>) {
      let chunk = Buffer.from(piece);
      // Raw samples are expected; drop a WAV header if one is sent anyway.
      if (first && chunk.subarray(0, 4).toString("latin1") === "RIFF")
        chunk = chunk.subarray(WAV_HEADER_BYTES);
      first = false;
      if (chunk.length && !this.cancelled) this.onAudio(chunk);
    }
  }
}

export class SarvamSpeech implements SpeechProvider {
  constructor(private opts: SarvamOptions) {}

  createStt(format: AudioFormat, languages?: CallLanguage[]): SttStream {
    return new SarvamStt(this.opts, format, languages);
  }

  createTts(format: AudioFormat, voiceId?: string): TtsStream {
    return new SarvamTts(this.opts, format, voiceId ?? this.opts.speaker);
  }
}
