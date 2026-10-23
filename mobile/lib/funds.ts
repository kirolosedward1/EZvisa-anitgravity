// Proof-of-funds rules per country. COPY of the website's lib/bank-requirements.ts (SCHENGEN_FUNDS_RULES and
// calculateRequiredFunds); the app must not import web code. scripts/country-check.ts fails if the copied numbers
// differ from the website file, and checks that fundsTotal() gives the website calculator's total for every country.
// Differences on purpose: a country without a rule returns null here (the website falls back to France), and the
// website's one-line notes are rewritten as plain sentences (NOTE below, translated in lib/ar.ts).
//
// SOURCE: none. The website file has no source in its comments or git history (added in 5571764, 2026-09-11).
// Until the owner confirms the numbers, FUNDS_CONFIRMED stays false and the country screen does not show them.
export const FUNDS_CONFIRMED = false;

export type FundsRule = { country: string; currency: "EUR" | "CHF"; dailyRateWithHotel: number; dailyRateNoHotel: number; minimumTotal?: number };

export const FUNDS_RULES: Record<string, FundsRule> = {
  spain: { country: "Spain", currency: "EUR", dailyRateWithHotel: 113.40, dailyRateNoHotel: 113.40, minimumTotal: 1020.60 },
  france: { country: "France", currency: "EUR", dailyRateWithHotel: 65, dailyRateNoHotel: 120 },
  italy: { country: "Italy", currency: "EUR", dailyRateWithHotel: 45, dailyRateNoHotel: 65, minimumTotal: 450 },
  germany: { country: "Germany", currency: "EUR", dailyRateWithHotel: 45, dailyRateNoHotel: 85 },
  switzerland: { country: "Switzerland", currency: "CHF", dailyRateWithHotel: 100, dailyRateNoHotel: 100 },
  netherlands: { country: "Netherlands", currency: "EUR", dailyRateWithHotel: 55, dailyRateNoHotel: 90 },
  greece: { country: "Greece", currency: "EUR", dailyRateWithHotel: 50, dailyRateNoHotel: 85, minimumTotal: 300 },
  austria: { country: "Austria", currency: "EUR", dailyRateWithHotel: 50, dailyRateNoHotel: 90 },
};

/** The website's note for each rule, in one plain sentence (English key; Arabic in lib/ar.ts). */
export const FUNDS_NOTE: Record<string, string> = {
  spain: "Spain asks for at least 9 days of the daily amount, even for a shorter trip.",
  france: "France asks for less per day when your hotel is booked.",
  italy: "Italy asks for a minimum total, then a daily amount for longer trips.",
  germany: "Germany expects enough per day for meals, local transport and small costs.",
  switzerland: "Switzerland sets the daily amount in Swiss francs.",
  netherlands: "The Netherlands asks for less per day when your hotel is booked.",
  greece: "Greece asks for a daily amount and a minimum total for short stays.",
  austria: "Austria looks at your whole trip; the daily amount is an average.",
};

/** Trip length limits for the stepper: a short stay is at most 90 days. */
export const TRIP_DAYS = { min: 1, max: 90, start: 10 } as const;

/** Same formula as the website's calculateRequiredFunds (lib/bank-requirements.ts), for one or more travellers.
 *  Returns null for a country without a rule (no estimate, no fallback). */
export function fundsTotal(slug: string, days: number, hasHotel = true, travelers = 1): number | null {
  const rule = FUNDS_RULES[slug.toLowerCase()];
  if (!rule) return null;
  const daily = hasHotel ? rule.dailyRateWithHotel : rule.dailyRateNoHotel;
  let total = daily * Math.max(1, days) * Math.max(1, travelers);
  if (rule.minimumTotal) total = Math.max(total, rule.minimumTotal * Math.max(1, travelers));
  return Math.round(total);
}
