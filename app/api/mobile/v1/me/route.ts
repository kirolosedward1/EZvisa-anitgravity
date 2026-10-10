import { RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, sanitizePhone } from "@/lib/sanitize"
import { ApiError, getAdmin, handler, json, rateLimit, readJson, requireUser } from "@/lib/mobile/server"
import type { User } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function profileOf(user: User) {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: !!user.email_confirmed_at,
    fullName: typeof meta.full_name === "string" ? meta.full_name : "",
    phone: typeof meta.phone === "string" ? meta.phone : "",
    createdAt: user.created_at,
  }
}

/** GET — the signed-in user's profile (same Supabase account as the website). */
export const GET = handler(async (request: Request) => {
  const user = await requireUser(request)
  return json({ profile: profileOf(user) })
})

/** PATCH { fullName?, phone? } — update profile fields stored in user_metadata (shared with web). */
export const PATCH = handler(async (request: Request) => {
  const user = await requireUser(request)
  await rateLimit(`me:${user.id}`, RATE_LIMITS.standard)
  const body = await readJson<{ fullName?: unknown; phone?: unknown }>(request)
  const patch: Record<string, string> = {}
  if (typeof body.fullName === "string") patch.full_name = sanitizeInput(body.fullName, 120)
  if (typeof body.phone === "string") patch.phone = sanitizePhone(body.phone)
  if (!Object.keys(patch).length) throw new ApiError(400, "invalid_request", "Nothing to update")
  const { data, error } = await getAdmin().auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata || {}), ...patch },
  })
  if (error || !data.user) throw error || new ApiError(500, "internal", "Couldn't update profile")
  return json({ profile: profileOf(data.user) })
})

/**
 * DELETE — delete the account (App Store guideline 5.1.1(v)).
 * Drafts are removed. Submitted applications are kept for legal/accounting
 * purposes but unlinked from the deleted login.
 */
export const DELETE = handler(async (request: Request) => {
  const user = await requireUser(request)
  await rateLimit(`me-delete:${user.id}`, RATE_LIMITS.strict)
  const db = getAdmin()
  const { error: draftErr } = await db
    .from("visa_applications")
    .delete()
    .eq("user_id", user.id)
    .eq("application_status", "draft")
  if (draftErr) throw draftErr
  const { error: unlinkErr } = await db.from("visa_applications").update({ user_id: null }).eq("user_id", user.id)
  if (unlinkErr) throw unlinkErr
  const { error } = await db.auth.admin.deleteUser(user.id)
  if (error) throw error
  return json({ ok: true })
})
