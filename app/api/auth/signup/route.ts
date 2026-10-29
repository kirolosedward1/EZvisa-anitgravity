import { NextResponse } from "next/server"
import { createServerClient, supabaseServerEnv } from "@/lib/supabase/server"
import { registrationDetails } from "@/lib/auth/account-details"
import { adultConfirmationMetadata, registrationAdmin, registrationRequestGuard } from "@/lib/auth/registration-server"
import { EMAIL_RE } from "@/lib/auth/errors"
import { safeNext } from "@/lib/auth/redirect"

export async function POST(request: Request) {
  const denied = await registrationRequestGuard(request)
  if (denied) return denied
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  const details = registrationDetails(typeof body.name === "string" ? body.name : "", typeof body.birthdate === "string" ? body.birthdate : "", body.confirmed)
  if (details.error) return NextResponse.json({ field: details.error }, { status: 400 })
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!EMAIL_RE.test(email) || password.length < 6 || password.length > 1024) return NextResponse.json({ error: "Enter a valid email and a password of at least 6 characters." }, { status: 400 })
  if (!supabaseServerEnv().configured) return NextResponse.json({ error: "Account creation is temporarily unavailable. Please try again later." }, { status: 503 })
  const callback = new URL("/api/auth/callback", request.url)
  callback.searchParams.set("type", "signup")
  callback.searchParams.set("next", safeNext(typeof body.next === "string" ? body.next : null))
  if (body.locale === "ar") callback.searchParams.set("locale", "ar")
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: details.data, emailRedirectTo: callback.toString() } })
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    // Supabase obfuscates existing accounts with an empty identities array. Never modify those accounts.
    // On failure, verified sign-in will ask for confirmation again; signup itself still succeeds.
    if (data.user?.identities?.length && Date.now() - Date.parse(data.user.created_at) < 60_000) {
      const admin = registrationAdmin()
      if (admin) await admin.auth.admin.updateUserById(data.user.id, { app_metadata: adultConfirmationMetadata() }).catch(() => {})
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "We couldn’t create your account. Please try again." }, { status: 503 })
  }
}
