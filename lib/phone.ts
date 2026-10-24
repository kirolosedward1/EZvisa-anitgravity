import { toWesternDigits } from "./digits"

/**
 * What the phone field keeps on each keystroke. Eastern and Persian digits become
 * Western, other non-digits are dropped, and "+" is kept only when it is the first
 * character. Dial codes and trunk zeros stay so a repeated 971 is still there to reject.
 */
export function phoneTypingValue(input: string): string {
  const western = toWesternDigits(input)
  let plus = false
  let digits = ""
  for (const char of western) {
    if (char >= "0" && char <= "9") digits += char
    else if (char === "+" && !plus && digits.length === 0) plus = true
  }
  return plus ? `+${digits}` : digits
}

/**
 * Digits after one UAE prefix (+971, 00971, or 971) and any leading zeros.
 * The prefix is removed once: 971971… stays 971… and then fails the mobile pattern.
 * Used on blur and submit, not while the field is being typed.
 */
export function uaeLocalDigits(input: string): string {
  let digits = toWesternDigits(input).replace(/\D/g, "")
  if (digits.startsWith("00971")) digits = digits.slice(5)
  else if (digits.startsWith("971")) digits = digits.slice(3)
  return digits.replace(/^0+/, "")
}

/** +971 and nine digits starting with 5, or null. All-one-digit numbers are rejected. */
export function uaeMobileE164(input: string): string | null {
  const local = uaeLocalDigits(input)
  if (!/^5\d{8}$/.test(local)) return null
  if (/^(\d)\1+$/.test(local)) return null
  return `+971${local}`
}

/**
 * A phone that was sent and fails the UAE mobile check.
 * Missing or blank is not a rejection: continue saves omit the phone.
 */
export function hasInvalidPhone(phone: unknown): boolean {
  if (typeof phone !== "string") return false
  const value = phone.trim()
  return value.length > 0 && !isValidPhone(value)
}

/** True for a UAE mobile: local part is exactly 5 followed by 8 digits, not one repeated digit. */
export function isValidPhone(phone: string): boolean {
  return uaeMobileE164(phone) !== null
}

/**
 * Phone to send on a lead. Blank stays blank (""). A non-blank number that is not a
 * UAE mobile is null so the route can return 400 before queueing. A valid number is +971XXXXXXXXX.
 */
export function leadPhoneForSend(phone: unknown): { phone: string } | { error: "Enter a valid phone number." } {
  if (typeof phone !== "string" || !phone.trim()) return { phone: "" }
  const canonical = uaeMobileE164(phone)
  if (!canonical) return { error: "Enter a valid phone number." }
  return { phone: canonical }
}
