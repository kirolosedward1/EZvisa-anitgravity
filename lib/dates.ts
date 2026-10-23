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
