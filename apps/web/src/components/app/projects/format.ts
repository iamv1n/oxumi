// Small formatters shared by the project pages.

export const plural = (count: number, word: string): string =>
  `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

// A calendar date, e.g. "12 Oct 2026".
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "3 min ago", "yesterday", falling back to a date after a week.
export function formatRelative(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((now - +new Date(iso)) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}
