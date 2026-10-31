import { NextResponse } from "next/server"
import { serviceClient } from "@/lib/applications"
import { recordAudit } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

/**
 * Everything we hold about one customer (by email) as JSON: applications, document reviews, timeline events, saved
 * travellers and refunds. For data requests from the customer. Export permission; logged. Files stay in storage.
 */
export async function GET(request: Request) {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!can(staff.role, "export")) return NextResponse.json({ error: "Your role cannot export data." }, { status: 403 })
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  if (staff.demo) return NextResponse.json({ demo: true, email, note: "Demo cases are invented." })
  const client = serviceClient()
  if (!client) return NextResponse.json({ error: "Database unconfigured" }, { status: 500 })
  const { data: apps } = await client.from("visa_applications").select("*").ilike("email", email)
  const ids = (apps ?? []).map((a) => a.id as string)
  const [reviews, events, travellers, refunds] = await Promise.all([
    ids.length ? client.from("document_reviews").select("*").in("application_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? client.from("application_events").select("*").in("application_id", ids) : Promise.resolve({ data: [] }),
    client.from("travellers").select("*").ilike("email", email),
    ids.length ? client.from("refund_requests").select("*").in("application_id", ids) : Promise.resolve({ data: [] }),
  ])
  await recordAudit(staff, { action: `Customer data exported for ${email} (${ids.length} applications)`, type: "export", targetTable: "customers", targetLabel: email, field: "export", notified: "No" })
  const body = JSON.stringify({ exported_at: new Date().toISOString(), email, applications: apps ?? [], document_reviews: reviews.data ?? [], timeline: events.data ?? [], saved_travellers: travellers.data ?? [], refunds: refunds.data ?? [] }, null, 2)
  return new NextResponse(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="ezvisa-customer-${email.replace(/[^a-z0-9]+/g, "-")}.json"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } })
}
