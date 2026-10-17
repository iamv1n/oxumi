// Short relative times for key activity: "5 min ago", "in 3 days".
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = +new Date(iso) - now;
  const abs = Math.abs(diff);
  const units: [number, string][] = [
    [86_400_000, "day"],
    [3_600_000, "hour"],
    [60_000, "min"],
  ];
  for (const [ms, name] of units) {
    if (abs >= ms) {
      const n = Math.round(abs / ms);
      const label = name === "min" ? "min" : n === 1 ? name : `${name}s`;
      return diff < 0 ? `${n} ${label} ago` : `in ${n} ${label}`;
    }
  }
  return diff < 0 ? "just now" : "in under a minute";
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
