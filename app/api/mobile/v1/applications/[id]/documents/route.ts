import crypto from "crypto"
import { RATE_LIMITS } from "@/lib/rate-limit"
import { ApiError, getAdmin, handler, json, loadOwnedApplication, rateLimit, requireUser } from "@/lib/mobile/server"
import { ALL_DOCUMENT_TYPES, MAX_UPLOAD_BYTES, type DocumentType } from "@/lib/shared/visa-wizard"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const BUCKET = "visa_documents"

/** Same boolean flags the web upload route sets, so admin views stay accurate. */
const FLAG_FOR_TYPE: Partial<Record<DocumentType, string>> = {
  passportFront: "has_passport",
  passportBack: "has_passport",
  residencyCopy: "has_passport",
  photo: "has_photos",
  bankStatement: "has_bank_statements",
  salaryCertificate: "has_employment_proof",
  nocCertificate: "has_employment_proof",
}

/** Detect the real file type from its first bytes — never trust the client's Content-Type. */
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: "pdf" }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" }
  return null
}

/** POST multipart/form-data { file, documentType } — upload a supporting document. */
export const POST = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`upload:${user.id}`, RATE_LIMITS.standard)
  const { id } = await params
  const app = await loadOwnedApplication(user, id)
  if (app.application_status === "rejected") throw new ApiError(409, "closed", "This application is closed.")

  const declared = Number(request.headers.get("content-length") || 0)
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new ApiError(413, "too_large", "Files must be 5 MB or smaller.")

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new ApiError(400, "invalid_request", "Expected a multipart upload")
  }
  const file = form.get("file")
  const documentType = String(form.get("documentType") || "") as DocumentType
  if (!(file instanceof Blob)) throw new ApiError(400, "invalid_request", "Missing file")
  if (!ALL_DOCUMENT_TYPES.includes(documentType)) throw new ApiError(400, "invalid_request", "Unknown document type")
  if (file.size === 0) throw new ApiError(400, "invalid_request", "The file is empty")
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "too_large", "Files must be 5 MB or smaller.")

  const buf = Buffer.from(await file.arrayBuffer())
  const kind = sniff(buf)
  if (!kind) throw new ApiError(415, "unsupported_type", "Only PDF, JPG and PNG files are accepted.")

  // No personal data in the path — same convention as the web route.
  const path = `${app.id}/${documentType}_${crypto.randomUUID().slice(0, 8)}.${kind.ext}`
  const db = getAdmin()
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, buf, { contentType: kind.mime, upsert: false })
  if (upErr) {
    console.error("[mobile-upload] storage error", upErr)
    throw new ApiError(502, "storage_error", "Upload failed. Please try again.")
  }

  const originalName = file instanceof File ? file.name.slice(0, 200) : null
  const { data: doc, error: docErr } = await db
    .from("application_documents")
    .insert({
      application_id: app.id,
      document_type: documentType,
      storage_path: path,
      mime_type: kind.mime,
      size_bytes: buf.length,
      original_name: originalName,
      uploaded_via: "ios",
    })
    .select("id, document_type, mime_type, size_bytes, original_name, created_at")
    .single()
  if (docErr) {
    await db.storage.from(BUCKET).remove([path])
    throw docErr
  }

  const flag = FLAG_FOR_TYPE[documentType]
  if (flag) await db.from("visa_applications").update({ [flag]: true }).eq("id", app.id)

  return json(
    {
      document: {
        id: doc.id,
        type: doc.document_type,
        mimeType: doc.mime_type,
        sizeBytes: doc.size_bytes,
        name: doc.original_name,
        uploadedAt: doc.created_at,
      },
    },
    { status: 201 },
  )
})
