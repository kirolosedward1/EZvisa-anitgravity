/**
 * Staff API access: `Authorization: Bearer <ADMIN_API_SECRET>` (constant-time check; every request is refused while
 * the secret is not configured) and the service-role client staff routes write with.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { hasBearerSecret } from "@/lib/bearer-auth"

export function verifyAdminAuth(request: Request): boolean {
  return hasBearerSecret(request.headers.get("Authorization"), process.env.ADMIN_API_SECRET)
}

export function adminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  return url && key ? createClient(url, key) : null
}
