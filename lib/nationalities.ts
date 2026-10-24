import { CITIZENSHIP_AR } from "@/messages/ar-citizenship"

/** Citizenship options for people who need a Schengen visa.
 * GCC countries (AE, BH, KW, OM, QA, SA) are excluded. One row per ISO code.
 */
export type Citizenship = { iso: string; name: string }

export const CITIZENSHIP_OPTIONS: Citizenship[] = [
  { iso: "AF", name: "Afghanistan" },
  { iso: "DZ", name: "Algeria" },
  { iso: "AO", name: "Angola" },
  { iso: "AM", name: "Armenia" },
  { iso: "AZ", name: "Azerbaijan" },
  { iso: "BD", name: "Bangladesh" },
  { iso: "BY", name: "Belarus" },
  { iso: "BZ", name: "Belize" },
  { iso: "BJ", name: "Benin" },
  { iso: "BT", name: "Bhutan" },
  { iso: "BO", name: "Bolivia" },
  { iso: "BW", name: "Botswana" },
  { iso: "BF", name: "Burkina Faso" },
  { iso: "BI", name: "Burundi" },
  { iso: "CV", name: "Cabo Verde" },
  { iso: "KH", name: "Cambodia" },
  { iso: "CM", name: "Cameroon" },
  { iso: "CF", name: "Central African Republic" },
  { iso: "TD", name: "Chad" },
  { iso: "CN", name: "China" },
  { iso: "KM", name: "Comoros" },
  { iso: "CG", name: "Congo" },
  { iso: "CI", name: "Côte d'Ivoire" },
  { iso: "CU", name: "Cuba" },
  { iso: "DJ", name: "Djibouti" },
  { iso: "DO", name: "Dominican Republic" },
  { iso: "CD", name: "DR Congo" },
  { iso: "EC", name: "Ecuador" },
  { iso: "EG", name: "Egypt" },
  { iso: "GQ", name: "Equatorial Guinea" },
  { iso: "ER", name: "Eritrea" },
  { iso: "SZ", name: "Eswatini" },
  { iso: "ET", name: "Ethiopia" },
  { iso: "FJ", name: "Fiji" },
  { iso: "GA", name: "Gabon" },
  { iso: "GM", name: "Gambia" },
  { iso: "GH", name: "Ghana" },
  { iso: "GN", name: "Guinea" },
  { iso: "GW", name: "Guinea-Bissau" },
  { iso: "GY", name: "Guyana" },
  { iso: "HT", name: "Haiti" },
  { iso: "IN", name: "India" },
  { iso: "ID", name: "Indonesia" },
  { iso: "IR", name: "Iran" },
  { iso: "IQ", name: "Iraq" },
  { iso: "JM", name: "Jamaica" },
  { iso: "JO", name: "Jordan" },
  { iso: "KZ", name: "Kazakhstan" },
  { iso: "KE", name: "Kenya" },
  { iso: "KG", name: "Kyrgyzstan" },
  { iso: "LA", name: "Laos" },
  { iso: "LB", name: "Lebanon" },
  { iso: "LS", name: "Lesotho" },
  { iso: "LR", name: "Liberia" },
  { iso: "LY", name: "Libya" },
  { iso: "MG", name: "Madagascar" },
  { iso: "MW", name: "Malawi" },
  { iso: "MV", name: "Maldives" },
  { iso: "ML", name: "Mali" },
  { iso: "MR", name: "Mauritania" },
  { iso: "MN", name: "Mongolia" },
  { iso: "MA", name: "Morocco" },
  { iso: "MZ", name: "Mozambique" },
  { iso: "MM", name: "Myanmar" },
  { iso: "NA", name: "Namibia" },
  { iso: "NP", name: "Nepal" },
  { iso: "NE", name: "Niger" },
  { iso: "NG", name: "Nigeria" },
  { iso: "KP", name: "North Korea" },
  { iso: "PK", name: "Pakistan" },
  { iso: "PS", name: "Palestine" },
  { iso: "PG", name: "Papua New Guinea" },
  { iso: "PH", name: "Philippines" },
  { iso: "RU", name: "Russian Federation" },
  { iso: "RW", name: "Rwanda" },
  { iso: "ST", name: "Sao Tome and Principe" },
  { iso: "SN", name: "Senegal" },
  { iso: "SL", name: "Sierra Leone" },
  { iso: "SO", name: "Somalia" },
  { iso: "ZA", name: "South Africa" },
  { iso: "SS", name: "South Sudan" },
  { iso: "LK", name: "Sri Lanka" },
  { iso: "SD", name: "Sudan" },
  { iso: "SR", name: "Suriname" },
  { iso: "SY", name: "Syria" },
  { iso: "TJ", name: "Tajikistan" },
  { iso: "TZ", name: "Tanzania" },
  { iso: "TH", name: "Thailand" },
  { iso: "TG", name: "Togo" },
  { iso: "TN", name: "Tunisia" },
  { iso: "TR", name: "Turkey" },
  { iso: "TM", name: "Turkmenistan" },
  { iso: "UG", name: "Uganda" },
  { iso: "UZ", name: "Uzbekistan" },
  { iso: "VU", name: "Vanuatu" },
  { iso: "VN", name: "Vietnam" },
  { iso: "YE", name: "Yemen" },
  { iso: "ZM", name: "Zambia" },
  { iso: "ZW", name: "Zimbabwe" },
]

const GCC_ISO = new Set(["AE", "BH", "KW", "OM", "QA", "SA"])

const BY_ISO = new Map(CITIZENSHIP_OPTIONS.map((c) => [c.iso, c]))
const BY_NAME = new Map(CITIZENSHIP_OPTIONS.map((c) => [c.name.toLowerCase(), c]))

/** Round flag image (not an emoji). Local art when we have it, otherwise flagcdn. */
const LOCAL_FLAGS: Record<string, string> = {
  BD: "/flags/bangladesh.png",
  EG: "/flags/egypt.png",
  IN: "/flags/india.png",
  JO: "/flags/jordan.png",
  PK: "/flags/pakistan.png",
  PH: "/flags/philippines.png",
  RU: "/flags/russia.png",
  SY: "/flags/syria.png",
}

export function flagSrc(iso: string): string {
  const code = iso.toUpperCase()
  return LOCAL_FLAGS[code] ?? `https://flagcdn.com/w80/${code.toLowerCase()}.png`
}

export function citizenshipByIso(value?: string | null): Citizenship | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw || GCC_ISO.has(raw.toUpperCase())) return null
  return BY_ISO.get(raw.toUpperCase()) ?? BY_NAME.get(raw.toLowerCase()) ?? null
}

/** Store and compare citizenship as ISO alpha-2. Legacy country names still resolve. */
export function toCitizenshipIso(value?: string | null): string {
  return citizenshipByIso(value)?.iso ?? ""
}

/** Flag art for a country name. Includes GCC states, which are not visa nationalities. */
const FLAG_NAME_ISO: Record<string, string> = {
  "united arab emirates": "AE",
  "saudi arabia": "SA",
  bahrain: "BH",
  kuwait: "KW",
  oman: "OM",
  qatar: "QA",
}

export function flagIso(value?: string | null): string {
  const iso = toCitizenshipIso(value)
  if (iso) return iso
  if (!value) return ""
  const raw = value.trim()
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase()
  return FLAG_NAME_ISO[raw.toLowerCase()] ?? ""
}

export function citizenshipName(value?: string | null): string {
  return citizenshipByIso(value)?.name ?? ""
}

export function citizenshipNameAr(value?: string | null): string {
  const iso = toCitizenshipIso(value)
  return (iso && CITIZENSHIP_AR[iso]) || citizenshipName(value)
}

/** English label for an ISO code or an English country name. */
export function citizenshipLabel(value?: string | null): string {
  if (!value) return ""
  return citizenshipName(value) || CITIZENSHIP_OPTIONS.find((country) => country.name === value)?.name || value
}

const NAME_AR_EXTRA: Record<string, string> = {
  "United Arab Emirates": "الإمارات العربية المتحدة",
  "Saudi Arabia": "السعودية",
}

/** Arabic label for an ISO code or an English country name. */
export function citizenshipLabelAr(value?: string | null): string {
  if (!value) return ""
  const iso = toCitizenshipIso(value) || CITIZENSHIP_OPTIONS.find((country) => country.name === value)?.iso
  return (iso && CITIZENSHIP_AR[iso]) || NAME_AR_EXTRA[value] || citizenshipLabel(value)
}

/** Search matches the English name, the Arabic name, and the ISO code. */
export function citizenshipSearchValue(country: Citizenship): string {
  return `${country.name} ${CITIZENSHIP_AR[country.iso] ?? ""} ${country.iso}`
}
