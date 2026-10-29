export interface CountryFundsRule {
  country: string
  currency: string
  dailyRateWithHotel: number
  dailyRateNoHotel: number
  minimumTotal?: number
  note: string
}

export const SCHENGEN_FUNDS_RULES: Record<string, CountryFundsRule> = {
  spain: {
    country: "Spain",
    currency: "EUR",
    dailyRateWithHotel: 122.10,
    dailyRateNoHotel: 122.10,
    minimumTotal: 1098.90, // Spain requires min 9 days worth (€1,098.90) even for 2-day trips
    note: "Spain requires at least 10% of the gross minimum interprofessional wage per person per day."
  },
  france: {
    country: "France",
    currency: "EUR",
    dailyRateWithHotel: 65,
    dailyRateNoHotel: 120,
    note: "France requires €65/day if you have hotel bookings, or €120/day without pre-arranged accommodation."
  },
  italy: {
    country: "Italy",
    currency: "EUR",
    dailyRateWithHotel: 45,
    dailyRateNoHotel: 65,
    minimumTotal: 450,
    note: "Italy uses a fixed baseline plus approx €45 per day for trips of 11-20 days."
  },
  germany: {
    country: "Germany",
    currency: "EUR",
    dailyRateWithHotel: 45,
    dailyRateNoHotel: 45,
    note: "Germany expects at least €45 per day to cover daily meals, local transit, and incidental costs."
  },
  switzerland: {
    country: "Switzerland",
    currency: "CHF",
    dailyRateWithHotel: 100,
    dailyRateNoHotel: 100,
    note: "Switzerland requires 100 CHF (~€105) per day, or 30 CHF/day for enrolled students."
  },
  netherlands: {
    country: "Netherlands",
    currency: "EUR",
    dailyRateWithHotel: 55,
    dailyRateNoHotel: 55,
    note: "The Netherlands requires €55 per person per day with confirmed hotel reservations."
  },
  greece: {
    country: "Greece",
    currency: "EUR",
    dailyRateWithHotel: 50,
    dailyRateNoHotel: 50,
    minimumTotal: 300,
    note: "Greece requires at least €50 per day, with a minimum requirement of €300 for short stays up to 5 days."
  },
  austria: {
    country: "Austria",
    currency: "EUR",
    dailyRateWithHotel: 50,
    dailyRateNoHotel: 90,
    note: "Austria assesses adequate financial means based on itinerary complexity, averaging €50/day."
  }
}

export const EUR_TO_AED = 4.02
export const CHF_TO_AED = 4.15

export function calculateRequiredFunds(
  countryKey: string,
  days: number,
  travelers: number,
  hasHotel: boolean = true
) {
  const rule = SCHENGEN_FUNDS_RULES[countryKey.toLowerCase()] || SCHENGEN_FUNDS_RULES.france
  const dailyRate = hasHotel ? rule.dailyRateWithHotel : rule.dailyRateNoHotel
  
  let totalForeign = dailyRate * Math.max(1, days) * Math.max(1, travelers)
  // Italian Table A varies by duration and number of participants, not hotel status.
  if (countryKey.toLowerCase() === "italy") {
    const group = travelers > 1
    const perPerson = days <= 5 ? (group ? 212.81 : 269.60)
      : days <= 10 ? days * (group ? 26.33 : 44.93)
      : days <= 20 ? (group ? 25.82 : 51.64) + days * (group ? 22.21 : 36.67)
      : (group ? 118.79 : 206.58) + days * (group ? 17.04 : 27.89)
    totalForeign = perPerson * Math.max(1, travelers)
  }
  
  if (rule.minimumTotal && countryKey.toLowerCase() !== "italy") {
    const minRequired = rule.minimumTotal * Math.max(1, travelers)
    if (totalForeign < minRequired) {
      totalForeign = minRequired
    }
  }

  const rateToAed = rule.currency === "CHF" ? CHF_TO_AED : EUR_TO_AED
  const totalAed = Math.ceil(totalForeign * rateToAed)
  const recommendedBufferAed = Math.ceil(totalAed * 1.3) // Optional budget example; not a consular requirement

  return {
    country: rule.country,
    currency: rule.currency,
    days,
    travelers,
    dailyRate,
    totalForeign: Math.round(totalForeign * 100) / 100,
    totalAed,
    recommendedBufferAed,
    note: rule.note
  }
}
