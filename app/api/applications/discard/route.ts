import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { isDiscardable } from "@/lib/active-applications"
import type { ApplicationLike } from "@/lib/application-status"

/** Same update as the mobile app's cancelApplication: status becomes cancelled, nothing is deleted. */
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
    .select("id, email, application_status, payment_status")
    .eq("id", id)
    .eq("email", email)
    .maybeSingle()

  if (loadError || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  if (!isDiscardable(app as ApplicationLike)) {
    return NextResponse.json({ error: "Only unpaid draft or submitted applications can be discarded" }, { status: 409 })
  }

  const { data, error } = await supabase
    .from("visa_applications")
    .update({ application_status: "cancelled" })
    .eq("id", id)
    .eq("email", email)
    .in("application_status", ["draft", "submitted"])
    .not("payment_status", "in", "(paid,completed)")
    .select("id, application_status")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data?.some((row) => row.application_status === "cancelled")) {
    return NextResponse.json({ error: "Could not discard this application." }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
