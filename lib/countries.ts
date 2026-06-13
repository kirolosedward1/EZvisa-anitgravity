export const SCHENGEN_COUNTRIES = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
] as const

export type SchengenCountry = (typeof SCHENGEN_COUNTRIES)[number]

export const countryFlags: Record<string, string> = {
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Bulgaria: "🇧🇬",
  Croatia: "🇭🇷",
  "Czech Republic": "🇨🇿",
  Denmark: "🇩🇰",
  Estonia: "🇪🇪",
  Finland: "🇫🇮",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Greece: "🇬🇷",
  Hungary: "🇭🇺",
  Iceland: "🇮🇸",
  Italy: "🇮🇹",
  Latvia: "🇱🇻",
  Liechtenstein: "🇱🇮",
  Lithuania: "🇱🇹",
  Luxembourg: "🇱🇺",
  Malta: "🇲🇹",
  Netherlands: "🇳🇱",
  Norway: "🇳🇴",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Romania: "🇷🇴",
  Slovakia: "🇸🇰",
  Slovenia: "🇸🇮",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
}

export function countryToSlug(country: string): string {
  return country.toLowerCase().replace(/\s+/g, "-")
}

export function slugToCountry(slug: string): string | null {
  const country = SCHENGEN_COUNTRIES.find((c) => countryToSlug(c) === slug)
  return country || null
}

export interface CountryData {
  name: string
  slug: string
  flag: string
  description: string
  processingTime: string
}

export const COUNTRY_DATA: CountryData[] = SCHENGEN_COUNTRIES.map((country) => ({
  name: country,
  slug: countryToSlug(country),
  flag: countryFlags[country],
  description: `Complete visa document requirements for ${country}`,
  processingTime: "10-15 business days",
}))

export function getCountryBySlug(slug: string): CountryData | null {
  return COUNTRY_DATA.find((c) => c.slug === slug) || null
}

export function getCountryUrl(country: string): string {
  return `/documents/required-documents-to-apply-for-a-tourist-visa-in-${countryToSlug(country)}`
}
