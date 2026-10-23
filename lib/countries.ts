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

export const SCHENGEN_META: Record<string, { iso: string; ar: string }> = {
  Austria: { iso: "AT", ar: "النمسا" },
  Belgium: { iso: "BE", ar: "بلجيكا" },
  Bulgaria: { iso: "BG", ar: "بلغاريا" },
  Croatia: { iso: "HR", ar: "كرواتيا" },
  "Czech Republic": { iso: "CZ", ar: "التشيك" },
  Denmark: { iso: "DK", ar: "الدنمارك" },
  Estonia: { iso: "EE", ar: "إستونيا" },
  Finland: { iso: "FI", ar: "فنلندا" },
  France: { iso: "FR", ar: "فرنسا" },
  Germany: { iso: "DE", ar: "ألمانيا" },
  Greece: { iso: "GR", ar: "اليونان" },
  Hungary: { iso: "HU", ar: "المجر" },
  Iceland: { iso: "IS", ar: "آيسلندا" },
  Italy: { iso: "IT", ar: "إيطاليا" },
  Latvia: { iso: "LV", ar: "لاتفيا" },
  Liechtenstein: { iso: "LI", ar: "ليختنشتاين" },
  Lithuania: { iso: "LT", ar: "ليتوانيا" },
  Luxembourg: { iso: "LU", ar: "لوكسمبورغ" },
  Malta: { iso: "MT", ar: "مالطا" },
  Netherlands: { iso: "NL", ar: "هولندا" },
  Norway: { iso: "NO", ar: "النرويج" },
  Poland: { iso: "PL", ar: "بولندا" },
  Portugal: { iso: "PT", ar: "البرتغال" },
  Romania: { iso: "RO", ar: "رومانيا" },
  Slovakia: { iso: "SK", ar: "سلوفاكيا" },
  Slovenia: { iso: "SI", ar: "سلوفينيا" },
  Spain: { iso: "ES", ar: "إسبانيا" },
  Sweden: { iso: "SE", ar: "السويد" },
  Switzerland: { iso: "CH", ar: "سويسرا" },
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
  processingTime: "Ready in 1–2 days",
}))

export function getCountryBySlug(slug: string): CountryData | null {
  return COUNTRY_DATA.find((c) => c.slug === slug) || null
}

export function getCountryUrl(country: string): string {
  return `/documents/required-documents-to-apply-for-a-tourist-visa-in-${countryToSlug(country)}`
}
