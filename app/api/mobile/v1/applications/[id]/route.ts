import { RATE_LIMITS } from "@/lib/rate-limit"
import {
  APPLICATION_COLUMNS,
  ApiError,
  getAdmin,
  handler,
  json,
  loadOwnedApplication,
  rateLimit,
  readJson,
  requireUser,
  serializeApplication,
  type ApplicationRow,
} from "@/lib/mobile/server"
import { normalizeWizardData } from "@/lib/shared/visa-wizard"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** GET — application with uploaded documents and status timeline. */
export const GET = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`get:${user.id}`, RATE_LIMITS.relaxed)
  const { id } = await params
  const row = await loadOwnedApplication(user, id)
  const db = getAdmin()

  const [docs, history] = await Promise.all([
    db
      .from("application_documents")
      .select("id, document_type, mime_type, size_bytes, original_name, created_at")
      .eq("application_id", row.id)
      .order("created_at", { ascending: false }),
    db
      .from("application_status_history")
      .select("application_status, payment_status, created_at")
      .eq("application_id", row.id)
      .order("created_at", { ascending: true }),
  ])

  return json({
    application: serializeApplication(row),
    documents: (docs.data || []).map((d) => ({
      id: d.id,
      type: d.document_type,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      name: d.original_name,
      uploadedAt: d.created_at,
    })),
    history: (history.data || []).map((h) => ({
      status: h.application_status,
      paymentStatus: h.payment_status,
      at: h.created_at,
    })),
  })
})

/**
 * PATCH — save draft answers.
 * Body: { wizardData, currentStep, version }. `version` must match the stored
 * version, otherwise 409 with the latest server copy so the client can merge
 * (e.g. the same draft was edited on another device).
 */
export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`save:${user.id}`, RATE_LIMITS.relaxed)
  const { id } = await params
  const row = await loadOwnedApplication(user, id)
  if (row.application_status !== "draft") {
    throw new ApiError(409, "not_editable", "This application has already been submitted and can no longer be edited.")
  }

  const body = await readJson<{ wizardData?: unknown; currentStep?: unknown; version?: unknown }>(request)
  if (typeof body.version !== "number") throw new ApiError(400, "invalid_request", "version is required")
  const wizardData = normalizeWizardData(body.wizardData)
  wizardData.email = row.email || wizardData.email
  const currentStep = Math.min(5, Math.max(1, Math.trunc(Number(body.currentStep) || 1)))

  const { data, error } = await getAdmin()
    .from("visa_applications")
    .update({
      wizard_data: wizardData,
      current_step: currentStep,
      destination_country: wizardData.destination || null,
    })
    .eq("id", row.id)
    .eq("version", body.version)
    .eq("application_status", "draft")
    .select(APPLICATION_COLUMNS)
    .maybeSingle()
  if (error) throw error

  if (!data) {
    const latest = await loadOwnedApplication(user, id)
    return json(
      {
        error: { code: "version_conflict", message: "This draft was updated on another device." },
        application: serializeApplication(latest),
      },
      { status: 409 },
    )
  }
  return json({ application: serializeApplication(data as unknown as ApplicationRow) })
})

/** DELETE — discard a draft (submitted applications are kept). */
export const DELETE = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`delete:${user.id}`, RATE_LIMITS.standard)
  const { id } = await params
  const row = await loadOwnedApplication(user, id)
  if (row.application_status !== "draft") {
    throw new ApiError(409, "not_deletable", "Submitted applications can't be deleted. Contact support for help.")
  }
  const { error } = await getAdmin().from("visa_applications").delete().eq("id", row.id).eq("application_status", "draft")
  if (error) throw error
  return json({ ok: true })
})
