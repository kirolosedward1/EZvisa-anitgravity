import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { isDiscardable } from "@/lib/active-applications"
import type { ApplicationLike } from "@/lib/application-status"

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email
  if (!email) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "Missing application" }, { status: 400 })

  const { data: app, error: loadError } = await supabase
    .from("visa_applications")
    .select("id, email, application_status, payment_status, additional_notes")
    .eq("id", id)
    .eq("email", email)
    .maybeSingle()

  if (loadError || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  if (!isDiscardable(app as ApplicationLike)) {
    return NextResponse.json({ error: "Only unpaid drafts can be discarded" }, { status: 409 })
  }

  let notes: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(app.additional_notes || "{}")
    if (parsed && typeof parsed === "object") notes = parsed
  } catch {
    notes = {}
  }
  notes.discarded_at = new Date().toISOString()

  const { data: updated, error } = await supabase
    .from("visa_applications")
    .update({ application_status: "cancelled", additional_notes: JSON.stringify(notes) })
    .eq("id", id)
    .eq("email", email)
    .in("application_status", ["draft", "submitted"])
    .select("application_status")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (updated?.application_status !== "cancelled") {
    return NextResponse.json(
      { error: "Discard was not saved. Customer cancellation is still blocked until the proposed database policy is applied." },
      { status: 409 },
    )
  }
  return NextResponse.json({ ok: true })
}
