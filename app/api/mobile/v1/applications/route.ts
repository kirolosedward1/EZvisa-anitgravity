import { RATE_LIMITS } from "@/lib/rate-limit"
import {
  APPLICATION_COLUMNS,
  getAdmin,
  handler,
  json,
  rateLimit,
  readJson,
  requireUser,
  serializeApplication,
  type ApplicationRow,
} from "@/lib/mobile/server"
import { EMPTY_WIZARD_DATA, normalizeWizardData } from "@/lib/shared/visa-wizard"

export const dynamic = "force-dynamic"

const MAX_OPEN_DRAFTS = 5

/** GET /api/mobile/v1/applications — every application owned by the signed-in user (web + iOS). */
export const GET = handler(async (request: Request) => {
  const user = await requireUser(request)
  await rateLimit(`list:${user.id}`, RATE_LIMITS.relaxed)
  const db = getAdmin()

  // Link applications submitted on the web with this (verified) email before the user had an account.
  if (user.email && user.email_confirmed_at) {
    // ilike for case-insensitivity; escape LIKE wildcards so "_" or "%" in an address can't match other rows.
    const exactEmail = user.email.replace(/[\\%_]/g, (c) => `\\${c}`)
    await db.from("visa_applications").update({ user_id: user.id }).is("user_id", null).ilike("email", exactEmail)
  }

  const { data, error } = await db
    .from("visa_applications")
    .select(APPLICATION_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw error

  return json({ applications: (data as unknown as ApplicationRow[]).map(serializeApplication) })
})

/** POST /api/mobile/v1/applications — start a new server-side draft. */
export const POST = handler(async (request: Request) => {
  const user = await requireUser(request)
  await rateLimit(`create:${user.id}`, RATE_LIMITS.standard)
  const body = await readJson<{ wizardData?: unknown }>(request)
  const db = getAdmin()

  const { count } = await db
    .from("visa_applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("application_status", "draft")
  if ((count ?? 0) >= MAX_OPEN_DRAFTS) {
    return json(
      { error: { code: "too_many_drafts", message: "You already have several drafts. Continue or delete one first." } },
      { status: 409 },
    )
  }

  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const [metaFirst, ...metaRest] = String(meta.full_name || "").split(" ")
  const wizardData = normalizeWizardData({
    ...EMPTY_WIZARD_DATA,
    firstName: metaFirst || "",
    lastName: metaRest.join(" "),
    phone: typeof meta.phone === "string" ? meta.phone : "",
    ...(body.wizardData && typeof body.wizardData === "object" ? body.wizardData : {}),
    email: user.email || "",
  })

  const { data, error } = await db
    .from("visa_applications")
    .insert({
      user_id: user.id,
      email: user.email,
      application_status: "draft",
      payment_status: "pending",
      wizard_data: wizardData,
      current_step: 1,
      source: "ios",
      destination_country: wizardData.destination || null,
    })
    .select(APPLICATION_COLUMNS)
    .single()
  if (error) throw error

  return json({ application: serializeApplication(data as unknown as ApplicationRow) }, { status: 201 })
})
