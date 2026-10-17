import type { Channel } from "../calls/call.entity";

// What a call costs the customer. Voice and phone calls are charged per
// started minute of talk; text conversations per call. A phone call that was
// never answered is free.
//
// These are placeholder list prices in rupees, to be replaced by real ones
// before anyone is invoiced; each can be overridden with an environment
// variable (PRICE_PHONE_PER_MIN and so on).
export const CURRENCY = "INR";

export interface Rates {
  phonePerMinute: number;
  browserVoicePerMinute: number;
  textPerCall: number;
}

const rate = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const RATES: Rates = {
  phonePerMinute: rate("PRICE_PHONE_PER_MIN", 6),
  browserVoicePerMinute: rate("PRICE_BROWSER_VOICE_PER_MIN", 3),
  textPerCall: rate("PRICE_TEXT_PER_CALL", 0.5),
};

export interface BillableCall {
  channel: Channel;
  startedAt: Date;
  endedAt: Date | null;
  // Turns taken; zero means nobody ever spoke.
  turns: number;
}

// Whole minutes charged for a call, rounded up; zero for text calls and for
// calls where nobody spoke.
export function billableMinutes(call: BillableCall): number {
  if (call.channel === "browser_text" || call.channel === "api_text" || !call.turns) return 0;
  if (!call.endedAt) return 0;
  const seconds = Math.max(0, (+call.endedAt - +call.startedAt) / 1000);
  return Math.max(1, Math.ceil(seconds / 60));
}

export function costOf(call: BillableCall, rates: Rates = RATES): number {
  if (call.channel === "browser_text" || call.channel === "api_text")
    return call.turns ? rates.textPerCall : 0;
  const perMinute = call.channel === "phone" ? rates.phonePerMinute : rates.browserVoicePerMinute;
  return billableMinutes(call) * perMinute;
}
