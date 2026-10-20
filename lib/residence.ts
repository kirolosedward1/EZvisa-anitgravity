// Residence is UAE only for now; add country names (as stored, e.g. "Saudi Arabia") to re-enable others.
// Same values as the iOS app (mobile/lib/wizard.ts).
export const RESIDENCE_COUNTRIES: string[] = ["United Arab Emirates"]
export const DEFAULT_RESIDENCE = RESIDENCE_COUNTRIES[0]
/** City of residence = one of the 7 emirates (stored as the English name). */
export const UAE_EMIRATES: string[] = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"]
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
export const matchEmirate = (v?: string | null) => (v ? UAE_EMIRATES.find((e) => norm(e) === norm(v)) ?? "" : "")
/** Coerce old drafts and links: residence -> allowed list, city -> emirate or empty. */
export function coerceResidence<T extends { countryOfResidence: string; cityOfResidence: string; hasEmiratesId?: string }>(f: T): T {
  const country = RESIDENCE_COUNTRIES.includes(f.countryOfResidence) ? f.countryOfResidence : DEFAULT_RESIDENCE
  const city = country === "United Arab Emirates" ? matchEmirate(f.cityOfResidence) : f.cityOfResidence
  return { ...f, countryOfResidence: country, cityOfResidence: city }
}
