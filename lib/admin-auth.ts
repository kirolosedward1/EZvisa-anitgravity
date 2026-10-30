/**
 * Staff access. A staff member is a signed-in user (Google or email, confirmed) whose email is in ADMIN_EMAILS
 * (comma separated, set in Vercel). Scripts can still call the staff API with `Authorization: Bearer
 * <ADMIN_API_SECRET>` when that secret is configured. Demo logins never count. Nobody is staff while ADMIN_EMAILS is
 * empty.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { hasBearerSecret } from "@/lib/bearer-auth"
import { createServerClient } from "@/lib/supabase/server"

export function staffEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  )
}

export function isStaffEmail(email?: string | null): boolean {
  return !!email && staffEmails().has(email.trim().toLowerCase())
}

/** The signed-in staff member, or null (signed out, unconfirmed email, or not on the list). */
export async function getStaffUser(): Promise<{ id: string; email: string } | null> {
  try {
    const { data } = await (await createServerClient()).auth.getUser()
    const user = data.user
    if (!user?.email || !user.email_confirmed_at || !isStaffEmail(user.email)) return null
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}

/** Staff API check: the staff session, or the script secret. */
export async function isStaffRequest(request: Request): Promise<boolean> {
  if (hasBearerSecret(request.headers.get("Authorization"), process.env.ADMIN_API_SECRET)) return true
  return (await getStaffUser()) !== null
}

export function adminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  return url && key ? createClient(url, key) : null
}
