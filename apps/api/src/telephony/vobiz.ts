import { createHmac, timingSafeEqual } from "node:crypto";

// Vobiz's REST calls and the two things it asks of this server: the XML that
// answers a call, and a check of its webhook signatures. Written from Vobiz's
// documentation (https://www.vobiz.ai/docs); authentication is two headers.

const API = "https://api.vobiz.ai/api/v1";

export interface VobizAccount {
  // Looks like MA_XXXXXXXX.
  authId: string;
  authToken: string;
  // The Vobiz number calls are placed from.
  fromNumber: string;
}

const headers = (account: Pick<VobizAccount, "authId" | "authToken">) => ({
  "X-Auth-ID": account.authId,
  "X-Auth-Token": account.authToken,
  "Content-Type": "application/json",
});

// Vobiz's paths are case-sensitive and end in a slash; the lowercase form
// answers 401.
const callsUrl = (account: Pick<VobizAccount, "authId">, callUuid?: string) =>
  `${API}/Account/${encodeURIComponent(account.authId)}/Call/${
    callUuid ? `${encodeURIComponent(callUuid)}/` : ""
  }`;

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as {
    error?: string | { message?: string };
    message?: string;
  } | null;
  const said =
    (typeof body?.error === "string" ? body.error : body?.error?.message) ?? body?.message;
  const known: Record<number, string> = {
    401: "the Auth ID or Auth token was rejected",
    402: "the account balance is too low to place the call",
    429: "the account's call rate or concurrent-call limit was reached",
  };
  return new Error(`Vobiz: ${said ?? known[res.status] ?? `request failed (${res.status})`}`);
}

// The body of the request that places a call. When the call is answered,
// Vobiz asks `answerUrl` what to do; when it ends, however it ends, it posts
// to `hangupUrl`.
export function dialRequest(
  account: VobizAccount,
  call: { to: string; answerUrl: string; hangupUrl: string; maxDurationSec: number },
): Record<string, string | number> {
  return {
    from: account.fromNumber,
    to: call.to,
    answer_url: call.answerUrl,
    answer_method: "POST",
    hangup_url: call.hangupUrl,
    hangup_method: "POST",
    // A hard stop a little after the flow's own limit, in case ours fails.
    time_limit: call.maxDurationSec + 30,
  };
}

// Places the call and returns Vobiz's call UUID. Accepted means queued, not
// answered: the rest arrives at the answer and hangup URLs.
export async function dial(
  account: VobizAccount,
  call: { to: string; answerUrl: string; hangupUrl: string; maxDurationSec: number },
): Promise<string> {
  const res = await fetch(callsUrl(account), {
    method: "POST",
    headers: headers(account),
    body: JSON.stringify(dialRequest(account, call)),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw await failure(res);
  const uuid = ((await res.json()) as { request_uuid?: string }).request_uuid;
  if (!uuid) throw new Error("Vobiz: the call was accepted without an id.");
  return uuid;
}

export async function hangUp(account: VobizAccount, callUuid: string): Promise<void> {
  const res = await fetch(callsUrl(account, callUuid), {
    method: "DELETE",
    headers: headers(account),
    signal: AbortSignal.timeout(15_000),
  });
  // 404: the call is already over, which is what was asked for.
  if (!res.ok && res.status !== 404) throw await failure(res);
}

// A harmless authenticated read, for testing a saved Auth ID and token. The
// answer carries the account's secret, so it is never read here.
export async function checkAccount(
  account: Pick<VobizAccount, "authId" | "authToken">,
): Promise<Response> {
  const res = await fetch(`${API}/auth/me`, {
    headers: headers(account),
    signal: AbortSignal.timeout(12_000),
  });
  await res.body?.cancel();
  return new Response(null, { status: res.status });
}

// ---- The media stream's address --------------------------------------------
// Vobiz hands nothing but the URL to the media socket, and its documentation
// carries a stream's credential as alphanumeric path segments. So the call's
// id and token travel in the path, hex-encoded where they would otherwise
// hold other characters.

export const STREAM_PATH = "/ws/vobiz";

export function streamPath(callId: string, token: string): string {
  return `${STREAM_PATH}/${callId.replace(/-/g, "")}/${Buffer.from(token).toString("hex")}`;
}

// The reverse: null unless the path is exactly one made by streamPath.
export function parseStreamPath(pathname: string): { callId: string; token: string } | null {
  const match = /^\/ws\/vobiz\/([0-9a-f]{32})\/((?:[0-9a-f]{2})+)\/?$/i.exec(pathname);
  if (!match) return null;
  const id = match[1]!.toLowerCase();
  return {
    callId: `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`,
    token: Buffer.from(match[2]!, "hex").toString(),
  };
}

const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// What the answer URL returns: connect the call's audio to our socket, both
// ways, as 8 kHz mu-law. keepCallAlive holds the call for as long as the
// stream lasts; when we stop the stream there is nothing after it, and Vobiz
// hangs up.
export function answerXml(streamUrl: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Response><Stream bidirectional="true" keepCallAlive="true" ' +
    `contentType="audio/x-mulaw;rate=8000">${xml(streamUrl)}</Stream></Response>`
  );
}

// ---- Callbacks --------------------------------------------------------------

// Why a call ended, in the words the rest of the server uses: "busy",
// "no-answer", "canceled", "failed" or "completed". Read from the hangup
// callback's cause code, falling back to its cause name.
export function hangupStatus(body: Record<string, unknown>): string {
  const code = Number(body.HangupCauseCode);
  if (code === 3010 || code === 3100) return "busy";
  if (code === 3000 || code === 6010) return "no-answer";
  if (code === 1000) return "canceled";
  if (code === 4000 || code === 4010 || code === 6000) return "completed";
  if (Number.isFinite(code) && code > 0) return "failed";
  const cause = String(body.HangupCause ?? "").toUpperCase();
  if (cause === "USER_BUSY") return "busy";
  if (cause === "NO_ANSWER" || cause === "NO_USER_RESPONSE") return "no-answer";
  if (cause === "ORIGINATOR_CANCEL") return "canceled";
  return "completed";
}

type Headers = Record<string, string | string[] | undefined>;
const header = (headers: Headers, name: string): string => {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? "";
};

// Checks Vobiz's signature on a callback: HMAC-SHA256 of the callback URL
// (without its query) and a nonce, keyed by the account's auth token. Vobiz
// only signs callbacks for accounts that have set it up, so the answer is
// null when the request carries no signature at all.
export function signatureValid(url: string, authToken: string, headers: Headers): boolean | null {
  const base = url.split("?")[0]!;
  const schemes = [
    { signature: "x-vobiz-signature-v3", nonce: "x-vobiz-signature-v3-nonce", join: "." },
    { signature: "x-vobiz-signature-v2", nonce: "x-vobiz-signature-v2-nonce", join: "" },
  ];
  for (const scheme of schemes) {
    const given = header(headers, scheme.signature);
    if (!given) continue;
    const expected = createHmac("sha256", authToken)
      .update(base + scheme.join + header(headers, scheme.nonce))
      .digest("base64");
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  return null;
}
