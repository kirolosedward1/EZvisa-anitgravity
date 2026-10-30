/**
 * SLA clocks for the staff console (Team board, "SLA targets, business hours Dubai"). Pure, tested in sla.test.ts.
 * Clocks are worked out from the case's own timestamps, so they are right for old cases too and nothing has to keep
 * them in sync.
 */
export const SLA = {
  /** First document check after an upload. */
  reviewHours: 24,
  /** File prepared after the last approval. */
  fileBusinessDays: 2,
  /** Appointment help request answered. */
  helpHours: 8,
} as const

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
/** Dubai is UTC+4 all year. */
const DUBAI_OFFSET = 4 * HOUR

export function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * HOUR).toISOString()
}

/** Day of the week in Dubai (0 Sunday … 6 Saturday). */
export function dubaiWeekday(ms: number): number {
  return new Date(ms + DUBAI_OFFSET).getUTCDay()
}

/** Adds business days (Monday to Friday, Dubai), keeping the time of day. A weekend start counts from Monday. */
export function addBusinessDays(iso: string, days: number): string {
  let ms = Date.parse(iso)
  while ([0, 6].includes(dubaiWeekday(ms))) ms += DAY
  let left = days
  while (left > 0) {
    ms += DAY
    if (![0, 6].includes(dubaiWeekday(ms))) left--
  }
  return new Date(ms).toISOString()
}

function span(ms: number): string {
  const minutes = Math.max(1, Math.floor(ms / 60000))
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`
  if (h > 0) return `${h}h`
  return `${minutes}m`
}

/** "1d 4h over" or "19h left". */
export function slaLabel(dueAt: string, now = Date.now()): { text: string; over: boolean } {
  const diff = Date.parse(dueAt) - now
  return diff < 0 ? { text: `${span(-diff)} over`, over: true } : { text: `${span(diff)} left`, over: false }
}

/** "2h" or "1d 3h" since a moment. */
export function waitedFor(since: string, now = Date.now()): string {
  return span(Math.max(0, now - Date.parse(since)))
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** "Due today", "Due tomorrow", "Due Mon" or "Due 12 Nov" in Dubai time. */
export function dueLabel(dueAt: string, now = Date.now()): string {
  const day = (ms: number) => Math.floor((ms + DUBAI_OFFSET) / DAY)
  const due = Date.parse(dueAt)
  const diff = day(due) - day(now)
  if (diff <= 0) return "Due today"
  if (diff === 1) return "Due tomorrow"
  if (diff < 7) return `Due ${WEEKDAY[dubaiWeekday(due)]}`
  const d = new Date(due + DUBAI_OFFSET)
  return `Due ${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`
}

/** Start of the Dubai week (Monday 00:00) containing `now`, as epoch ms. */
export function dubaiWeekStart(now = Date.now()): number {
  const local = now + DUBAI_OFFSET
  const midnight = Math.floor(local / DAY) * DAY
  const weekday = new Date(midnight).getUTCDay()
  return midnight - ((weekday + 6) % 7) * DAY - DUBAI_OFFSET
}

/** Start of the Dubai calendar month containing `now`, as epoch ms. */
export function dubaiMonthStart(now = Date.now()): number {
  const d = new Date(now + DUBAI_OFFSET)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - DUBAI_OFFSET
}

/** Dubai calendar day key (YYYY-MM-DD) of a moment. */
export function dubaiDay(ms: number): string {
  return new Date(ms + DUBAI_OFFSET).toISOString().slice(0, 10)
}
