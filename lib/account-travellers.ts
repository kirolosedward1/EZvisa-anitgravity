// Account → Saved travellers: the small facts shown under each name (passport expiry warning, under 18, how many
// applications). Pure, so the account page and its tests share them.

export type PassportState = "expired" | "soon" | "ok"

/** Months before expiry that we warn: Schengen wants the passport valid 3 months after the trip, so 6 leaves room. */
export const PASSPORT_WARN_MONTHS = 6

const day = (iso?: string | null) => {
  const v = (iso ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) ? new Date(`${v}T12:00:00Z`) : null
}
/** Today at noon UTC, so comparisons are by calendar day. */
const today = (now: Date) => new Date(`${now.toISOString().slice(0, 10)}T12:00:00Z`)

/** null when no expiry date is saved. */
export function passportState(expiry?: string | null, now = new Date()): PassportState | null {
  const end = day(expiry)
  if (!end) return null
  const from = today(now)
  if (end.getTime() < from.getTime()) return "expired"
  const warnFrom = new Date(from)
  warnFrom.setUTCMonth(warnFrom.getUTCMonth() + PASSPORT_WARN_MONTHS)
  return end.getTime() <= warnFrom.getTime() ? "soon" : "ok"
}

export function isUnder18(dateOfBirth?: string | null, now = new Date()): boolean {
  const born = day(dateOfBirth)
  if (!born) return false
  const adult = new Date(born)
  adult.setUTCFullYear(adult.getUTCFullYear() + 18)
  return adult.getTime() > today(now).getTime()
}

const nameOf = (v?: string | null) => (v ?? "").toLowerCase().replace(/\s+/g, " ").trim()

/** Applications whose traveller name matches (case and spacing ignored). Applications do not store a traveller id. */
export function applicationsFor(name: string, applicantNames: (string | null | undefined)[]): number {
  const key = nameOf(name)
  return key ? applicantNames.filter((n) => nameOf(n) === key).length : 0
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}
