import { getCountries, getCountryCallingCode, Metadata, type CountryCode } from "libphonenumber-js"
import { toWesternDigits } from "./digits"

/** Used when the number has no dial code we can match. */
const FALLBACK_MIN = 7
const FALLBACK_MAX = 12

type CallingCode = { code: string; countries: CountryCode[] }

let callingCodes: CallingCode[] | null = null
const lengthByCountry = new Map<CountryCode, { min: number; max: number }>()

function codes(): CallingCode[] {
  if (callingCodes) return callingCodes
  const grouped = new Map<string, CountryCode[]>()
  for (const country of getCountries()) {
    const code = getCountryCallingCode(country)
    const list = grouped.get(code)
    if (list) list.push(country)
    else grouped.set(code, [country])
  }
  callingCodes = [...grouped.entries()]
    .map(([code, countries]) => ({ code, countries }))
    .sort((a, b) => b.code.length - a.code.length)
  return callingCodes
}

/** National-number length bounds from libphonenumber (shortest and longest possible length). */
function lengthsFor(country: CountryCode): { min: number; max: number } {
  const cached = lengthByCountry.get(country)
  if (cached) return cached
  const metadata = new Metadata()
  metadata.selectNumberingPlan(country)
  const lengths = metadata.numberingPlan?.possibleLengths() ?? []
  const range = lengths.length
    ? { min: Math.min(...lengths), max: Math.max(...lengths) }
    : { min: FALLBACK_MIN, max: FALLBACK_MAX }
  lengthByCountry.set(country, range)
  return range
}

/**
 * Local digits after Eastern/Persian digits are normalised and an international dial code is removed.
 * A leading trunk 0 is dropped once ("050…" → "50…").
 */
export function localPhoneDigits(input: string): { national: string; countries?: CountryCode[] } {
  const western = toWesternDigits(input).trim()
  let digits = western.replace(/\D/g, "")
  if (!digits) return { national: "" }

  const international = western.startsWith("+") || digits.startsWith("00")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (!digits) return { national: "" }

  if (international) {
    const match = codes().find((entry) => digits.startsWith(entry.code) && digits.length > entry.code.length)
    if (match) {
      let national = digits.slice(match.code.length)
      if (national.startsWith("0")) national = national.slice(1)
      return { national, countries: match.countries }
    }
  }

  if (digits.startsWith("0")) digits = digits.slice(1)
  return { national: digits }
}

function bounds(countries: CountryCode[] | undefined): { min: number; max: number } {
  if (!countries?.length) return { min: FALLBACK_MIN, max: FALLBACK_MAX }
  let min = Infinity
  let max = 0
  for (const country of countries) {
    const range = lengthsFor(country)
    if (range.min < min) min = range.min
    if (range.max > max) max = range.max
  }
  if (min === Infinity) return { min: FALLBACK_MIN, max: FALLBACK_MAX }
  return { min, max }
}

/** True when the local number is a plausible length for its country and not a single repeated digit. */
export function isValidPhone(phone: string): boolean {
  const { national, countries } = localPhoneDigits(phone)
  if (!national) return false
  if (/^(\d)\1+$/.test(national)) return false
  const { min, max } = bounds(countries)
  if (national.length < min || national.length > max) return false
  if (
    national.length >= 8 &&
    national.split("").every((digit, index, all) => index === 0 || Number(digit) === Number(all[index - 1]) + 1)
  ) {
    return false
  }
  return true
}
