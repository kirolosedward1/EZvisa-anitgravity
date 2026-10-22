// Calendar dates as the website stores them: "YYYY-MM-DD" strings (web <input type=date> / CustomDatePicker,
// visa_applications.entry_date / exit_date / date_of_birth). All maths here works on the year/month/day numbers
// (via Date.UTC), never on `new Date("YYYY-MM-DD")` (UTC midnight) mixed with local times, so a date can't move by a
// day in UAE (UTC+4) or any other time zone. "Today" is the phone's own calendar date.

export type IsoDate = string;
const DAY = 864e5;
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Real calendar date in YYYY-MM-DD form (rejects 2026-02-30, 2026-13-01, "", times). */
export function isIsoDate(s: unknown): s is IsoDate {
  if (typeof s !== "string") return false;
  const m = RE.exec(s); if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-12
const parts = (s: IsoDate) => s.split("-").map(Number) as [number, number, number];
const pad = (n: number) => String(n).padStart(2, "0");
const fromUtc = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const dayNo = (s: IsoDate) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d) / DAY; };

/** The local calendar date of a JS Date (what a native picker returns, or "now"). */
export const toIso = (d: Date): IsoDate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** A local Date at noon for pickers/formatting: noon keeps the same calendar day in every time zone and DST change. */
export const fromIso = (s: IsoDate): Date => { const [y, m, d] = parts(s); return new Date(y, m - 1, d, 12); };
export const todayIso = (now: Date = new Date()): IsoDate => toIso(now);

export const addDays = (s: IsoDate, n: number): IsoDate => fromUtc((dayNo(s) + n) * DAY);
/** Calendar months, clamped to the month's last day: 30 Nov + 3 months = 28 Feb (29 Feb in a leap year), 31 Aug + 3 = 30 Nov. */
export function addMonths(s: IsoDate, n: number): IsoDate {
  const [y, m, d] = parts(s);
  const total = y * 12 + (m - 1) + n; const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}
export const addYears = (s: IsoDate, n: number) => addMonths(s, n * 12);
/** Whole days from a to b (b - a). Same result as the website server's (end - start) / 86400000 on these strings. */
export const daysBetween = (a: IsoDate, b: IsoDate) => dayNo(b) - dayNo(a);
/** ISO strings compare correctly as text; these read better at call sites. */
export const isBefore = (a: IsoDate, b: IsoDate) => a < b;
export const isAfter = (a: IsoDate, b: IsoDate) => a > b;

/** Month grid helpers for the range picker. `firstWeekday`: 1 = Sunday … 7 = Saturday (expo-localization Weekday). */
export const monthOf = (s: IsoDate) => s.slice(0, 7); // "YYYY-MM"
export const firstOfMonth = (ym: string): IsoDate => `${ym}-01`;
export const addMonthsYm = (ym: string, n: number) => monthOf(addMonths(firstOfMonth(ym), n));
/** Weekday of a date, 1 = Sunday … 7 = Saturday. */
export const weekday = (s: IsoDate) => { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 1; };
/** The month as rows of 7 cells (null = padding before the 1st / after the last day). */
export function monthGrid(ym: string, firstWeekday = 1): (IsoDate | null)[][] {
  const first = firstOfMonth(ym); const [y, m] = parts(first);
  const lead = (weekday(first) - firstWeekday + 7) % 7;
  const cells: (IsoDate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(y, m) }, (_, i) => `${ym}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
}

/** BCP 47 tag for showing dates: the phone's tag when its language is the app language, else the app language + the phone's
 *  region (an English UI on an "fr-FR" phone shows "22 October 2026", not French month names; Arabic UI uses "ar-AE" etc.). */
export function dateLocaleTag(lang: string, deviceTag?: string | null, region?: string | null): string {
  const tag = deviceTag || "en-GB";
  if (tag.toLowerCase().split("-")[0] === lang) return tag;
  return region ? `${lang}-${region}` : lang === "ar" ? "ar" : "en-GB";
}
