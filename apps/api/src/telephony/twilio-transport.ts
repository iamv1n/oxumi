import type WebSocket from "ws";
import type { ServerEvent, Transport } from "../runtime/transport";

const MARK_PREFIX = "turn-";

// A phone line, seen through Twilio's media stream: 8 kHz mu-law audio in
// both directions, with "marks" to learn when the caller has heard a reply.
export class TwilioTransport implements Transport {
  readonly format = "ulaw_8000" as const;
  onAudio: (chunk: Buffer) => void = () => {};
  onText: (text: string) => void = () => {};
  onPlaybackDone: (turn: number) => void = () => {};
  onClose: () => void = () => {};

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
    if (this.ws.readyState === this.ws.OPEN)
      this.ws.send(JSON.stringify({ ...message, streamSid: this.streamSid }));
  }

  sendAudio(chunk: Buffer): void {
    this.send({ event: "media", media: { payload: chunk.toString("base64") } });
  }

  // Only one event matters on a phone line: the end of a reply's audio, which
  // becomes a mark Twilio echoes once the caller has actually heard it.
  sendEvent(event: ServerEvent): void {
    if (event.type === "agent_audio_end")
      this.send({ event: "mark", mark: { name: `${MARK_PREFIX}${event.turn}` } });
  }

  clear(): void {
    this.send({ event: "clear" });
  }

  // Closing the stream ends the <Connect>, and with no further instructions
  // Twilio hangs up.
  close(): void {
    this.ws.close();
  }
}
