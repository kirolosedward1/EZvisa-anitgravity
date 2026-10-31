/**
 * What a specialist verifies per document type, and the quick reasons for sending a document back (Documents, Case
 * and Viewer boards). Shared by the DocumentReview panel everywhere it appears. Pure.
 */
export const CHECKLISTS: Record<string, string[]> = {
  passportCopy: [
    "Valid at least 3 months after the return date",
    "Issued within the last 10 years",
    "At least 2 blank pages",
    "All four corners visible, no glare",
  ],
  residencyCopy: [
    "Residence visa is valid at least 3 months after return",
    "Name and passport number match",
    "Sponsor is the employer on the employment letter",
    "Both sides present if Emirates ID",
  ],
  photo: [
    "Plain white background",
    "Face centred, neutral expression, no glasses",
    "Taken within the last 6 months",
    "35 x 45 mm proportions, head 70 to 80 percent",
  ],
  bankStatement: [
    "Account holder name matches the passport",
    "Covers the last 3 months, latest month included",
    "Bank stamp or e-stamp on the statement",
    "Closing balance is consistent with the trip budget",
    "Salary credits match the employment letter",
  ],
  nocCertificate: [
    "On company letterhead with stamp and signature",
    "Position, salary, start date and approved leave dates",
    "Dated within the last 30 days",
    "Contact details of HR present",
  ],
}

export function checklistFor(type: string): string[] {
  return CHECKLISTS[type] ?? ["Readable, complete and in the customer's name", "Matches the application details"]
}

/** Quick reasons: the text that fills the note the customer reads on their dashboard. */
export const QUICK_REASONS: { label: string; text: string }[] = [
  { label: "No bank stamp", text: "The statement is missing the bank stamp. Please download the stamped PDF from your bank app or ask the branch to stamp it." },
  { label: "Blurry", text: "The file is too blurry to read. Please photograph it flat, in daylight, with all four corners visible." },
  { label: "Too old", text: "This document is older than 30 days. Please upload a fresh one dated within the last month." },
  { label: "Wrong document", text: "This looks like a different document. Please upload the one requested in this row." },
]
