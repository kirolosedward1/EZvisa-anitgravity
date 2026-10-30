/**
 * What the dashboard says about a case beyond its status pill: whose turn it is and whether it needs the customer.
 * Built from lib/application-status.ts and the shared contract, so the dashboard, the tracking page and the app agree.
 */
import { customerProgress, detailsMissing, getStage, isPaid, type ApplicationLike } from "@/lib/application-status"
import { DOC_FLAG, REQUIREMENTS, parseNotes, requiredFlags } from "@/lib/shared/wizard-contract"
import type { CustomerKey } from "@/lib/translations/customer"
import { isRowIn, rowState, uploadRecords, type DocumentReviews, type RowState } from "@/lib/document-reviews"

export type Turn = "you" | "us"

/** "Next: you" while the customer has something to do, "Next: us" while EZvisa works, nothing for closed cases. */
export function whoseTurn(app: ApplicationLike, reviews?: DocumentReviews): Turn | null {
  const stage = getStage(app)
  if (stage === "cancelled" || stage === "rejected") return null
  if (stage === "payment" || stage === "documents") return "you"
  if (stage === "review" && reviews && customerDocuments(app, reviews).missing.length > 0) return "you"
  if (stage === "review" || stage === "preparation") return detailsMissing(app) ? "you" : "us"
  return customerProgress(app).finished ? null : "you"
}

/**
 * A paid case waiting on the customer. Unpaid drafts are not counted: they may be abandoned, and their switcher card
 * already says "Payment due".
 */
export function needsAttention(app: ApplicationLike): boolean {
  return isPaid(app) && whoseTurn(app) === "you"
}

export function attentionCount(apps: ApplicationLike[]): number {
  return apps.filter(needsAttention).length
}

/** Catalog titles for the checklist rows (Arabic pages use these; English uses the requirement's own title). */
export const DOC_TITLE_KEY: Record<string, CustomerKey> = {
  passportCopy: "docs.passportBio",
  residencyCopy: "docs.residency",
  photo: "docs.photo",
  bankStatement: "docs.bank",
  nocCertificate: "docs.noc",
}

/**
 * The customer's own document rows for this case (the same list the upload desk and the app show), each with its
 * state, and how many are in. Rows can share a flag (residence visa and passport both set has_passport), so counts
 * are per row. A row sent back for a new file (document_reviews) does not count as in.
 */
export function customerDocuments(app: ApplicationLike, reviews?: DocumentReviews) {
  const notes = parseNotes(app.additional_notes)
  const needed = requiredFlags(notes.wizard?.employmentStatus ?? notes.employmentStatus)
  const uploads = uploadRecords(app.additional_notes)
  const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && needed.includes(DOC_FLAG[r.document_type])).map((r) => ({
    ...r,
    state: rowState(r.document_type, !!app[DOC_FLAG[r.document_type]], reviews, uploads) as RowState,
  }))
  return {
    rows,
    uploads,
    status: Object.fromEntries(needed.map((flag) => [flag, !!app[flag]])) as Record<string, boolean>,
    received: rows.filter((r) => isRowIn(r.state)).length,
    total: rows.length,
    missing: rows.filter((r) => !isRowIn(r.state)),
  }
}
