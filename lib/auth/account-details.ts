import { parseCalendarDate } from "../dates"
import { safeNext } from "./redirect"

/** Account eligibility follows the UAE calendar date, consistently on browser and server. */
export function todayDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const value = (part: string) => parts.find(p => p.type === part)!.value
  return `${value("year")}-${value("month")}-${value("day")}`
}

export function accountBirthDate(value: unknown, today = todayDate()): string {
  if (typeof value !== "string") return ""
  const date = parseCalendarDate(value)?.iso
  return date && date <= today ? date : ""
}

export function adultBirthdateCutoff(today = todayDate()): string {
  const year = Number(today.slice(0, 4)) - 18
  const candidate = `${year}${today.slice(4)}`
  // February 29 in the current year may not exist 18 years earlier.
  return parseCalendarDate(candidate) ? candidate : `${year}-02-28`
}

export function accountAge(birthdate: unknown, today = todayDate()): number | null {
  const date = accountBirthDate(birthdate, today)
  if (!date) return null
  return Number(today.slice(0, 4)) - Number(date.slice(0, 4)) - (today.slice(5) < date.slice(5) ? 1 : 0)
}

export type AccountDetailsError = "name" | "birthdate" | "underage" | "confirmation"

export function accountDetails(name: string, birthdate: string, today = todayDate()) {
  const fullName = name.replace(/\s+/g, " ").trim()
  if (!fullName || fullName.length > 120) return { error: "name" as const }
  const date = accountBirthDate(birthdate, today)
  if (!date) return { error: "birthdate" as const }
  if (date > adultBirthdateCutoff(today)) return { error: "underage" as const }
  return { data: { full_name: fullName, date_of_birth: date } }
}

export function registrationDetails(name: string, birthdate: string, confirmed: unknown, today = todayDate()) {
  const details = accountDetails(name, birthdate, today)
  if (details.error) return details
  if (confirmed !== true) return { error: "confirmation" as const }
  return { data: { ...details.data!, age_18_confirmed: true } }
}

/** This is a server-recorded self-declaration, not a provider-verified age or an identity check. */
export function hasAdultConfirmation(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return user?.app_metadata?.ezvisa_adult_policy === 1
}

export function profileCompletionPath(next: string): string {
  const destination = safeNext(next)
  if (/^\/(?:ar\/)?signup\?/.test(destination) && new URL(destination, "https://www.ezvisa.net").searchParams.get("profile") === "complete") return destination
  const prefix = destination === "/ar" || destination.startsWith("/ar/") ? "/ar" : ""
  return `${prefix}/signup?profile=complete&next=${encodeURIComponent(destination)}`
}

export function accountDetailsError(locale: "en" | "ar", field: AccountDetailsError) {
  if (field === "name") return locale === "ar" ? "أدخل اسمك الكامل (حتى 120 حرفًا)." : "Enter your full name (up to 120 characters)."
  if (field === "underage") return locale === "ar" ? "يجب أن يكون عمرك 18 عامًا أو أكثر لإنشاء حساب EZvisa." : "You must be 18 or older to create an EZvisa account."
  if (field === "confirmation") return locale === "ar" ? "يرجى تأكيد أن عمرك 18 عامًا أو أكثر وأن تاريخ ميلادك صحيح." : "Please confirm that you are 18 or older and your date of birth is correct."
  return locale === "ar" ? "أدخل تاريخ ميلاد صحيحًا، وليس تاريخًا مستقبليًا." : "Enter a valid date of birth that isn’t in the future."
}
