// Visa application centres in the UAE, per Schengen country. COPY of the provider, country list and addresses in the
// website's components/tools/appointment-guide-client.tsx (APPOINTMENT_CENTERS). The app must not import web code, so
// the values are copied; scripts/country-check.ts fails if this copy and the website file differ.
// Left out on purpose: the website's timing tips (they change and the app can't keep them current), booking URLs and
// the VIP flag. A country that is in no list has no centre here: the app hides the row instead of guessing.

export type VisaCentre = { key: "vfs" | "tls" | "bls"; provider: string; countries: string[]; dubaiAddress: string; abuDhabiAddress: string };

export const VISA_CENTRES: VisaCentre[] = [
  {
    key: "vfs", provider: "VFS Global",
    countries: ["Germany", "Italy", "Switzerland", "Austria", "Netherlands", "Greece", "Portugal", "Sweden", "Norway", "Denmark", "Czech Republic", "Poland", "Hungary", "Croatia", "Finland", "Belgium", "Lithuania"],
    dubaiAddress: "Level 2 & 3, WAFI Mall, Umm Hurair 2, Dubai",
    abuDhabiAddress: "Level B2, The Mall, World Trade Center, Abu Dhabi",
  },
  {
    key: "tls", provider: "TLScontact",
    countries: ["France"],
    dubaiAddress: "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai",
    abuDhabiAddress: "Level 25, Shining Towers, Mubarak Bin Mohammed St, Abu Dhabi",
  },
  {
    key: "bls", provider: "BLS International",
    countries: ["Spain"],
    dubaiAddress: "Al Barsha 1, Business Point Building, Dubai",
    abuDhabiAddress: "Office 1002, Al Muhairi Center, Al Khalidiya, Abu Dhabi",
  },
];

/** The centre for a country name (as in lib/countries.ts), or undefined when the website does not map it. */
export const centreFor = (country: string): VisaCentre | undefined => VISA_CENTRES.find((v) => v.countries.includes(country));

/** Apple Maps search for an address (same URL shape as lib/appointment.ts directionsUrl). */
export const mapsUrl = (address: string) => `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
