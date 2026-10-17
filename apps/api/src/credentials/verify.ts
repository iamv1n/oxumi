import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { checkAccount } from "../telephony/exotel";
import { checkAccount as checkVobizAccount } from "../telephony/vobiz";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const TIMEOUT_MS = 12_000;

// Checks a key against its provider. Resolves to null when it works, or to a
// short reason when it does not. The language-model and ElevenLabs checks are
// free; Sarvam has no free endpoint, so it synthesises one short word.
export async function verifyKey(
  provider: string,
  secret: string,
  elevenLabsHost: string,
  options: Record<string, string> = {},
): Promise<string | null> {
  try {
    switch (provider) {
      case "anthropic":
        await new Anthropic({ apiKey: secret, timeout: TIMEOUT_MS, maxRetries: 0 }).models.list({ limit: 1 });
        return null;
      case "openai":
      case "gemini": {
        const client = new OpenAI({
          apiKey: secret,
          baseURL: provider === "gemini" ? GEMINI_BASE_URL : undefined,
          timeout: TIMEOUT_MS,
          maxRetries: 0,
        });
        await client.models.list();
        return null;
      }
      case "elevenlabs": {
        const res = await fetch(`https://${elevenLabsHost}/v1/user`, {
          headers: { "xi-api-key": secret },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return res.ok ? null : await reason(res);
      }
      case "sarvam": {
        const res = await fetch("https://api.sarvam.ai/text-to-speech/stream", {
          method: "POST",
          headers: { "api-subscription-key": secret, "Content-Type": "application/json" },
          body: JSON.stringify({ text: "ok", model: "bulbul:v3" }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        await res.body?.cancel();
        return res.ok ? null : await reason(res);
      }
      case "twilio": {
        const sid = options.accountSid ?? "";
        if (!sid) return "Add the Account SID first.";
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`,
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return res.ok ? null : await reason(res);
      }
      case "exotel": {
        if (!options.apiKey || !options.accountSid)
          return "Add the API key and Account SID first.";
        const res = await checkAccount({
          accountSid: options.accountSid,
          apiKey: options.apiKey,
          apiToken: secret,
          host: options.host || "api.exotel.com",
        });
        return res.ok ? null : await reason(res);
      }
      case "vobiz": {
        if (!options.authId) return "Add the Auth ID first.";
        const res = await checkVobizAccount({ authId: options.authId, authToken: secret });
        return res.ok ? null : await reason(res);
      }
      default:
        return "This provider cannot be tested.";
    }
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) return "The provider rejected this key.";
    return err instanceof Error ? err.message.slice(0, 200) : "The check failed.";
  }
}

async function reason(res: Response): Promise<string> {
  if (res.status === 401 || res.status === 403) return "The provider rejected this key.";
  const body = (await res.json().catch(() => null)) as {
    detail?: { message?: string };
    error?: { message?: string };
    message?: string;
  } | null;
  return (
    body?.detail?.message ?? body?.error?.message ?? body?.message ?? `The provider answered ${res.status}.`
  ).slice(0, 200);
}
