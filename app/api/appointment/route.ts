import { NextResponse } from "next/server"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { getOwnApplication, getSessionUser, serviceClient } from "@/lib/applications"
import { planAppointmentWrite } from "@/lib/appointment"
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit"

const MESSAGES: Record<string, string> = {
  not_found: "Application not found",
  unpaid: "Payment is required first",
  not_downloaded: "Download your visa file before adding an appointment",
  past_date: "Choose a date and time that has not passed.",
  invalid_date: "Enter a valid date and time.",
  centre: "Enter the visa centre.",
  action: "Choose how you want to add the appointment.",
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const limit = await checkRateLimit(`appointment:${ip}`, RATE_LIMITS.standard)
  if (!limit.success) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 })

  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Sign in required", code: "auth" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "Missing application", code: "not_found" }, { status: 400 })

  const app = await getOwnApplication(user, id)
  if (!app) return NextResponse.json({ error: MESSAGES.not_found, code: "not_found" }, { status: 404 })

  const decision = planAppointmentWrite(app, user.email, {
    action: typeof body.action === "string" ? body.action : "",
    date: typeof body.date === "string" ? body.date : "",
    time: typeof body.time === "string" ? body.time : "",
    centre: typeof body.centre === "string" ? body.centre : "",
    address: typeof body.address === "string" ? body.address : "",
    reference: typeof body.reference === "string" ? body.reference : "",
  })
  if (!decision.ok) {
    return NextResponse.json({ error: MESSAGES[decision.code] || "Could not save the appointment.", code: decision.code }, { status: decision.status })
  }

  if (user.demo || id.startsWith("demo-")) return NextResponse.json({ ok: true, demo: true })

  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: "Could not save the appointment." }, { status: 500 })

  const { data, error } = await supabase
    .from("visa_applications")
    .update({ ...decision.patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .ilike("email", user.email)
    .eq("payment_status", "paid")
    .select("id")

  if (error || !data?.length) {
    const completed = await supabase
      .from("visa_applications")
      .update({ ...decision.patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .ilike("email", user.email)
      .eq("payment_status", "completed")
      .select("id")
    if (completed.error || !completed.data?.length) {
      return NextResponse.json({ error: "Could not save the appointment.", code: "save" }, { status: 400 })
    }
  }

  if (decision.patch.appointment_at) {
    await recordApplicationEvent(id, "appointment_saved", { at: decision.patch.appointment_at, centre: decision.patch.appointment_centre ?? null }, "customer", supabase)
  }
  return NextResponse.json({ ok: true })
}
