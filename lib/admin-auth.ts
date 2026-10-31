/**
 * Staff access for the staff API routes. A staff member is a signed-in, confirmed user listed in ADMIN_EMAILS or
 * active in staff_users (lib/staff/session.ts). Scripts can still call the staff API with `Authorization: Bearer
 * <ADMIN_API_SECRET>` when that secret is configured. Demo logins never count here: the demo staff session only
 * reads built-in demo data inside the console pages.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { hasBearerSecret } from "@/lib/bearer-auth"
import { getRealStaff } from "@/lib/staff/session"
import { can, type Permission } from "@/lib/staff/roles"

export { isStaffEmail, staffEmails } from "@/lib/staff/session"

/** The signed-in staff member, or null (signed out, unconfirmed email, or not staff). */
export async function getStaffUser(): Promise<{ id: string; email: string } | null> {
  const staff = await getRealStaff()
  return staff?.userId ? { id: staff.userId, email: staff.email } : null
}

/**
 * Staff API check: the script secret, or a staff session whose role has the permission (lib/staff/roles.ts). Without
 * a permission any staff role passes (read-only routes).
 */
export async function isStaffRequest(request: Request, permission?: Permission): Promise<boolean> {
  if (hasBearerSecret(request.headers.get("Authorization"), process.env.ADMIN_API_SECRET)) return true
  const staff = await getRealStaff()
  return !!staff?.userId && (!permission || can(staff.role, permission))
}

export function adminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  return url && key ? createClient(url, key) : null
}
