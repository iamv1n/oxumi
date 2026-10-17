// Money and month formatting for the Billing page (and the activity log).

// "₹1,234.50": always two decimals.
export function formatMoney(amount: number, currency = "INR"): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// The current month in UTC, "YYYY-MM", which is how billing months are cut.
export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

// This month and the `count - 1` before it, newest first.
export function recentMonths(count: number, now = new Date()): string[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(year, month - i, 1)).toISOString().slice(0, 7),
  );
}

// "October 2026".
export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "14 Oct".
export function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export const plural = (n: number, word: string) =>
  `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
