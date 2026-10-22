// Wizard rules shared by the /apply steps; the same rules as the EZvisa app (mobile/lib/wizard.ts).

/** Passport must be valid at least 3 months after the return date (today + 3 months while it is unknown). Same as the app. */
export function passportCoversTrip(f: { passportExpiry?: string; travelEndDate?: string }) {
  if (!f.passportExpiry) return true
  const base = f.travelEndDate ? new Date(f.travelEndDate + "T00:00:00") : new Date()
  const need = new Date(base.getFullYear(), base.getMonth() + 3, base.getDate())
  return new Date(f.passportExpiry + "T00:00:00").getTime() >= need.getTime()
}
export const isoToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
