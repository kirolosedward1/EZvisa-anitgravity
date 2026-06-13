export type Currency = "AED" | "USD"

export interface CurrencyInfo {
  code: Currency
  symbol: string
  flag: string
  name: string
  basePrice: number // Added basePrice to the CurrencyInfo interface
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  AED: { code: "AED", symbol: "د.إ", flag: "🇦🇪", name: "UAE Dirham", basePrice: 249 },
  USD: { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", basePrice: 70 }, // 249 AED * 0.28
}

export const PRICES = {
  visaApplication: 249, // Base price in AED
}

// Conversion rate from AED to USD
const AED_TO_USD_RATE = 0.28

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

export function getDefaultCurrency(): CurrencyInfo {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("selectedCurrency") as Currency
    if (saved && (saved === "AED" || saved === "USD")) {
      return CURRENCIES[saved]
    }
  }
  return CURRENCIES["AED"]
}
