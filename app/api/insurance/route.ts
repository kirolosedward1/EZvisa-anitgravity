import { NextResponse } from "next/server"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { createServerClient } from "@/lib/supabase/server"
import { UUID_RE, serviceClient } from "@/lib/applications"
import { isPaid } from "@/lib/application-status"
import { insurancePreference, withInsurancePreference } from "@/lib/insurance"

/** Dashboard-only preference. Never changes payment, application status or policy cover. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const preference = insurancePreference(body?.preference)
  if (!UUID_RE.test(body?.id || "") || !preference) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: app, error } = await supabase.from("visa_applications")
    .select("id, payment_status, additional_notes")
    .eq("id", body.id).eq("email", email).maybeSingle()
  if (error || !app) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (!isPaid(app)) return NextResponse.json({ error: "payment_required" }, { status: 409 })

  let notes: string
  try { notes = withInsurancePreference(app.additional_notes, preference) }
  catch { return NextResponse.json({ error: "save_failed" }, { status: 409 }) }

  // Paid cases can already be ready/read-only under general customer RLS. Like appointment
  // edits, use the server client only after verifying the session and owned paid row above.
  // This endpoint can change only this preference, never the case or payment status.
  const writer = serviceClient()
  if (!writer) return NextResponse.json({ error: "save_failed" }, { status: 503 })
  // Compare with the loaded notes so a concurrent upload/continuation is never overwritten.
  let update = writer.from("visa_applications").update({ additional_notes: notes })
    .eq("id", app.id).eq("email", email).in("payment_status", ["paid", "completed"])
  update = app.additional_notes === null
    ? update.is("additional_notes", null)
    : update.eq("additional_notes", app.additional_notes)
  const { data: saved, error: saveError } = await update.select("id")
  if (saveError || !saved?.length) return NextResponse.json({ error: "save_failed" }, { status: 409 })
  await recordApplicationEvent(app.id, "insurance_preference", { preference }, "customer", writer)
  return NextResponse.json({ ok: true, preference })
}
