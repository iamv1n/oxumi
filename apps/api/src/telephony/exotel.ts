// Exotel's REST calls. Authentication is HTTP Basic with the API key and
// token; the host depends on the account's region.

export interface ExotelAccount {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  // The ExoPhone calls are placed from.
  callerId: string;
  // The Exotel app (call flow) whose Voicebot step connects to this server.
  appId: string;
  // api.exotel.com (Singapore) or api.in.exotel.com (Mumbai).
  host: string;
}

const auth = (account: ExotelAccount) =>
  `Basic ${Buffer.from(`${account.apiKey}:${account.apiToken}`).toString("base64")}`;

const base = (account: ExotelAccount) =>
  `https://${account.host}/v1/Accounts/${account.accountSid}`;

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as {
    RestException?: { Message?: string };
  } | null;
  return new Error(
    `Exotel: ${body?.RestException?.Message ?? `request failed (${res.status})`}`,
  );
}

// Calls the number and, once answered, runs the account's app, whose Voicebot
// step opens the audio stream to this server. Returns Exotel's call SID.
export async function dial(
  account: ExotelAccount,
  call: { to: string; statusUrl: string; maxDurationSec: number },
): Promise<string> {
  const res = await fetch(`${base(account)}/Calls/connect.json`, {
    method: "POST",
    headers: {
      Authorization: auth(account),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: call.to,
      CallerId: account.callerId,
      Url: `http://my.exotel.com/${account.accountSid}/exoml/start_voice/${account.appId}`,
      CallType: "trans",
      StatusCallback: call.statusUrl,
      TimeLimit: String(call.maxDurationSec + 30),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw await failure(res);
  const sid = ((await res.json()) as { Call?: { Sid?: string } }).Call?.Sid;
  if (!sid) throw new Error("Exotel: the call was accepted without an id.");
  return sid;
}

// Exotel's status callback arrives as multipart form data, so instead of
// parsing it the call's status is read back from the API.
export async function callStatus(account: ExotelAccount, callSid: string): Promise<string> {
  const res = await fetch(`${base(account)}/Calls/${callSid}.json`, {
    headers: { Authorization: auth(account) },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw await failure(res);
  return ((await res.json()) as { Call?: { Status?: string } }).Call?.Status ?? "";
}

export async function checkAccount(account: Pick<ExotelAccount, "accountSid" | "apiKey" | "apiToken" | "host">): Promise<Response> {
  return fetch(`https://${account.host}/v1/Accounts/${account.accountSid}.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${account.apiKey}:${account.apiToken}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(12_000),
  });
}
