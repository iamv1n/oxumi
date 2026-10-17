// Audio stays in one format end to end per channel, so nothing is transcoded
// on the hot path: 16 kHz PCM for the browser, and for phone lines 8 kHz
// mu-law (Twilio, Vobiz) or 8 kHz PCM (Exotel).
export type AudioFormat = "pcm_16000" | "ulaw_8000" | "pcm_8000";

export const SAMPLE_RATE: Record<AudioFormat, number> = {
  pcm_16000: 16000,
  ulaw_8000: 8000,
  pcm_8000: 8000,
};
export const BYTES_PER_SECOND: Record<AudioFormat, number> = {
  pcm_16000: 32000,
  ulaw_8000: 8000,
  pcm_8000: 16000,
};

export interface SttStream {
  sendAudio(chunk: Buffer): void;
  close(): void;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  // For recognisers without partial transcripts: the caller began speaking.
  onSpeechStart?: () => void;
  onError: (error: Error) => void;
}

// One spoken agent reply. Text goes in as it is generated; audio comes out as
// it is synthesised.
export interface TtsStream {
  sendText(text: string): void;
  // No more text is coming; `done` resolves once the last audio has arrived.
  end(): void;
  cancel(): void;
  readonly alive: boolean;
  readonly done: Promise<void>;
  onAudio: (chunk: Buffer) => void;
  onError: (error: Error) => void;
}

export type CallLanguage = "hi" | "en";

export interface SpeechProvider {
  // `languages` are the call's, first one first; recognisers that need one
  // language are pinned to it rather than guessing per utterance.
  createStt(format: AudioFormat, languages?: CallLanguage[]): SttStream;
  createTts(format: AudioFormat, voiceId?: string): TtsStream;
}

const BOUNDARY = /[.!?।\n]+["')\]]*\s+/g;
const SOFT_LIMIT = 80;
// Until something has been sent, a phrase this long is sent at the next
// comma or space rather than waiting for the end of the sentence: the first
// audio of a reply is what the caller waits for.
const FIRST_PHRASE = 32;

// Splits streamed LLM text into phrase-sized pieces, which is what the TTS
// socket wants when its own buffering is switched off.
export class PhraseChunker {
  private buffer = "";
  private sent = false;

  push(delta: string): string[] {
    this.buffer += delta;
    const out: string[] = [];
    let cut = 0;
    for (const match of this.buffer.matchAll(BOUNDARY)) {
      const end = match.index + match[0].length;
      out.push(this.buffer.slice(cut, end));
      cut = end;
    }
    this.buffer = this.buffer.slice(cut);
    if (!this.sent && !out.length && this.buffer.length >= FIRST_PHRASE) {
      const at = Math.max(this.buffer.lastIndexOf(", "), this.buffer.lastIndexOf(" "));
      if (at > 0) {
        out.push(this.buffer.slice(0, at + 1));
        this.buffer = this.buffer.slice(at + 1);
      }
    }
    if (this.buffer.length > SOFT_LIMIT) {
      const comma = this.buffer.lastIndexOf(", ");
      if (comma > 0) {
        out.push(this.buffer.slice(0, comma + 2));
        this.buffer = this.buffer.slice(comma + 2);
      }
    }
    if (out.length) this.sent = true;
    return out;
  }

  flush(): string {
    const rest = this.buffer;
    this.buffer = "";
    return rest;
  }
}
