import type WebSocket from "ws";
import type { ServerEvent, Transport } from "../runtime/transport";

const MARK_PREFIX = "turn-";
// Exotel wants audio in multiples of 320 bytes (20 ms at 8 kHz, 16-bit) and
// plays small packets poorly, so replies are sent in 200 ms pieces.
const FRAME_BYTES = 320;
const CHUNK_BYTES = FRAME_BYTES * 10;

// A phone line through Exotel's Voicebot stream: 16-bit PCM at 8 kHz in both
// directions. The message shapes mirror Twilio's, in snake_case.
export class ExotelTransport implements Transport {
  readonly format = "pcm_8000" as const;
  onAudio: (chunk: Buffer) => void = () => {};
  onText: (text: string) => void = () => {};
  onPlaybackDone: (turn: number) => void = () => {};
  onClose: () => void = () => {};
  private pending = Buffer.alloc(0);
  private sequence = 0;
  private chunk = 0;

  constructor(
    private ws: WebSocket,
    private streamSid: string,
  ) {
    ws.on("message", (raw: Buffer) => {
      let msg: {
        event?: string;
        media?: { payload?: string };
        mark?: { name?: string };
      };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.event === "media" && msg.media?.payload) {
        this.onAudio(Buffer.from(msg.media.payload, "base64"));
      } else if (msg.event === "mark" && msg.mark?.name?.startsWith(MARK_PREFIX)) {
        this.onPlaybackDone(Number(msg.mark.name.slice(MARK_PREFIX.length)));
      } else if (msg.event === "stop") {
        ws.close();
      }
    });
    ws.on("close", () => this.onClose());
  }

  private send(message: Record<string, unknown>): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(
        JSON.stringify({
          ...message,
          sequence_number: ++this.sequence,
          stream_sid: this.streamSid,
        }),
      );
    }
  }

  private sendMedia(audio: Buffer): void {
    this.send({
      event: "media",
      media: { chunk: ++this.chunk, payload: audio.toString("base64") },
    });
  }

  sendAudio(chunk: Buffer): void {
    this.pending = Buffer.concat([this.pending, chunk]);
    while (this.pending.length >= CHUNK_BYTES) {
      this.sendMedia(this.pending.subarray(0, CHUNK_BYTES));
      this.pending = this.pending.subarray(CHUNK_BYTES);
    }
  }

  // Sends what is left of a reply, padded with silence to a whole frame.
  private flush(): void {
    if (!this.pending.length) return;
    const padded = Buffer.alloc(Math.ceil(this.pending.length / FRAME_BYTES) * FRAME_BYTES);
    this.pending.copy(padded);
    this.pending = Buffer.alloc(0);
    this.sendMedia(padded);
  }

  sendEvent(event: ServerEvent): void {
    if (event.type !== "agent_audio_end") return;
    this.flush();
    this.send({ event: "mark", mark: { name: `${MARK_PREFIX}${event.turn}` } });
  }

  clear(): void {
    this.pending = Buffer.alloc(0);
    this.send({ event: "clear" });
  }

  close(): void {
    this.ws.close();
  }
}
