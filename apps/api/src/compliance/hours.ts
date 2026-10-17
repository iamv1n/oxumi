// Calling-hours rules and the clock arithmetic behind them. Kept free of the
// database so it can be tested on its own.

export interface CallingHours {
  enabled: boolean;
  // "HH:MM", local to the project's time zone. end is exclusive.
  start: string;
  end: string;
  // 0 is Sunday.
  days: number[];
}

export const DEFAULT_HOURS: CallingHours = {
  enabled: true,
  start: "09:00",
  end: "21:00",
  days: [1, 2, 3, 4, 5, 6],
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

// The weekday and minute of the day at `at` in `timezone`.
export function localClock(at: Date, timezone: string): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: DAY_NAMES.indexOf(get("weekday")),
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function withinHours(hours: CallingHours, timezone: string, at: Date): boolean {
  if (!hours.enabled) return true;
  const { day, minute } = localClock(at, timezone);
  const start = minutes(hours.start);
  const end = minutes(hours.end);
  // A window such as 21:00 to 06:00 runs past midnight.
  return start <= end
    ? hours.days.includes(day) && minute >= start && minute < end
    : (hours.days.includes(day) && minute >= start) ||
        (hours.days.includes((day + 6) % 7) && minute < end);
}

// The next moment calls are allowed, looked for a minute at a time over the
// coming week; null if the rules never allow a call.
export function nextWindow(hours: CallingHours, timezone: string, from: Date): Date | null {
  const start = new Date(Math.ceil(+from / 60_000) * 60_000);
  for (let step = 0; step <= 8 * 24 * 60; step++) {
    const at = new Date(+start + step * 60_000);
    if (withinHours(hours, timezone, at)) return at;
  }
  return null;
}

export function describeHours(hours: CallingHours, timezone: string): string {
  if (!hours.enabled) return "any time";
  const days = [...hours.days].sort().map((d) => DAY_NAMES[d]).join(", ");
  return `${hours.start} to ${hours.end} ${timezone}, ${days || "no days"}`;
}
