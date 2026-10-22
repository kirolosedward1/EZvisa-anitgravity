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

// ---- After payment (Continue application): passport number + employment, as in the app (mobile/lib/wizard.ts,
// mobile/lib/data.ts continueForm / needsContinue). Same fields, same rules, same notes keys.
type Answers = Record<string, unknown>
const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "")
export const isPaidStatus = (p?: string | null) => p === "paid" || p === "completed"
export const parseNotes = (s?: string | null): Record<string, any> => {
  try {
    const j = s ? JSON.parse(s) : {}
    return j && typeof j === "object" ? j : {}
  } catch {
    return {}
  }
}

/** Employment answers complete (the website's employment rules, also the app's validateEmployment). */
export function employmentComplete(f: Answers) {
  const status = txt(f.employmentStatus)
  if (!status) return false
  if (status === "employed") return !!(txt(f.jobTitle) && txt(f.companyName) && txt(f.employmentStartDate) && txt(f.monthlySalary))
  if (status === "business" || status === "freelancer") return !!(txt(f.companyName) && txt(f.averageMonthlyIncome))
  return true
}
/** Passport number is required unless the applicant said they have no valid passport. */
export const passportNumberComplete = (f: Answers) => f.hasValidPassport === "no" || !!txt(f.passportNumber)
export const continueComplete = (f: Answers) => employmentComplete(f) && passportNumberComplete(f)

/** The after-payment answers of a row: the wizard notes, with the passport_number column as fallback. */
export function continueAnswers(app: { additional_notes?: string | null; passport_number?: string | null }): Answers {
  const n = parseNotes(app.additional_notes)
  const w = (n.wizard ?? {}) as Answers
  return { ...w, employmentStatus: w.employmentStatus ?? n.employmentStatus, passportNumber: txt(w.passportNumber) || app.passport_number || "" }
}
/** Paid, still open, and the passport number / employment answers are not all there yet. */
export const needsContinue = (app: { payment_status?: string | null; application_status?: string | null; additional_notes?: string | null; passport_number?: string | null }) =>
  isPaidStatus(app.payment_status) && ["submitted", "draft", "reviewing"].includes(app.application_status ?? "submitted") && !continueComplete(continueAnswers(app))
