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

export function formatPrice(amountAED: number, currency: Currency): string {
  if (currency === "USD") {
    const usdAmount = Math.round(amountAED * AED_TO_USD_RATE)
    return `${usdAmount} USD`
  }
  return `${amountAED} AED`
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
