import WebSocket from "ws";
import {
  type AudioFormat,
  SAMPLE_RATE,
  type SpeechProvider,
  type SttStream,
  type TtsStream,
} from "./types";

export interface ElevenLabsOptions {
  apiKey: string;
  host: string;
  voiceId?: string;
  ttsModel: string;
  sttModel: string;
  // Silence that ends the caller's turn. Lower is snappier but cuts people off.
  silenceSecs: number;
}

const STT_ERRORS = new Set([
  "error",
  "auth_error",
  "quota_exceeded",
  "rate_limited",
  "queue_overflow",
  "resource_exhausted",
  "session_time_limit_exceeded",
  "input_error",
  "invalid_request",
  "chunk_size_exceeded",
  "transcriber_error",
  "unaccepted_terms",
]);

class ElevenLabsStt implements SttStream {
  onPartial: (text: string) => void = () => {};
  onFinal: (text: string) => void = () => {};
  onError: (error: Error) => void = () => {};
  private ws: WebSocket;
  private backlog: Buffer[] = [];
  private sampleRate: number;

  constructor(opts: ElevenLabsOptions, format: AudioFormat) {
    this.sampleRate = SAMPLE_RATE[format];
    const query = new URLSearchParams({
      model_id: opts.sttModel,
      audio_format: format,
      commit_strategy: "vad",
      vad_silence_threshold_secs: String(opts.silenceSecs),
    });
    this.ws = new WebSocket(
      `wss://${opts.host}/v1/speech-to-text/realtime?${query}`,
      { headers: { "xi-api-key": opts.apiKey } },
    );
    this.ws.on("open", () => {
      for (const chunk of this.backlog) this.write(chunk);
      this.backlog = [];
    });
    this.ws.on("message", (data) => {
      const msg = JSON.parse(data.toString()) as {
        message_type: string;
        text?: string;
        error?: string;
      };
      if (msg.message_type === "partial_transcript")
        this.onPartial(msg.text ?? "");
      else if (msg.message_type === "committed_transcript")
        this.onFinal(msg.text ?? "");
      else if (STT_ERRORS.has(msg.message_type))
        this.onError(
          new Error(`Speech-to-text ${msg.message_type}: ${msg.error}`),
        );
    });
    this.ws.on("error", (err) => this.onError(err));
  }

  private write(chunk: Buffer): void {
    this.ws.send(
      JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: chunk.toString("base64"),
        commit: false,
        sample_rate: this.sampleRate,
      }),
    );
  }

  sendAudio(chunk: Buffer): void {
    if (this.ws.readyState === WebSocket.OPEN) this.write(chunk);
    else if (this.ws.readyState === WebSocket.CONNECTING)
      this.backlog.push(chunk);
  }

  close(): void {
    this.ws.close();
  }
}

class ElevenLabsTts implements TtsStream {
  onAudio: (chunk: Buffer) => void = () => {};
  onError: (error: Error) => void = () => {};
  readonly done: Promise<void>;
  private ws: WebSocket;
  private backlog: string[] = [];
  private finish!: () => void;
  private cancelled = false;

  constructor(opts: ElevenLabsOptions, format: AudioFormat, voiceId: string) {
    this.done = new Promise((resolve) => (this.finish = resolve));
    const query = new URLSearchParams({
      model_id: opts.ttsModel,
      output_format: format,
      // Phrases arrive pre-chunked, so let the server synthesise immediately.
      auto_mode: "true",
      // Sockets are opened ahead of the turn that uses them.
      inactivity_timeout: "180",
    });
    this.ws = new WebSocket(
      `wss://${opts.host}/v1/text-to-speech/${voiceId}/stream-input?${query}`,
      { headers: { "xi-api-key": opts.apiKey } },
    );
    this.ws.on("open", () => {
      this.ws.send(JSON.stringify({ text: " " }));
      for (const payload of this.backlog) this.ws.send(payload);
      this.backlog = [];
    });
    this.ws.on("message", (data) => {
      if (this.cancelled) return;
      const msg = JSON.parse(data.toString()) as {
        audio?: string | null;
        isFinal?: boolean | null;
        error?: string;
        message?: string;
      };
      if (msg.audio) this.onAudio(Buffer.from(msg.audio, "base64"));
      if (msg.error)
        this.onError(new Error(`Text-to-speech: ${msg.message ?? msg.error}`));
      if (msg.isFinal) this.finish();
    });
    this.ws.on("error", (err) => {
      if (!this.cancelled) this.onError(err);
      this.finish();
    });
    this.ws.on("close", () => this.finish());
  }

  get alive(): boolean {
    return (
      !this.cancelled &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    );
  }

  private write(payload: string): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(payload);
    else if (this.ws.readyState === WebSocket.CONNECTING)
      this.backlog.push(payload);
  }

  sendText(text: string): void {
    if (!text.trim()) return;
    this.write(
      JSON.stringify({ text: text.endsWith(" ") ? text : `${text} ` }),
    );
  }

  end(): void {
    this.write(JSON.stringify({ text: "" }));
  }

  cancel(): void {
    this.cancelled = true;
    this.ws.terminate();
    this.finish();
  }
}

export class ElevenLabsSpeech implements SpeechProvider {
  constructor(private opts: ElevenLabsOptions) {}

  createStt(format: AudioFormat): SttStream {
    return new ElevenLabsStt(this.opts, format);
  }

  createTts(format: AudioFormat, voiceId?: string): TtsStream {
    const voice = voiceId ?? this.opts.voiceId;
    if (!voice) {
      throw new Error(
        "No voice configured. Set ELEVENLABS_VOICE_ID or settings.voiceId on the flow.",
      );
    }
    return new ElevenLabsTts(this.opts, format, voice);
  }
}
