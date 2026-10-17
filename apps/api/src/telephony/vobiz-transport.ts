import type WebSocket from "ws";
import type { ServerEvent, Transport } from "../runtime/transport";

const CHECKPOINT_PREFIX = "turn-";
// 20 ms of 8 kHz mu-law. Vobiz recommends 20 to 60 ms pieces: the smaller
// they are, the more of a reply an interruption can still cancel.
const FRAME_BYTES = 160;
// How long to hold new audio for Vobiz to confirm a flush before sending it
// anyway.
const CLEAR_TIMEOUT_MS = 400;

// A phone line through Vobiz's bidirectional stream: 8 kHz mu-law both ways.
// Replies go out as "playAudio"; a "checkpoint" after each one comes back as
// "playedStream" once the caller has heard it. Vobiz sends no "stop": the
// socket closing is the end of the call.
export class VobizTransport implements Transport {
  readonly format = "ulaw_8000" as const;
  onAudio: (chunk: Buffer) => void = () => {};
  onText: (text: string) => void = () => {};
  onPlaybackDone: (turn: number) => void = () => {};
  onClose: () => void = () => {};
  private pending = Buffer.alloc(0);
  // Between asking Vobiz to drop its queue and hearing that it has, anything
  // sent could be dropped with it, so it waits here.
  private clearing = false;
  private held: Record<string, unknown>[] = [];
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private ws: WebSocket,
    private streamId: string,
  ) {
    ws.on("message", (raw: Buffer) => {
      let msg: {
        event?: string;
        media?: { payload?: string; track?: string };
        name?: string;
      };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.event === "media" && msg.media?.payload) {
        // Only the caller's side; our own audio is never sent back on a
        // bidirectional stream, but the track is named, so it is checked.
        if (msg.media.track && msg.media.track !== "inbound") return;
        this.onAudio(Buffer.from(msg.media.payload, "base64"));
      } else if (msg.event === "playedStream" && msg.name?.startsWith(CHECKPOINT_PREFIX)) {
        this.onPlaybackDone(Number(msg.name.slice(CHECKPOINT_PREFIX.length)));
      } else if (msg.event === "clearedAudio") {
        this.release();
      }
    });
    ws.on("close", () => {
      if (this.clearTimer) clearTimeout(this.clearTimer);
      this.onClose();
    });
  }

  private write(message: Record<string, unknown>): void {
    if (this.ws.readyState === this.ws.OPEN)
      this.ws.send(JSON.stringify({ ...message, streamId: this.streamId }));
  }

  private send(message: Record<string, unknown>): void {
    if (this.clearing) this.held.push(message);
    else this.write(message);
  }

  // The flush is confirmed (or took too long): send what was waiting.
  private release(): void {
    if (!this.clearing) return;
    this.clearing = false;
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = null;
    const held = this.held;
    this.held = [];
    for (const message of held) this.write(message);
  }

  private play(audio: Buffer): void {
    this.send({
      event: "playAudio",
      media: {
        contentType: "audio/x-mulaw",
        sampleRate: 8000,
        payload: audio.toString("base64"),
      },
    });
  }

  sendAudio(chunk: Buffer): void {
    this.pending = Buffer.concat([this.pending, chunk]);
    const whole = this.pending.length - (this.pending.length % FRAME_BYTES);
    if (!whole) return;
    this.play(this.pending.subarray(0, whole));
    this.pending = this.pending.subarray(whole);
  }

  // Only one event matters on a phone line: the end of a reply's audio, which
  // becomes a checkpoint Vobiz answers once the caller has heard it.
  sendEvent(event: ServerEvent): void {
    if (event.type !== "agent_audio_end") return;
    if (this.pending.length) {
      this.play(this.pending);
      this.pending = Buffer.alloc(0);
    }
    this.send({ event: "checkpoint", name: `${CHECKPOINT_PREFIX}${event.turn}` });
  }

  // The caller interrupted: drop what Vobiz has queued. Checkpoints for the
  // dropped audio are never answered, which is right, since it was not heard.
  clear(): void {
    this.pending = Buffer.alloc(0);
    this.held = [];
    this.write({ event: "clearAudio" });
    this.clearing = true;
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => this.release(), CLEAR_TIMEOUT_MS);
  }

  // Stopping the stream leaves Vobiz with no instructions after it, so it
  // hangs up; closing the socket alone could be taken for a dropped link.
  close(): void {
    this.held = [];
    this.clearing = false;
    this.write({ event: "stop" });
    this.ws.close();
  }
}
