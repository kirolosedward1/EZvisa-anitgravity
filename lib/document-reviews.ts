/**
 * Per-document review state shared by the dashboard, both upload desks and GET /api/upload-document (which the app
 * also reads). Reviews come from the document_reviews table (supabase/migrations/003_document_reviews.sql); uploads
 * from additional_notes.uploads. Pure: no server imports, so client components can use it too.
 */
import { parseNotes } from "@/lib/shared/wizard-contract"

export type ReviewStatus = "received" | "checking" | "approved" | "rejected"

export type DocumentReview = { status: ReviewStatus; note: string | null; reviewedAt: string }

/** Latest review per document type. */
export type DocumentReviews = Record<string, DocumentReview>

/** What the customer sees of an upload: its file name and when it arrived (no storage path). */
export type UploadRecord = { type: string; name: string; at: string }

export type RowState = "missing" | "received" | "checking" | "approved" | "rejected"

const STATUSES: ReviewStatus[] = ["received", "checking", "approved", "rejected"]

/** Rows from the table (or an API response) into one review per document type, newest wins. */
export function toDocumentReviews(rows: unknown): DocumentReviews {
  const out: DocumentReviews = {}
  if (!Array.isArray(rows)) return out
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const r = row as Record<string, unknown>
    const type = typeof r.document_type === "string" ? r.document_type : ""
    const status = r.status as ReviewStatus
    const reviewedAt = typeof r.reviewed_at === "string" ? r.reviewed_at : ""
    if (!type || !STATUSES.includes(status)) continue
    if (out[type] && out[type].reviewedAt >= reviewedAt) continue
    out[type] = { status, note: typeof r.note === "string" && r.note.trim() ? r.note.trim() : null, reviewedAt }
  }
  return out
}

/** The newest upload of a document type, if the row recorded one. */
export function latestUpload(uploads: UploadRecord[] | undefined, type: string): UploadRecord | undefined {
  return (uploads ?? []).filter((u) => u.type === type).sort((a, b) => b.at.localeCompare(a.at))[0]
}

/**
 * One checklist row's state. A rejection only stands until a newer file of that type arrives; after that the row is
 * received again (back in the queue). Without a review, the has_* flag decides.
 */
export function rowState(type: string, flagged: boolean, reviews?: DocumentReviews, uploads?: UploadRecord[]): RowState {
  const review = reviews?.[type]
  const upload = latestUpload(uploads, type)
  if (review?.status === "rejected") return upload && upload.at > review.reviewedAt ? "received" : "rejected"
  if (!flagged) return "missing"
  if (review?.status === "approved") return "approved"
  if (review?.status === "checking") return "checking"
  return "received"
}

export function isRowIn(state: RowState): boolean {
  return state === "received" || state === "checking" || state === "approved"
}

/** The upload records the customer may see: type, file name and time, never the storage path. */
export function uploadRecords(additionalNotes?: string | null): UploadRecord[] {
  return (parseNotes(additionalNotes).uploads ?? [])
    .filter((u) => u && typeof u.type === "string" && typeof u.at === "string")
    .map((u) => ({ type: u.type, name: typeof u.name === "string" ? u.name : "", at: u.at }))
}
