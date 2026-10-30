/**
 * Server-side reads for document reviews and upload records (dashboard case page and GET /api/upload-document).
 * Reads go through the service role. Until supabase/migrations/003_document_reviews.sql is applied, the table is
 * missing and every read returns no reviews, so the pages behave as before.
 */
import { serviceClient, UUID_RE } from "@/lib/applications"
import { DEMO_DOCUMENT_REVIEWS } from "@/lib/demo-data"
import { toDocumentReviews, type DocumentReviews } from "@/lib/document-reviews"
export { uploadRecords } from "@/lib/document-reviews"

export async function loadDocumentReviews(applicationId?: string | null): Promise<DocumentReviews> {
  if (!applicationId) return {}
  const demo = DEMO_DOCUMENT_REVIEWS[applicationId]
  if (demo) return toDocumentReviews(demo)
  if (!UUID_RE.test(applicationId)) return {}
  const client = serviceClient()
  if (!client) return {}
  try {
    const { data, error } = await client
      .from("document_reviews")
      .select("document_type, status, note, reviewed_at")
      .eq("application_id", applicationId)
    return error ? {} : toDocumentReviews(data)
  } catch {
    return {}
  }
}
