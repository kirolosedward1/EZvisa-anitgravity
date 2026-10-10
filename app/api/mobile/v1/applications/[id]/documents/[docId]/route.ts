import { RATE_LIMITS } from "@/lib/rate-limit"
import {
  ApiError,
  assertUuid,
  getAdmin,
  handler,
  json,
  loadOwnedApplication,
  rateLimit,
  requireUser,
} from "@/lib/mobile/server"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; docId: string }> }

const BUCKET = "visa_documents"

async function loadDoc(request: Request, { params }: Ctx) {
  const user = await requireUser(request)
  await rateLimit(`doc:${user.id}`, RATE_LIMITS.standard)
  const { id, docId } = await params
  const app = await loadOwnedApplication(user, id)
  assertUuid(docId, "document")
  const { data, error } = await getAdmin()
    .from("application_documents")
    .select("id, storage_path, document_type")
    .eq("id", docId)
    .eq("application_id", app.id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, "not_found", "Document not found")
  return { app, doc: data }
}

/** GET — short-lived signed URL to view the uploaded file. */
export const GET = handler(async (request: Request, ctx: Ctx) => {
  const { doc } = await loadDoc(request, ctx)
  const { data, error } = await getAdmin().storage.from(BUCKET).createSignedUrl(doc.storage_path, 300)
  if (error || !data) throw new ApiError(502, "storage_error", "Couldn't open this document")
  return json({ url: data.signedUrl, expiresIn: 300 })
})

/** DELETE — remove an upload (only while the experts haven't started). */
export const DELETE = handler(async (request: Request, ctx: Ctx) => {
  const { app, doc } = await loadDoc(request, ctx)
  if (!["draft", "submitted"].includes(app.application_status || "")) {
    throw new ApiError(409, "locked", "Documents are locked while your file is being prepared. Contact support to change them.")
  }
  const db = getAdmin()
  const { error } = await db.from("application_documents").delete().eq("id", doc.id)
  if (error) throw error
  await db.storage.from(BUCKET).remove([doc.storage_path])
  return json({ ok: true })
})
