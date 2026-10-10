import { NextResponse } from "next/server"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { checkRateLimit, rateLimitHeaders, type RateLimitConfig } from "@/lib/rate-limit"
import {
  normalizeWizardData,
  stageOf,
  STAGE_LABELS,
  priceAED,
  documentRequirements,
  type WizardData,
} from "@/lib/shared/visa-wizard"

/**
 * Shared plumbing for /api/mobile/v1/*.
 *
 * The iOS app signs in with Supabase Auth directly (same project and same
 * accounts as the website) and sends `Authorization: Bearer <access_token>`.
 * Every route verifies that token with Supabase, then uses the service role
 * with an explicit ownership check, so a user can only ever touch their own
 * applications.
 */

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers || {}) },
  })
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status })
  }
  console.error("[mobile-api] unexpected error", err)
  return json({ error: { code: "internal", message: "Something went wrong. Please try again." } }, { status: 500 })
}

/** Wraps a handler so thrown ApiErrors become JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (err) {
      return errorResponse(err)
    }
  }
}

let admin: SupabaseClient | null = null

export function getAdmin(): SupabaseClient {
  if (admin) return admin
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new ApiError(500, "not_configured", "Server is not configured")
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

export async function requireUser(request: Request): Promise<User> {
  const header = request.headers.get("authorization") || ""
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) throw new ApiError(401, "unauthenticated", "Please sign in")
  const { data, error } = await getAdmin().auth.getUser(match[1])
  if (error || !data.user) throw new ApiError(401, "unauthenticated", "Your session has expired. Please sign in again.")
  return data.user
}

export async function rateLimit(key: string, config: RateLimitConfig) {
  const result = await checkRateLimit(`mobile:${key}`, config)
  if (!result.success) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", {
      headers: rateLimitHeaders(result, config),
    })
  }
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json()
    if (!body || typeof body !== "object") throw new Error()
    return body as T
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be a JSON object")
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function assertUuid(id: string, what = "id") {
  if (!UUID_RE.test(id)) throw new ApiError(404, "not_found", `Unknown ${what}`)
}

/** A user owns an application if it is linked to them, or (legacy web rows) its email matches their verified email. */
export function ownsApplication(user: User, row: { user_id: string | null; email: string | null }) {
  if (row.user_id) return row.user_id === user.id
  return !!(row.email && user.email && user.email_confirmed_at && row.email.toLowerCase() === user.email.toLowerCase())
}

export const APPLICATION_COLUMNS =
  "id, user_id, email, full_name, nationality, destination_country, entry_date, exit_date, " +
  "application_status, payment_status, payment_amount, payment_id, tracking_token, wizard_data, " +
  "current_step, version, source, submitted_at, created_at, updated_at, additional_notes, travel_purpose, " +
  "has_passport, has_photos, has_bank_statements, has_employment_proof"

export interface ApplicationRow {
  id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  nationality: string | null
  destination_country: string | null
  entry_date: string | null
  exit_date: string | null
  application_status: string | null
  payment_status: string | null
  payment_amount: number | null
  payment_id: string | null
  tracking_token: string | null
  wizard_data: unknown
  current_step: number
  version: number
  source: string
  submitted_at: string | null
  created_at: string
  updated_at: string
  additional_notes: string | null
  travel_purpose: string | null
}

/** Loads an application and enforces ownership. Links legacy email-matched rows to the user on first access. */
export async function loadOwnedApplication(user: User, id: string): Promise<ApplicationRow> {
  assertUuid(id, "application")
  const { data, error } = await getAdmin().from("visa_applications").select(APPLICATION_COLUMNS).eq("id", id).maybeSingle()
  if (error) throw error
  const row = data as unknown as ApplicationRow | null
  // Same response for "missing" and "not yours" so ids can't be probed.
  if (!row || !ownsApplication(user, row)) throw new ApiError(404, "not_found", "Application not found")
  if (!row.user_id) {
    await getAdmin().from("visa_applications").update({ user_id: user.id }).eq("id", row.id).is("user_id", null)
    row.user_id = user.id
  }
  return row
}

/**
 * Applications submitted on the web store the wizard answers in columns and
 * a JSON blob in additional_notes, not in wizard_data. Rebuild what we can so
 * the app shows them with the same fields.
 */
export function wizardDataOf(row: ApplicationRow): WizardData {
  const fromDraft = normalizeWizardData(row.wizard_data)
  if (row.application_status === "draft" || fromDraft.firstName) return fromDraft
  let notes: Record<string, unknown> = {}
  try {
    notes = row.additional_notes ? JSON.parse(row.additional_notes) : {}
  } catch {
    // free text notes
  }
  const [firstName, ...rest] = (row.full_name || "").split(" ")
  return normalizeWizardData({
    ...notes,
    firstName,
    lastName: rest.join(" "),
    email: row.email || "",
    nationality: row.nationality || "",
    destination: row.destination_country || "",
    travelStartDate: row.entry_date || "",
    travelEndDate: row.exit_date || "",
    purposeOfTrip: row.travel_purpose || "",
  })
}

export function serializeApplication(row: ApplicationRow) {
  const wizard = wizardDataOf(row)
  return {
    id: row.id,
    reference: row.tracking_token ? `EZ-${row.tracking_token.slice(0, 8).toUpperCase()}` : null,
    status: row.application_status || "submitted",
    paymentStatus: row.payment_status || "pending",
    stage: stageOf(row.application_status, row.payment_status),
    stageLabel: STAGE_LABELS[stageOf(row.application_status, row.payment_status)],
    applicantName: row.full_name || [wizard.firstName, wizard.lastName].filter(Boolean).join(" ") || null,
    destination: row.destination_country || wizard.destination || null,
    travelStartDate: row.entry_date || wizard.travelStartDate || null,
    travelEndDate: row.exit_date || wizard.travelEndDate || null,
    amountAED: row.payment_amount ?? priceAED(wizard),
    currentStep: row.current_step,
    version: row.version,
    source: row.source,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wizardData: wizard,
    documentRequirements: documentRequirements(wizard),
  }
}
