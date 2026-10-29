import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { registrationDetails } from "@/lib/auth/account-details"
import { adultConfirmationMetadata, registrationAdmin, registrationRequestGuard } from "@/lib/auth/registration-server"
import { socialMetadataPatch } from "@/lib/auth/social-profile"

export async function POST(request: Request) {
  const denied = await registrationRequestGuard(request)
  if (denied) return denied
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  const details = registrationDetails(typeof body.name === "string" ? body.name : "", typeof body.birthdate === "string" ? body.birthdate : "", body.confirmed)
  if (details.error) return NextResponse.json({ field: details.error }, { status: 400 })
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return NextResponse.json({ error: "Sign in again to complete your profile." }, { status: 401 })
    const admin = registrationAdmin()
    if (!admin) return NextResponse.json({ error: "We couldn’t save your profile. Please try again later." }, { status: 503 })
    // ID and provider fields come from the authenticated session, never the submitted body.
    const { error: saveError } = await admin.auth.admin.updateUserById(data.user.id, {
      user_metadata: { ...socialMetadataPatch(data.user), ...details.data },
      app_metadata: adultConfirmationMetadata(),
    })
    if (saveError) return NextResponse.json({ error: "We couldn’t save your profile. Please try again." }, { status: 503 })
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "We couldn’t save your profile. Please try again." }, { status: 503 })
  }
}
