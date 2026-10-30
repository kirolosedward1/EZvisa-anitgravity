import { NextResponse } from "next/server"
import { loadConsoleData } from "@/lib/staff/data"
import { recordAudit } from "@/lib/staff/audit"
import { STAGE } from "@/lib/staff/cases"
import { applyQueue, parseFilters, slaCell, toCsv, travelLabel, whoLabel } from "@/lib/staff/queue"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

/**
 * CSV of the Cases queue as filtered on screen (same query string), or of the selected cases (?ids=a,b). Export
 * permission only (Admin, Finance); every export is an audit event. The demo session exports demo cases.
 */
export async function GET(request: Request) {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!can(staff.role, "export")) return NextResponse.json({ error: "Your role cannot export data." }, { status: 403 })

  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams)
  const filters = parseFilters(params)
  const { cases, team } = await loadConsoleData(staff)
  const now = Date.now()
  const picked = new Set((url.searchParams.get("ids") ?? "").split(",").filter(Boolean))
  const rows = picked.size ? cases.filter((c) => picked.has(c.id)) : applyQueue(cases, filters, now)
  const ownerName = (id: string | null) => (id ? team.find((m) => m.id === id)?.name ?? "Former staff" : "Unassigned")

  const csv = toCsv([
    ["Reference", "Applicant", "Email", "Phone", "Destination", "Travellers", "Stage", "Waiting for", "Waiting on", "Travel", "Owner", "SLA", "Paid", "Created", "Last activity"],
    ...rows.map((c) => [
      c.ref,
      c.name,
      c.email,
      c.phone,
      c.country,
      c.travellers,
      STAGE[c.stage].label,
      c.what,
      whoLabel(c),
      travelLabel(c.travelStart, c.travelEnd),
      ownerName(c.ownerId),
      slaCell(c, now).text,
      c.paid ? "Yes" : "No",
      c.createdAt.slice(0, 10),
      c.updatedAt.slice(0, 16).replace("T", " "),
    ]),
  ])

  const scope = picked.size ? `${rows.length} selected` : `tab ${filters.tab}${filters.q ? `, search "${filters.q}"` : ""}${filters.stage ? `, stage ${filters.stage}` : ""}`
  await recordAudit(staff, {
    action: `Exported cases CSV, ${rows.length} rows (${scope})`,
    type: "export",
    targetTable: "visa_applications",
    targetLabel: "Cases",
    field: "export",
    after: { rows: rows.length, filters: picked.size ? { ids: rows.length } : filters },
    notified: "No",
  })

  const day = new Date(now + 4 * 3_600_000).toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ezvisa-cases-${day}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  })
}
