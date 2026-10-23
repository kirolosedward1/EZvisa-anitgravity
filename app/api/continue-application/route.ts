import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { datesInOrder, isValidCalendarDate, INVALID_DATE_MESSAGE, RETURN_AFTER_DEPARTURE } from "@/lib/dates"
import { isPaid } from "@/lib/application-status"

const EMPLOYMENT = new Set(["employed", "business", "freelancer", "student", "unemployed", "retired"])

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email
  if (!email) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "Missing application" }, { status: 400 })
  if (id.startsWith("demo-")) return NextResponse.json({ ok: true, demo: true })

  const { data: app, error: loadError } = await supabase
    .from("visa_applications")
    .select("id, email, payment_status, additional_notes, passport_number, entry_date, exit_date")
    .eq("id", id)
    .eq("email", email)
    .maybeSingle()

  if (loadError || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  if (!isPaid(app)) return NextResponse.json({ error: "Payment is required first" }, { status: 409 })

  const start = typeof body.travelStartDate === "string" ? body.travelStartDate : ""
  const end = typeof body.travelEndDate === "string" ? body.travelEndDate : ""
  if ((start && !isValidCalendarDate(start)) || (end && !isValidCalendarDate(end))) {
    return NextResponse.json({ error: INVALID_DATE_MESSAGE }, { status: 400 })
  }
  if (start && end && !datesInOrder(start, end)) {
    return NextResponse.json({ error: RETURN_AFTER_DEPARTURE }, { status: 400 })
  }

  const hasValidPassport = body.hasValidPassport === "yes" || body.hasValidPassport === "no" ? body.hasValidPassport : ""
  const passportNumber = typeof body.passportNumber === "string" ? body.passportNumber.trim().slice(0, 20) : ""
  const employmentStatus = typeof body.employmentStatus === "string" ? body.employmentStatus : ""
  if (employmentStatus && !EMPLOYMENT.has(employmentStatus)) {
    return NextResponse.json({ error: "Choose an employment status" }, { status: 400 })
  }

  let notes: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(app.additional_notes || "{}")
    if (parsed && typeof parsed === "object") notes = parsed
  } catch {
    notes = {}
  }
  const wizard = (notes.wizard && typeof notes.wizard === "object" ? notes.wizard : {}) as Record<string, unknown>
  if (hasValidPassport) wizard.hasValidPassport = hasValidPassport
  if (passportNumber) wizard.passportNumber = passportNumber
  if (start) wizard.travelStartDate = start
  if (end) wizard.travelEndDate = end
  if (employmentStatus) {
    wizard.employmentStatus = employmentStatus
    notes.employmentStatus = employmentStatus
    for (const key of ["jobTitle", "companyName", "employmentStartDate", "monthlySalary", "hasNOC", "averageMonthlyIncome"] as const) {
      const value = typeof body[key] === "string" ? body[key].trim().slice(0, 120) : ""
      if (value) wizard[key] = value
    }
  }
  notes.wizard = wizard

  const patch: Record<string, string> = { additional_notes: JSON.stringify(notes) }
  if (passportNumber) patch.passport_number = passportNumber
  if (start) {
    patch.entry_date = start
    patch.travel_start_date = start
  }
  if (end) {
    patch.exit_date = end
    patch.travel_end_date = end
  }

  const { error } = await supabase.from("visa_applications").update(patch).eq("id", id).eq("email", email)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
