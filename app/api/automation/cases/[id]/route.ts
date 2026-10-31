/**
 * GET /api/automation/cases/:id: one case for the file preparation automation (Make.com). Auth: Bearer MAKE_API_SECRET
 * only. Paid, open cases from Preparation on; approved documents as 15-minute signed links. Each read is logged.
 */
import { NextResponse } from "next/server"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { isAutomationRequest } from "@/lib/automation/make"
import { buildCasePayload, caseForAutomation } from "@/lib/automation/case-payload"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAutomationRequest(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 })
  const client = serviceClient()
  if (!client) return NextResponse.json({ error: "not_configured" }, { status: 500 })
  const access = await caseForAutomation(client, id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const payload = await buildCasePayload(client, id, access.row, access.reference)
  await client.from("audit_events").insert({ actor_type: "automation", actor_name: "File preparation automation", action: `Automation read the case (${payload.documents.length} documents)`, type: "export", target_table: "visa_applications", target_id: id, target_label: access.reference, field: "automation.read", notified: "No", reversible: false }).then(() => undefined, () => undefined)
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
}
