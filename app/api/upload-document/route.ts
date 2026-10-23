import { type NextRequest, NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { checkRateLimit, getClientIp, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit"
import { isDemoToken, getDemoApplicationByToken } from "@/lib/demo-data"
import {
  DOC_BUCKET,
  DOC_FLAG,
  MAX_UPLOAD_BYTES,
  UPLOAD_MIME,
  UPLOAD_STATUSES,
  continueAnswers,
  isPaid,
  isUploadType,
  parseNotes,
  requiredFlags,
} from "@/lib/shared/wizard-contract"

// Document upload desk shared by the website (tracking link or signed-in dashboard) and the mobile app.
// Bucket, path scheme (<applicationId>/<type>_<uploadId>.<ext>), document types and the has_* flag each type sets all
// come from lib/shared/wizard-contract.ts, which the app mirrors in mobile/lib/wizard.ts.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const APP_COLUMNS =
  "id, email, destination_country, full_name, has_passport, has_photos, has_bank_statements, has_employment_proof, application_status, payment_status, tracking_token, additional_notes, passport_number"

function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/** The signed-in user's email from an `Authorization: Bearer <access token>` header (the app and the dashboard send it). */
async function bearerEmail(request: NextRequest, supabase: SupabaseClient): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? ""
  const jwt = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
  if (!jwt) return null
  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data.user?.email) return null
  return data.user.email.toLowerCase()
}

/** What the upload pages need: the row's flags plus which flags this case actually requires (NOC only for employees). */
function statusView(row: Record<string, unknown>) {
  const required = requiredFlags(continueAnswers(row as { additional_notes?: string | null; passport_number?: string | null }).employmentStatus)
  return {
    id: row.id,
    destination_country: row.destination_country,
    full_name: row.full_name,
    has_passport: row.has_passport,
    has_photos: row.has_photos,
    has_bank_statements: row.has_bank_statements,
    has_employment_proof: row.has_employment_proof,
    application_status: row.application_status,
    payment_status: row.payment_status,
    tracking_token: row.tracking_token,
    required,
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`upload:${clientIp}`, RATE_LIMITS.standard)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimitResult, RATE_LIMITS.standard) },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const applicationId = String(formData.get("applicationId") ?? "")
    const trackingToken = String(formData.get("trackingToken") ?? "")
    const documentType = String(formData.get("documentType") ?? "")

    if (!(file instanceof File) || !documentType || (!applicationId && !trackingToken)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }
    if (!(file.type in UPLOAD_MIME)) {
      return NextResponse.json({ error: "Invalid file type. Only PDF, JPG, PNG allowed." }, { status: 400 })
    }
    if (!isUploadType(documentType)) {
      return NextResponse.json({ error: "Unknown document type" }, { status: 400 })
    }

    if (trackingToken && isDemoToken(trackingToken)) {
      const demoApp = getDemoApplicationByToken(trackingToken)
      if (demoApp) demoApp[DOC_FLAG[documentType]] = true
      return NextResponse.json({ success: true, path: `demo-uploads/${documentType}.pdf` })
    }

    const supabase = serviceClient()
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 })
    }

    // Ownership. The tracking token (website upload desk) is a secret link. An application id is not, so it needs the
    // signed-in user's session: the case must be theirs (same email, as on the dashboard and in the app) and paid.
    let userEmail: string | null = null
    if (!trackingToken) {
      if (!UUID_RE.test(applicationId)) {
        return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 403 })
      }
      userEmail = await bearerEmail(request, supabase)
      if (!userEmail) {
        return NextResponse.json({ error: "Please sign in to upload documents" }, { status: 401 })
      }
    }

    let query = supabase.from("visa_applications").select("id, email, payment_status, application_status, additional_notes")
    query = trackingToken ? query.eq("tracking_token", trackingToken) : query.eq("id", applicationId)
    const { data: appData, error: appError } = await query.single()
    if (appError || !appData || (userEmail && String(appData.email ?? "").toLowerCase() !== userEmail)) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 403 })
    }
    if (userEmail && !isPaid(appData)) {
      return NextResponse.json({ error: "Documents can be uploaded after payment" }, { status: 403 })
    }
    if (appData.application_status && !UPLOAD_STATUSES.includes(appData.application_status)) {
      return NextResponse.json({ error: "This application no longer takes documents" }, { status: 409 })
    }

    const verifiedAppId = appData.id as string

    // No applicant name or PII in the object name. The app sends a stable uploadId per file, so a retry after a lost
    // response overwrites the same object; the website desk sends a fresh one per upload.
    const uploadId = formData.get("uploadId")
    const fileId = typeof uploadId === "string" && UUID_RE.test(uploadId) ? uploadId.toLowerCase() : crypto.randomUUID().substring(0, 8)
    const safeFilename = `${verifiedAppId}/${documentType}_${fileId}.${UPLOAD_MIME[file.type]}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DOC_BUCKET)
      .upload(safeFilename, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("Supabase upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload to secure storage" }, { status: 500 })
    }

    // Flag + exact upload record in additional_notes.uploads (what the app's checklist and timeline read).
    const notes = parseNotes(appData.additional_notes)
    const uploads = notes.uploads ?? []
    if (!uploads.some((u) => u.path === uploadData.path)) {
      notes.uploads = [...uploads, { type: documentType, path: uploadData.path, name: file.name.slice(0, 120), at: new Date().toISOString() }]
    }
    const { error: updateError } = await supabase
      .from("visa_applications")
      .update({ [DOC_FLAG[documentType]]: true, additional_notes: JSON.stringify(notes), updated_at: new Date().toISOString() })
      .eq("id", verifiedAppId)
    if (updateError) console.error("Upload flag update error:", updateError)

    return NextResponse.json({ success: true, path: uploadData.path })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Server error during upload" }, { status: 500 })
  }
}

/**
 * Status for the upload pages: `?token=<tracking token>` (secret link) or `?id=<application id>` with the signed-in
 * user's Bearer token (dashboard and app). Returns the row's has_* flags and the flags this case requires.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const id = searchParams.get("id")
    if (!token && !id) {
      return NextResponse.json({ error: "Missing tracking token or application id" }, { status: 400 })
    }
    if (id && !UUID_RE.test(id)) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (token && isDemoToken(token)) {
      const demoApp = getDemoApplicationByToken(token)
      if (demoApp) return NextResponse.json({ success: true, app: { ...demoApp, required: requiredFlags("employed") } })
    }

    const supabase = serviceClient()
    if (!supabase) {
      const demoApp = token ? getDemoApplicationByToken(token) : null
      if (demoApp) return NextResponse.json({ success: true, app: { ...demoApp, required: requiredFlags("employed") } })
      return NextResponse.json({ error: "Storage/Database not configured" }, { status: 500 })
    }

    if (id) {
      const userEmail = await bearerEmail(request, supabase)
      if (!userEmail) {
        return NextResponse.json({ error: "Please sign in to see this application" }, { status: 401 })
      }
      const { data: row, error } = await supabase.from("visa_applications").select(APP_COLUMNS).eq("id", id).single()
      if (error || !row || String(row.email ?? "").toLowerCase() !== userEmail) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, app: statusView(row) })
    }

    const { data: row, error } = await supabase.from("visa_applications").select(APP_COLUMNS).eq("tracking_token", token).single()
    if (error || !row) {
      const demoApp = getDemoApplicationByToken(token as string)
      if (demoApp) return NextResponse.json({ success: true, app: { ...demoApp, required: requiredFlags("employed") } })
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, app: statusView(row) })
  } catch {
    return NextResponse.json({ error: "Server error during status check" }, { status: 500 })
  }
}
