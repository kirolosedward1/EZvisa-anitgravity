/** The application details staff may edit on behalf of the customer (Case board), and their current values. Pure. */
import { z } from "zod"
import { EMPLOYMENT, MARITAL, parseNotes, PURPOSES, SCHENGEN, type WizardAnswers } from "@/lib/shared/wizard-contract"

const opt = (vals: string[]) => z.union([z.enum(vals as [string, ...string[]]), z.literal("")])
const date = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])

export const editableFields = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60),
  dateOfBirth: date,
  nationality: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  destination: z.enum(SCHENGEN as [string, ...string[]]),
  purposeOfTrip: opt(PURPOSES.map((p) => p.value)),
  travelStartDate: date,
  travelEndDate: date,
  maritalStatus: opt(MARITAL.map((m) => m.value)),
  spouseAccompanying: z.enum(["yes", "no", ""]),
  employmentStatus: opt(EMPLOYMENT.map((e) => e.value)),
  companyName: z.string().trim().max(120),
  jobTitle: z.string().trim().max(120),
  employmentStartDate: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("")]),
  fundingSource: z.enum(["self", "sponsor", "company", ""]),
  isFirstSchengenVisa: z.enum(["yes", "no", ""]),
  previousRefusals: z.enum(["yes", "no", ""]),
  passportNumber: z.string().trim().max(20),
  passportExpiry: date,
})
export type EditableFields = z.infer<typeof editableFields>

/** The current answers for the form: row columns first, then the stored wizard answers. */
export function editableAnswers(row: Record<string, unknown>): EditableFields {
  const w = (parseNotes(row.additional_notes as string | null).wizard ?? {}) as Partial<WizardAnswers>
  const [first = "", ...rest] = String(row.full_name ?? "").trim().split(/\s+/)
  const s = (v: unknown) => (typeof v === "string" ? v : "")
  return {
    firstName: w.firstName || first,
    lastName: w.lastName ?? rest.join(" "),
    dateOfBirth: s(w.dateOfBirth || row.date_of_birth).slice(0, 10),
    nationality: w.nationality || s(row.nationality),
    phone: w.phone || s(row.phone),
    destination: w.destination || s(row.destination_country) || "France",
    purposeOfTrip: w.purposeOfTrip || s(row.travel_purpose),
    travelStartDate: s(w.travelStartDate || row.entry_date || row.travel_start_date).slice(0, 10),
    travelEndDate: s(w.travelEndDate || row.exit_date || row.travel_end_date).slice(0, 10),
    maritalStatus: w.maritalStatus ?? "",
    spouseAccompanying: w.spouseAccompanying ?? "",
    employmentStatus: w.employmentStatus ?? "",
    companyName: w.companyName ?? "",
    jobTitle: w.jobTitle ?? "",
    employmentStartDate: w.employmentStartDate ?? "",
    fundingSource: (w.fundingSource as EditableFields["fundingSource"]) ?? "",
    isFirstSchengenVisa: w.isFirstSchengenVisa ?? "",
    previousRefusals: w.previousRefusals ?? "",
    passportNumber: w.passportNumber || s(row.passport_number),
    passportExpiry: s(w.passportExpiry).slice(0, 10),
  } as EditableFields
}
