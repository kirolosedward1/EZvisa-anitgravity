/** Loads what the report catalogue needs (cases, refunds, current send-backs). Server only. */
import { serviceClient } from "@/lib/applications"
import { docTitle } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import type { ReportData, RefundRow, RejectionRow } from "@/lib/staff/reports"
import type { Staff } from "@/lib/staff/session"

export async function loadReportData(staff: Staff): Promise<ReportData> {
  const { cases, reviews, team } = await loadConsoleData(staff)
  const rejections: RejectionRow[] = []
  for (const c of cases) for (const [type, r] of Object.entries(reviews[c.id] ?? {})) if (r.status === "rejected") rejections.push({ document_type: docTitle(type), country: c.country, note: r.note })
  let refunds: RefundRow[] = []
  if (staff.demo) {
    const { demoRefunds } = await import("@/lib/staff/demo")
    const { STAGE } = await import("@/lib/staff/cases")
    refunds = demoRefunds(cases.map((c) => ({ id: c.id, paid: c.paid, stageLabel: STAGE[c.stage].label })))
  } else {
    const client = serviceClient()
    const res = client ? await client.from("refund_requests").select("application_id, amount, amount_paid, reason, status, requested_by, decided_by, requested_at, gateway_ref").limit(5000) : null
    refunds = (res?.data ?? []) as RefundRow[]
  }
  return { cases, refunds, rejections, ownerName: (id) => (id ? team.find((m) => m.id === id)?.name ?? "Former staff" : "Unassigned") }
}
