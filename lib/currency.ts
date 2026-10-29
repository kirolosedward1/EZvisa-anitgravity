import { PRICE_AED } from "@/lib/shared/wizard-contract"

export type Currency = "AED" | "USD"

export interface CurrencyInfo {
  code: Currency
  symbol: string
  flag: string
  name: string
  basePrice: number // service fee in this currency (AED is the real price; USD is a display conversion)
}

// Conversion rate from AED to USD (display only; Ziina always charges AED)
const AED_TO_USD_RATE = 0.28

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  AED: { code: "AED", symbol: "د.إ", flag: "🇦🇪", name: "UAE Dirham", basePrice: PRICE_AED },
  USD: { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", basePrice: Math.round(PRICE_AED * AED_TO_USD_RATE) },
}

export const PRICES = {
  visaApplication: PRICE_AED, // Base price in AED (shared with the app: lib/shared/wizard-contract.ts)
}

export type DisplayLocale = "en" | "ar"

/**
 * Counted noun after an AED amount. Last two digits 11–99 (249, 498) take
 * accusative singular درهمًا. Every other amount stays درهم.
 */
export function dirhamNoun(amount: number): "درهم" | "درهمًا" {
  if (!Number.isFinite(amount)) return "درهم"
  const lastTwo = Math.abs(Math.trunc(amount)) % 100
  return lastTwo >= 11 && lastTwo <= 99 ? "درهمًا" : "درهم"
}

function dirhamNounForDigits(digits: string): "درهم" | "درهمًا" {
  return dirhamNoun(Number(digits.replace(/,/g, "")))
}

/**
 * The one price label for marketing blocks.
 * English keeps the code after the amount (`249 AED`, `1000+ AED`).
 * Arabic puts the plus on the left of the digits (`249 درهمًا`, `+1000 درهم`),
 * which is the order the bidi algorithm keeps when the number is an LTR run.
 */
export function formatAedLabel(amount: number, locale: DisplayLocale, plus = false): string {
  const digits = String(amount)
  if (locale === "ar") {
    const noun = dirhamNoun(amount)
    return plus ? `+${digits} ${noun}` : `${digits} ${noun}`
  }
  return plus ? `${digits}+ AED` : `${digits} AED`
}

/** Rewrite AED amounts inside a sentence. `1000+ AED` becomes `+1000 درهم`. */
export function localizePriceText(text: string, locale: DisplayLocale): string {
  if (locale !== "ar") return text
  return text
    .replace(/(\d[\d,]*)\+\s*AED/g, (_, digits: string) => `+${digits.replace(/,/g, "")} ${dirhamNounForDigits(digits)}`)
    .replace(/(\d[\d,]*)\s*AED/g, (_, digits: string) => `${digits} ${dirhamNounForDigits(digits)}`)
}

export function formatPrice(amountAED: number, currency: Currency, locale: DisplayLocale = "en"): string {
  if (currency === "USD") {
    const usdAmount = Math.round(amountAED * AED_TO_USD_RATE)
    return locale === "ar" ? `${usdAmount} دولار` : `${usdAmount} USD`
  }
  return formatAedLabel(amountAED, locale)
}

export function getPrice(amountAED: number, currency: Currency): number {
  if (currency === "USD") {
    return Math.round(amountAED * AED_TO_USD_RATE)
  }
  return amountAED
}

export function getCurrencyInfo(currency: Currency): CurrencyInfo {
  return CURRENCIES[currency]
}

/** Travellers charged on one application. "With spouse" on the trip, or a spouse travelling along, counts as two. */
export function applicantCount(spouseAccompanying?: string | null, travelingWith?: string | null): number {
  return spouseAccompanying === "yes" || travelingWith === "spouse" ? 2 : 1
}

/** AED total from the base price. Never a literal amount at the call site. */
export function priceForTravellers(spouseAccompanying?: string | null, travelingWith?: string | null): number {
  return CURRENCIES.AED.basePrice * applicantCount(spouseAccompanying, travelingWith)
}

export function getDefaultCurrency(): CurrencyInfo {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("selectedCurrency") as Currency
    if (saved && (saved === "AED" || saved === "USD")) {
      return CURRENCIES[saved]
    }
  }
  return CURRENCIES["AED"]
}
