import type { ComplianceBlock, DoNotCallEntry } from "@/lib/api";

// Words and lists shared by the compliance sections.

export const REASON: Record<DoNotCallEntry["reason"], { label: string; color: string }> = {
  opted_out: { label: "Opted out on a call", color: "warning" },
  manual: { label: "Added by hand", color: "default" },
  imported: { label: "Imported", color: "processing" },
};

export const BLOCK: Record<ComplianceBlock["code"], string> = {
  do_not_call: "On the do-not-call list",
  outside_hours: "Outside calling hours",
  no_consent: "No consent recorded",
};

// Monday first, as most calling weeks are written. 0 is Sunday.
export const WEEKDAYS: { value: number; short: string }[] = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
];

// "Mon–Sat", "Mon, Wed, Fri–Sun", "Every day".
export function describeDays(days: number[]): string {
  const chosen = WEEKDAYS.filter((day) => days.includes(day.value));
  if (chosen.length === 7) return "Every day";
  if (chosen.length === 0) return "No days";
  const runs: string[][] = [];
  let previous = -2;
  for (const day of chosen) {
    const position = WEEKDAYS.indexOf(day);
    if (position === previous + 1) runs[runs.length - 1].push(day.short);
    else runs.push([day.short]);
    previous = position;
  }
  return runs
    .map((run) =>
      run.length > 2 ? `${run[0]}–${run[run.length - 1]}` : run.join(", "),
    )
    .join(", ");
}

// Every quarter hour, "00:00" to "23:45".
export const TIMES: string[] = Array.from({ length: 96 }, (_, i) => {
  const hours = String(Math.floor(i / 4)).padStart(2, "0");
  const minutes = String((i % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

// The browser's own zone, or undefined where it cannot be read.
export function ownTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

const FALLBACK_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

// Every IANA zone the browser knows, or a short list where it cannot say.
export function allTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return FALLBACK_ZONES;
  }
}

// The time now in a zone, e.g. "14:05 on Tue", or null for an unknown zone.
export function timeIn(zone: string): string | null {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        weekday: "short",
        hourCycle: "h23",
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    return `${parts.hour}:${parts.minute} on ${parts.weekday}`;
  } catch {
    return null;
  }
}
