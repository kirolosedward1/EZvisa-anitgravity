import { parseCalendarDate } from "../dates"

export function todayDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function accountBirthDate(value: unknown, today = todayDate()): string {
  if (typeof value !== "string") return ""
  const date = parseCalendarDate(value)?.iso
  return date && date <= today ? date : ""
}

export function accountDetails(name: string, birthdate: string, today = todayDate()) {
  const fullName = name.replace(/\s+/g, " ").trim()
  if (!fullName || fullName.length > 120) return { error: "name" as const }
  const date = accountBirthDate(birthdate, today)
  if (!date) return { error: "birthdate" as const }
  return { data: { full_name: fullName, date_of_birth: date } }
}

export function accountDetailsError(locale: "en" | "ar", field: "name" | "birthdate") {
  if (field === "name") return locale === "ar" ? "أدخل اسمك الكامل (حتى 120 حرفًا)." : "Enter your full name (up to 120 characters)."
  return locale === "ar" ? "أدخل تاريخ ميلاد صحيحًا، وليس تاريخًا مستقبليًا." : "Enter a valid date of birth that isn’t in the future."
}
