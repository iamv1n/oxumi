import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type WebSocket from "ws";
import { ExotelTransport } from "../src/telephony/exotel-transport";
import { TwilioTransport } from "../src/telephony/twilio-transport";
import { rewriteVobizUrl } from "../src/telephony/phone-ws.adapter";
import {
  answerXml,
  dialRequest,
  hangupStatus,
  parseStreamPath,
  signatureValid,
  streamPath,
} from "../src/telephony/vobiz";
import { VobizTransport } from "../src/telephony/vobiz-transport";
import { sign } from "../src/webhooks/signature";

class FakeSocket extends EventEmitter {
  OPEN = 1;
  readyState = 1;
  sent: any[] = [];
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
    this.emit("close");
  }
  twilio(message: object) {
    this.emit("message", Buffer.from(JSON.stringify(message)));
  }
}

test("phone transport maps Twilio's stream protocol both ways", () => {
  const socket = new FakeSocket();
  const transport = new TwilioTransport(socket as unknown as WebSocket, "MZ123");
  const heard: Buffer[] = [];
  const played: number[] = [];
  let closed = false;
  transport.onAudio = (chunk) => heard.push(chunk);
  transport.onPlaybackDone = (turn) => played.push(turn);
  transport.onClose = () => (closed = true);

  // Caller audio in.
  socket.twilio({ event: "media", media: { payload: Buffer.from([1, 2, 3]).toString("base64") } });
  assert.deepEqual([...heard[0]!], [1, 2, 3]);

  // Agent audio out, then the end-of-reply marker.
  transport.sendAudio(Buffer.from([9, 8]));
  transport.sendEvent({ type: "agent_audio_end", turn: 4 });
  // Events that only matter to a browser are not sent down a phone line.
  transport.sendEvent({ type: "agent_text", turn: 4, delta: "hello" });
  assert.deepEqual(socket.sent, [
    { event: "media", media: { payload: Buffer.from([9, 8]).toString("base64") }, streamSid: "MZ123" },
    { event: "mark", mark: { name: "turn-4" }, streamSid: "MZ123" },
  ]);

  // Twilio echoes the mark once the caller has heard the reply.
  socket.twilio({ event: "mark", mark: { name: "turn-4" } });
  assert.deepEqual(played, [4]);

  // The caller interrupts: queued audio is dropped.
  transport.clear();
  assert.deepEqual(socket.sent.at(-1), { event: "clear", streamSid: "MZ123" });

  // The caller hangs up.
  socket.twilio({ event: "stop" });
  assert.equal(closed, true);
});

test("webhook signature can be verified by the receiver", () => {
  const body = JSON.stringify({ id: "d1", event: "call.completed" });
  const header = sign("whsec_test", 1_800_000_000, body);
  const [t, v1] = header.split(",").map((part) => part.split("=")[1]!);
  assert.equal(t, "1800000000");
  assert.equal(v1, createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex"));
  // A different body or secret does not verify.
  assert.notEqual(sign("whsec_test", 1_800_000_000, body + " "), header);
  assert.notEqual(sign("whsec_other", 1_800_000_000, body), header);
});

test("Exotel transport sends 16-bit audio in whole frames and pads the tail", () => {
  const socket = new FakeSocket();
  const transport = new ExotelTransport(socket as unknown as WebSocket, "ex-1");
  const played: number[] = [];
  transport.onPlaybackDone = (turn) => played.push(turn);

  // 5000 bytes arrive: one full 3200-byte piece goes out, 1800 wait.
  transport.sendAudio(Buffer.alloc(5000, 1));
  assert.equal(socket.sent.length, 1);
  assert.equal(Buffer.from(socket.sent[0].media.payload, "base64").length, 3200);
  assert.equal(socket.sent[0].stream_sid, "ex-1");

  // End of the reply: the rest is padded to a multiple of 320, then a mark.
  transport.sendEvent({ type: "agent_audio_end", turn: 2 });
  const tail = Buffer.from(socket.sent[1].media.payload, "base64");
  assert.equal(tail.length, 1920);
  assert.equal(tail.length % 320, 0);
  assert.equal(tail[1799], 1);
  assert.equal(tail[1800], 0);
  assert.deepEqual(socket.sent[2].mark, { name: "turn-2" });
  assert.deepEqual(socket.sent.map((m: any) => m.sequence_number), [1, 2, 3]);

  socket.twilio({ event: "mark", stream_sid: "ex-1", mark: { name: "turn-2" } });
  assert.deepEqual(played, [2]);

  // An interruption drops audio that has not been sent yet.
  transport.sendAudio(Buffer.alloc(100, 1));
  transport.clear();
  transport.sendEvent({ type: "agent_audio_end", turn: 3 });
  assert.equal(socket.sent.at(-2).event, "clear");
  assert.equal(socket.sent.at(-1).event, "mark");
});

// ---- Vobiz -----------------------------------------------------------------
// Message shapes are copied from Vobiz's documentation
// (https://www.vobiz.ai/docs/xml/stream/stream-events). No real call is made.

const STREAM_ID = "c4dfd815-a92a-4140-ab85-5ff28c004116";
const mulaw = (payload: string) => ({
  event: "playAudio",
  media: { contentType: "audio/x-mulaw", sampleRate: 8000, payload },
  streamId: STREAM_ID,
});

test("phone transport maps Vobiz's stream protocol both ways", () => {
  const socket = new FakeSocket();
  const transport = new VobizTransport(socket as unknown as WebSocket, STREAM_ID);
  const heard: Buffer[] = [];
  const played: number[] = [];
  let closed = false;
  transport.onAudio = (chunk) => heard.push(chunk);
  transport.onPlaybackDone = (turn) => played.push(turn);
  transport.onClose = () => (closed = true);
  assert.equal(transport.format, "ulaw_8000");

  // Caller audio in, as Vobiz frames it. Audio on another track is not the caller.
  socket.twilio({
    sequenceNumber: 2,
    streamId: STREAM_ID,
    event: "media",
    media: {
      track: "inbound",
      timestamp: "1778597597091",
      chunk: 2,
      payload: Buffer.from([1, 2, 3]).toString("base64"),
    },
    extra_headers: "{}",
  });
  socket.twilio({
    event: "media",
    media: { track: "outbound", payload: Buffer.from([7]).toString("base64") },
  });
  assert.equal(heard.length, 1);
  assert.deepEqual([...heard[0]!], [1, 2, 3]);

  // Agent audio out in whole 20 ms frames (160 bytes of mu-law); the rest
  // waits for more, or for the end of the reply.
  const reply = Buffer.alloc(400, 5);
  transport.sendAudio(reply);
  assert.deepEqual(socket.sent, [mulaw(reply.subarray(0, 320).toString("base64"))]);
  transport.sendEvent({ type: "agent_audio_end", turn: 4 });
  // Events that only matter to a browser are not sent down a phone line.
  transport.sendEvent({ type: "agent_text", turn: 4, delta: "hello" });
  assert.deepEqual(socket.sent.slice(1), [
    mulaw(reply.subarray(320).toString("base64")),
    { event: "checkpoint", name: "turn-4", streamId: STREAM_ID },
  ]);

  // Vobiz answers the checkpoint once the caller has heard the reply.
  socket.twilio({ event: "playedStream", name: "turn-4" });
  socket.twilio({ event: "playedStream", name: "someone-else" });
  assert.deepEqual(played, [4]);

  // The call ends: Vobiz sends no "stop", the socket just closes.
  socket.close();
  assert.equal(closed, true);
});

test("Vobiz transport holds new audio until a flush is confirmed", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const socket = new FakeSocket();
  const transport = new VobizTransport(socket as unknown as WebSocket, STREAM_ID);

  // The caller interrupts mid-reply: the queue is dropped, with what was
  // buffered here.
  transport.sendAudio(Buffer.alloc(100, 1));
  transport.clear();
  assert.deepEqual(socket.sent, [{ event: "clearAudio", streamId: STREAM_ID }]);

  // The next reply waits: sent before the flush is confirmed, it could be
  // dropped with the old audio.
  const next = Buffer.alloc(160, 2);
  transport.sendAudio(next);
  transport.sendEvent({ type: "agent_audio_end", turn: 5 });
  assert.equal(socket.sent.length, 1);
  socket.twilio({ sequenceNumber: 0, event: "clearedAudio", streamId: STREAM_ID });
  assert.deepEqual(socket.sent.slice(1), [
    mulaw(next.toString("base64")),
    { event: "checkpoint", name: "turn-5", streamId: STREAM_ID },
  ]);

  // If the confirmation never comes, the audio goes out after a short wait.
  transport.clear();
  transport.sendAudio(next);
  assert.equal(socket.sent.length, 4);
  t.mock.timers.tick(400);
  assert.deepEqual(socket.sent.at(-1), mulaw(next.toString("base64")));

  // Hanging up stops the stream, which ends the call, then closes the socket.
  transport.close();
  assert.deepEqual(socket.sent.at(-1), { event: "stop", streamId: STREAM_ID });
  assert.equal(socket.readyState, 3);
});

test("Vobiz requests, stream address, hangup reasons and signatures", () => {
  // The call request, as the Make Call API documents it.
  assert.deepEqual(
    dialRequest(
      { authId: "MA_TEST0000", authToken: "not-a-real-token", fromNumber: "+918071387423" },
      {
        to: "+919876543210",
        answerUrl: "https://calls.example.com/telephony/vobiz/answer?callId=c&token=t",
        hangupUrl: "https://calls.example.com/telephony/vobiz/status?callId=c&token=t",
        maxDurationSec: 240,
      },
    ),
    {
      from: "+918071387423",
      to: "+919876543210",
      answer_url: "https://calls.example.com/telephony/vobiz/answer?callId=c&token=t",
      answer_method: "POST",
      hangup_url: "https://calls.example.com/telephony/vobiz/status?callId=c&token=t",
      hangup_method: "POST",
      time_limit: 270,
    },
  );

  // The call's id and token ride in the stream's path, letters and digits only.
  const callId = "9a0e0208-d01a-4572-9a04-fe583a05ac53";
  const token = "aB-_9xYz";
  const path = streamPath(callId, token);
  assert.match(path, /^\/ws\/vobiz\/[0-9a-f]{32}\/[0-9a-f]+$/);
  assert.deepEqual(parseStreamPath(path), { callId, token });
  assert.equal(parseStreamPath("/ws/vobiz"), null);
  assert.equal(parseStreamPath("/ws/vobiz/not-hex/00"), null);
  // The socket adapter turns that path into the gateway's own, with a query.
  const rewritten = new URL(rewriteVobizUrl(path), "http://localhost");
  assert.equal(rewritten.pathname, "/ws/vobiz");
  assert.equal(rewritten.searchParams.get("callId"), callId);
  assert.equal(rewritten.searchParams.get("token"), token);
  assert.equal(rewriteVobizUrl("/ws/phone?x=1"), "/ws/phone?x=1");

  // The answer: a two-way mu-law stream that holds the call open.
  assert.equal(
    answerXml(`wss://calls.example.com${path}`),
    '<?xml version="1.0" encoding="UTF-8"?><Response><Stream bidirectional="true" ' +
      'keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">' +
      `wss://calls.example.com${path}</Stream></Response>`,
  );

  // Hangup causes, by Vobiz's codes.
  assert.equal(hangupStatus({ Event: "Hangup", HangupCauseCode: "3010" }), "busy");
  assert.equal(hangupStatus({ HangupCauseCode: 3000 }), "no-answer");
  assert.equal(hangupStatus({ HangupCauseCode: "6010" }), "no-answer");
  assert.equal(hangupStatus({ HangupCauseCode: "1000" }), "canceled");
  assert.equal(hangupStatus({ HangupCauseCode: "2000" }), "failed");
  assert.equal(hangupStatus({ HangupCauseCode: "4010" }), "completed");
  assert.equal(hangupStatus({ CallStatus: "completed", HangupCause: "NORMAL_CLEARING" }), "completed");
  assert.equal(hangupStatus({ HangupCause: "USER_BUSY" }), "busy");

  // Signatures: HMAC-SHA256 of the URL without its query, then the nonce.
  const url = "https://calls.example.com/telephony/vobiz/status?callId=c&token=t";
  const base = "https://calls.example.com/telephony/vobiz/status";
  const nonce = "12345678901234567890";
  const v3 = createHmac("sha256", "not-a-real-token").update(`${base}.${nonce}`).digest("base64");
  const v2 = createHmac("sha256", "not-a-real-token").update(`${base}${nonce}`).digest("base64");
  assert.equal(
    signatureValid(url, "not-a-real-token", {
      "x-vobiz-signature-v3": v3,
      "x-vobiz-signature-v3-nonce": nonce,
    }),
    true,
  );
  assert.equal(
    signatureValid(url, "not-a-real-token", {
      "x-vobiz-signature-v2": v2,
      "x-vobiz-signature-v2-nonce": nonce,
    }),
    true,
  );
  assert.equal(
    signatureValid(url, "another-token", {
      "x-vobiz-signature-v3": v3,
      "x-vobiz-signature-v3-nonce": nonce,
    }),
    false,
  );
  // Vobiz does not sign for every account.
  assert.equal(signatureValid(url, "not-a-real-token", {}), null);
});
