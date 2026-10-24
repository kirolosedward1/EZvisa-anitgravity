import { applicantCount } from "./currency"

type NotesInput = {
  maritalStatus?: string | null
  employmentStatus?: string | null
  jobTitle?: string | null
  companyName?: string | null
  monthlySalary?: string | null
  travelingWith?: string | null
  spouseAccompanying?: string | null
  applicantCount?: number | null
  firstName?: string | null
  lastName?: string | null
  passportNumber?: string | null
  spouseFirstName?: string | null
  spouseLastName?: string | null
  spouseHasValidPassport?: string | null
  spouseOccupation?: string | null
  flexibleDates?: string | null
  wizard?: { spouseAccompanying?: string | null } | null
}

export function withSpouse(input: NotesInput) {
  return applicantCount(input.spouseAccompanying, input.travelingWith) === 2 || input.applicantCount === 2
}

/** Applicant count the payment server reads. Only 1 or 2 are valid. */
export function pricedApplicants(notes: NotesInput) {
  const wizard = notes.wizard as { spouseAccompanying?: string | null; travelingWith?: string | null } | null | undefined
  const spouse =
    notes.spouseAccompanying === "yes" ||
    notes.travelingWith === "spouse" ||
    wizard?.spouseAccompanying === "yes" ||
    wizard?.travelingWith === "spouse"
  if (spouse) return 2
  return Number(notes.applicantCount) === 2 ? 2 : 1
}

/** Stored on the application. Ziina uses applicantCount, and the spouse's details travel with it. */
export function applicationNotes(input: NotesInput) {
  const spouse = withSpouse(input)
  const notes: Record<string, unknown> = {
    maritalStatus: spouse ? "married" : input.maritalStatus || "",
    employmentStatus: input.employmentStatus || "",
    jobTitle: input.jobTitle || "",
    companyName: input.companyName || "",
    monthlySalary: input.monthlySalary || "",
    travelingWith: input.travelingWith || "",
    spouseAccompanying: spouse ? "yes" : "no",
    applicantCount: spouse ? 2 : 1,
  }
  if (input.flexibleDates) notes.flexibleDates = input.flexibleDates
  if (spouse) {
    notes.spouseFirstName = input.spouseFirstName || ""
    notes.spouseLastName = input.spouseLastName || ""
    notes.spouseHasValidPassport = input.spouseHasValidPassport || ""
    notes.spouseOccupation = input.spouseOccupation || ""
    notes.wizard = {
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      passportNumber: input.passportNumber || "",
      spouseAccompanying: "yes",
      spouseFirstName: input.spouseFirstName || "",
      spouseLastName: input.spouseLastName || "",
    }
  }
  return notes
}

/** The submit body. File fields stay as they are; the count and spouse flag are explicit.
 *  travelingWith "spouse" always sends spouseAccompanying "yes", which is what main prices from.
 */
export function submitBody<T extends NotesInput>(formData: T) {
  const spouse = formData.travelingWith === "spouse" || withSpouse(formData)
  return {
    ...formData,
    maritalStatus: spouse ? "married" : formData.maritalStatus,
    spouseAccompanying: spouse ? "yes" : formData.spouseAccompanying || "no",
    applicantCount: spouse ? 2 : 1,
  }
}
