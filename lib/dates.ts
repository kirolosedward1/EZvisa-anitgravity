export const INVALID_DATE_MESSAGE = "Enter a valid date."
export const RETURN_AFTER_DEPARTURE = "Return date must be after departure date."

/** Accepts YYYY-MM-DD or D/M/YYYY. Rejects impossible days such as 31 Feb. */
export function parseCalendarDate(value?: string | null): { iso: string } | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  const dmy = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(trimmed)
  let year: number
  let month: number
  let day: number
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (dmy) {
    day = Number(dmy[1])
    month = Number(dmy[2])
    year = Number(dmy[3])
  } else {
    return null
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  const pad = (n: number) => String(n).padStart(2, "0")
  return { iso: `${year}-${pad(month)}-${pad(day)}` }
}

export function isValidCalendarDate(value?: string | null): boolean {
  return parseCalendarDate(value) !== null
}

export function datesInOrder(start?: string | null, end?: string | null): boolean {
  const a = parseCalendarDate(start)
  const b = parseCalendarDate(end)
  if (!a || !b) return false
  return b.iso > a.iso
}

const DAY_MS = 86_400_000

/** Inclusive Schengen stay: both the arrival day and the departure day count.
 *  11 Nov through 5 Dec is 25 days. A 7-day stay ends 6 days after it starts. */
export function schengenStayDays(start?: string | null, end?: string | null): number {
  const a = parseCalendarDate(start)
  const b = parseCalendarDate(end)
  if (!a || !b) return 0
  const diff = Math.round((Date.parse(`${b.iso}T12:00:00Z`) - Date.parse(`${a.iso}T12:00:00Z`)) / DAY_MS)
  return diff + 1
}

/** End date for an inclusive stay. 7 days → +6, 14 → +13, 21 → +20, 30 → +29. */
export function schengenEndDate(start?: string | null, stayDays?: number | null): string | null {
  const parsed = parseCalendarDate(start)
  if (!parsed || !stayDays || stayDays < 1) return null
  const [year, month, day] = parsed.iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + (stayDays - 1)))
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export const TRIP_LENGTHS = [
  { days: 7, en: "1 week", ar: "أسبوع" },
  { days: 14, en: "2 weeks", ar: "أسبوعان" },
  { days: 21, en: "3 weeks", ar: "3 أسابيع" },
  { days: 30, en: "1 month", ar: "شهر" },
] as const

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
export const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
export const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const WEEKDAYS_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]

/** '11 Nov 2026'. Fixed English abbreviations so server and browser match. */
export function formatDisplayDate(value?: string | null): string {
  const parsed = parseCalendarDate(value)
  if (!parsed) return ""
  const [year, month, day] = parsed.iso.split("-").map(Number)
  return `${day} ${MONTHS_EN[month - 1]} ${year}`
}

/** '11 Nov'. Same fixed abbreviations, without the year. */
export function formatShortDate(value?: string | null): string {
  const parsed = parseCalendarDate(value)
  if (!parsed) return ""
  const [, month, day] = parsed.iso.split("-").map(Number)
  return `${day} ${MONTHS_EN[month - 1]}`
}

export function formatTravelMonth(value?: string | null): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value?.trim() ?? "")
  if (!match) return ""
  const month = Number(match[2])
  if (month < 1 || month > 12) return ""
  return `${MONTHS_LONG[month - 1]} ${match[1]}`
}

/** Arabic month name for a YYYY-MM travel month, for example نوفمبر 2026. */
export function formatTravelMonthAr(value?: string | null): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value?.trim() ?? "")
  if (!match) return ""
  const month = Number(match[2])
  if (month < 1 || month > 12) return ""
  return `${MONTHS_AR[month - 1]} ${match[1]}`
}

/** Page-language date. Arabic keeps Western digits, for example 11 نوفمبر. */
export function formatPageDate(value: string, arabic: boolean, withYear = false) {
  const parsed = parseCalendarDate(value)
  if (!parsed) return value
  const [year, month, day] = parsed.iso.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: arabic ? "long" : "short",
    timeZone: "UTC",
    numberingSystem: "latn",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date)
}

export function upcomingTravelMonths(count = 12, now = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month + index, 1))
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth()
    return {
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
      en: `${MONTHS_LONG[m]} ${y}`,
      ar: `${MONTHS_AR[m]} ${y}`,
    }
  })
}

/** Today's calendar date (YYYY-MM-DD) in the UAE (Asia/Dubai, UTC+4, no daylight saving), wherever this runs. */
export function todayIsoUae(now = new Date()): string {
  return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** First travel day for a flexible month: the 1st, or today when the chosen month is the current one. */
export function flexibleEntryDate(month: string, now = new Date()): string {
  const first = `${month}-01`
  const today = todayIsoUae(now)
  return first < today ? today : first
}
