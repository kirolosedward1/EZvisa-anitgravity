import "server-only"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"
import { supabaseServerEnv } from "@/lib/supabase/server"

export function registrationAdmin() {
  const { url } = supabaseServerEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  return key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

export async function registrationRequestGuard(request: Request) {
  // These web forms submit JSON on the same origin. Never accept cross-site cookie-authenticated writes.
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 })
  }
  const limit = await checkRateLimit(`registration:${getClientIp(request)}`, RATE_LIMITS.strict, { onError: "memory", timeoutMs: 800 })
  if (!limit.success) return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 })
  return null
}

export function adultConfirmationMetadata() {
  return { ezvisa_adult_policy: 1, ezvisa_adult_confirmed_at: new Date().toISOString() }
}
