// Trip countdown from the real entry/exit dates on the application.
/** "In 52 days" / "Today" / "On your trip" / null when the dates are unknown or past. */
export function countdown(entry: string | null, exit: string | null, t: (s: string, v?: Record<string, string | number>) => string): string | null {
  if (!entry) return null;
  const day = (s: string) => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const now = new Date(); const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((day(entry) - today) / 864e5);
  if (n > 1) return t("In {n} days", { n }); if (n === 1) return t("Tomorrow"); if (n === 0) return t("Today");
  if (exit && day(exit) >= today) return t("On your trip");
  return null;
}

