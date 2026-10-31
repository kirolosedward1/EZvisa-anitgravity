import { NextResponse } from "next/server"
import { recordAudit } from "@/lib/staff/audit"
import { toCsv } from "@/lib/staff/queue"
import { loadReportData } from "@/lib/staff/report-data"
import { periodRange, REPORTS } from "@/lib/staff/reports"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

/** CSV of one catalogue report for a period. Export permission (Admin, Finance); every run is an audit event. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!can(staff.role, "export")) return NextResponse.json({ error: "Your role cannot export data." }, { status: 403 })
  const { key } = await params
  const report = REPORTS.find((r) => r.key === key)
  if (!report) return NextResponse.json({ error: "Unknown report" }, { status: 404 })
  const period = new URL(request.url).searchParams.get("period") ?? "this_month"
  const now = Date.now()
  const { from, to, label } = periodRange(period, now)
  const rows = report.csv(await loadReportData(staff), from, to, now)
  await recordAudit(staff, { action: `Report "${report.name}" downloaded, ${label}, ${rows.length - 1} rows`, type: "export", targetLabel: report.name, field: `report.${report.key}`, after: { period, rows: rows.length - 1 }, notified: "No" })
  const stamp = new Date(now + 4 * 3_600_000).toISOString().slice(0, 10)
  return new NextResponse(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ezvisa-${report.key}-${period}-${stamp}.csv"`, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  })
}
