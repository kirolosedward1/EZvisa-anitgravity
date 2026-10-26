// Visa centres in the UAE. The provider, country list and street addresses match
// components/tools/appointment-guide-client.tsx (APPOINTMENT_CENTERS). That file keeps the
// object literal so the mobile copy-check can read it. This module is what the website renders.

export type VisaCentreRecord = {
  key: "vfs" | "tls" | "bls"
  provider: string
  countries: string[]
  dubaiAddress: string
  abuDhabiAddress: string
  dubaiAddressAr: string
  abuDhabiAddressAr: string
}

export const VISA_CENTRES: VisaCentreRecord[] = [
  {
    key: "vfs",
    provider: "VFS Global",
    countries: [
      "Germany", "Italy", "Switzerland", "Austria", "Netherlands",
      "Greece", "Portugal", "Sweden", "Norway", "Denmark", "Czech Republic",
      "Poland", "Hungary", "Croatia", "Finland", "Belgium", "Lithuania",
    ],
    dubaiAddress: "Level 2 & 3, WAFI Mall, Umm Hurair 2, Dubai",
    abuDhabiAddress: "Level B2, The Mall, World Trade Center, Abu Dhabi",
    dubaiAddressAr: "الطابقان 2 و3، وافي مول، أم هرير 2، دبي",
    abuDhabiAddressAr: "الطابق B2، المول، مركز التجارة العالمي، أبوظبي",
  },
  {
    key: "tls",
    provider: "TLScontact",
    countries: ["France"],
    dubaiAddress: "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai",
    abuDhabiAddress: "Level 25, Shining Towers, Mubarak Bin Mohammed St, Abu Dhabi",
    dubaiAddressAr: "مبنى المنارة، الطابق 2، شارع الشيخ زايد، دبي",
    abuDhabiAddressAr: "الطابق 25، أبراج شاينينغ، شارع مبارك بن محمد، أبوظبي",
  },
  {
    key: "bls",
    provider: "BLS International",
    countries: ["Spain"],
    dubaiAddress: "Al Barsha 1, Business Point Building, Dubai",
    abuDhabiAddress: "Office 1002, Al Muhairi Center, Al Khalidiya, Abu Dhabi",
    dubaiAddressAr: "البرشاء 1، مبنى بزنس بوينت، دبي",
    abuDhabiAddressAr: "مكتب 1002، مركز المهيري، الخالدية، أبوظبي",
  },
]

export type CentreOption = {
  id: string
  provider: string
  centre: string
  address: string
  addressAr: string
}

export function centreForCountry(country?: string | null): VisaCentreRecord | undefined {
  const name = (country ?? "").trim()
  if (!name) return undefined
  return VISA_CENTRES.find((item) => item.countries.some((c) => c.toLowerCase() === name.toLowerCase()))
}

export function appointmentCentreOptions(country?: string | null): CentreOption[] {
  const item = centreForCountry(country)
  if (!item) return []
  return [
    {
      id: `${item.key}-dubai`,
      provider: item.provider,
      centre: `${item.provider}, Dubai`,
      address: item.dubaiAddress,
      addressAr: item.dubaiAddressAr,
    },
    {
      id: `${item.key}-abu-dhabi`,
      provider: item.provider,
      centre: `${item.provider}, Abu Dhabi`,
      address: item.abuDhabiAddress,
      addressAr: item.abuDhabiAddressAr,
    },
  ]
}

/** Provider stored on a known centre, else derived from the centre text, else the text itself. */
export function centreProviderName(centre?: string | null): string {
  const text = (centre ?? "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  const known = VISA_CENTRES.find((item) => text.toLowerCase().includes(item.provider.toLowerCase()))
  if (known) return known.provider
  if (/vfs/i.test(text)) return "VFS Global"
  if (/tls/i.test(text)) return "TLScontact"
  if (/\bbls\b/i.test(text)) return "BLS International"
  return text
}

function stripProvider(centre: string, provider: string): string {
  if (!centre || centre === provider) return ""
  const escaped = provider.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const stripped = centre.replace(new RegExp(`^${escaped}\\s*,?\\s*`, "i"), "").trim()
  if (stripped && stripped !== centre) return stripped
  return centre
}

/** Provider line plus the street address. No map URL is built. */
export function centrePlace(centre?: string | null, address?: string | null): { provider: string; address: string } | null {
  const c = (centre ?? "").replace(/\s+/g, " ").trim()
  const a = (address ?? "").replace(/\s+/g, " ").trim()
  if (!c && !a) return null
  const provider = centreProviderName(c) || c || a
  const extra = c && c !== provider ? stripProvider(c, provider) : ""
  const line = a || (extra !== provider ? extra : "")
  return { provider, address: line === provider ? "" : line }
}

/** Arabic street line when the saved address is one of the known centres. Otherwise the saved text. */
export function localizedCentreAddress(address: string, locale: "en" | "ar"): string {
  if (locale !== "ar" || !address) return address
  for (const item of VISA_CENTRES) {
    if (address === item.dubaiAddress) return item.dubaiAddressAr
    if (address === item.abuDhabiAddress) return item.abuDhabiAddressAr
  }
  return address
}
