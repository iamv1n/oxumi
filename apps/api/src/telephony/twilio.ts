// The two Twilio REST calls a phone call needs. Kept dependency-free: the
// account SID and auth token authenticate with HTTP Basic.

export interface TwilioAccount {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const auth = (account: TwilioAccount) =>
  `Basic ${Buffer.from(`${account.accountSid}:${account.authToken}`).toString("base64")}`;

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return new Error(`Twilio: ${body?.message ?? `request failed (${res.status})`}`);
}

// Places the call. When it is answered, Twilio opens a media stream to
// `streamUrl` and passes `params` along; changes of call status are posted
// to `statusUrl`. Returns Twilio's call SID.
export async function dial(
  account: TwilioAccount,
  call: {
    to: string;
    streamUrl: string;
    statusUrl: string;
    params: Record<string, string>;
    maxDurationSec: number;
  },
): Promise<string> {
  const parameters = Object.entries(call.params)
    .map(([name, value]) => `<Parameter name="${xml(name)}" value="${xml(value)}"/>`)
    .join("");
  const twiml = `<Response><Connect><Stream url="${xml(call.streamUrl)}">${parameters}</Stream></Connect></Response>`;

  const form = new URLSearchParams({
    To: call.to,
    From: account.fromNumber,
    Twiml: twiml,
    StatusCallback: call.statusUrl,
    StatusCallbackMethod: "POST",
    // A hard stop a little after the flow's own limit, in case ours fails.
    TimeLimit: String(call.maxDurationSec + 30),
  });
  for (const event of ["initiated", "ringing", "answered", "completed"])
    form.append("StatusCallbackEvent", event);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${account.accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: auth(account),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw await failure(res);
  return ((await res.json()) as { sid: string }).sid;
}

// Replaces what a live call is doing: the media stream ends and Twilio dials
// `to`, playing `whisperUrl`'s message to whoever answers before putting the
// caller through. If nobody answers, the caller hears a short apology.
export async function transfer(
  account: TwilioAccount,
  callSid: string,
  call: { to: string; whisperUrl: string },
): Promise<void> {
  const twiml =
    `<Response><Dial callerId="${xml(account.fromNumber)}" timeout="25" answerOnBridge="true">` +
    `<Number url="${xml(call.whisperUrl)}" method="POST">${xml(call.to)}</Number></Dial>` +
    "<Say>Sorry, nobody could take your call right now. We will call you back. Goodbye.</Say></Response>";
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${account.accountSid}/Calls/${callSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: auth(account),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Twiml: twiml }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) throw await failure(res);
}

// What the person taking a transferred call hears before being connected.
export function whisperXml(summary: string): string {
  return `<Response><Say>${xml(summary)}</Say><Pause length="1"/></Response>`;
}

export async function hangUp(account: TwilioAccount, callSid: string): Promise<void> {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${account.accountSid}/Calls/${callSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: auth(account),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Status: "completed" }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw await failure(res);
}
