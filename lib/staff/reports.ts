/**
 * Report catalogue (Reports board): each report turns the console's data for a period into a preview and CSV rows.
 * Pure; the download route checks the Export permission and logs every run. There is no VAT report: EZvisa is not
 * VAT-registered.
 */
import { isOpen, isOver, STAGE, type StaffCase } from "@/lib/staff/cases"
import { slaLabel } from "@/lib/staff/sla"

export const PERIODS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_90", label: "Last 90 days" },
  { key: "year", label: "Year to date" },
] as const
export type PeriodKey = (typeof PERIODS)[number]["key"]

export function periodRange(key: string, now = Date.now()): { from: number; to: number; label: string } {
  const d = new Date(now + 4 * 3_600_000)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const at = (yy: number, mm: number) => Date.UTC(yy, mm, 1) - 4 * 3_600_000
  if (key === "last_month") return { from: at(y, m - 1), to: at(y, m), label: "Last month" }
  if (key === "last_90") return { from: now - 90 * 86_400_000, to: now, label: "Last 90 days" }
  if (key === "year") return { from: at(y, 0), to: now, label: "Year to date" }
  return { from: at(y, m), to: now, label: "This month" }
}

export type RefundRow = { application_id: string; amount: number; amount_paid: number; reason: string; status: string; requested_by: string; decided_by: string | null; requested_at: string; gateway_ref: string | null }
export type RejectionRow = { document_type: string; country: string; note: string | null }
export type ReportData = { cases: StaffCase[]; refunds: RefundRow[]; rejections: RejectionRow[]; ownerName: (id: string | null) => string }

type Report = {
  key: string
  name: string
  description: string
  audience: "Finance" | "Operations"
  preview: (d: ReportData, from: number, to: number, now: number) => [string, string][]
  csv: (d: ReportData, from: number, to: number, now: number) => (string | number)[][]
}

const inRange = (iso: string | null | undefined, from: number, to: number) => !!iso && Date.parse(iso) >= from && Date.parse(iso) < to
const aed = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`
const day = (iso: string) => new Date(Date.parse(iso) + 4 * 3_600_000).toISOString().slice(0, 16).replace("T", " ")

export const REPORTS: Report[] = [
  {
    key: "revenue",
    name: "Revenue by destination",
    description: "Paid cases, gross and refunds per destination",
    audience: "Finance",
    preview: (d, f, t) => {
      const paid = d.cases.filter((c) => c.paid && inRange(c.paidAt ?? c.createdAt, f, t))
      const gross = paid.reduce((s, c) => s + (c.amount ?? 0), 0)
      const refunded = d.refunds.filter((r) => r.status === "sent" && inRange(r.requested_at, f, t)).reduce((s, r) => s + Number(r.amount), 0)
      return [["Paid cases", String(paid.length)], ["Gross", aed(gross)], ["Refunds sent", aed(refunded)], ["Net", aed(gross - refunded)]]
    },
    csv: (d, f, t) => {
      const by = new Map<string, { n: number; gross: number }>()
      for (const c of d.cases) if (c.paid && inRange(c.paidAt ?? c.createdAt, f, t)) {
        const x = by.get(c.country) ?? { n: 0, gross: 0 }
        x.n++
        x.gross += c.amount ?? 0
        by.set(c.country, x)
      }
      const refunds = new Map<string, number>()
      for (const r of d.refunds) if (r.status === "sent" && inRange(r.requested_at, f, t)) {
        const c = d.cases.find((x) => x.id === r.application_id)
        if (c) refunds.set(c.country, (refunds.get(c.country) ?? 0) + Number(r.amount))
      }
      return [["Destination", "Paid cases", "Gross AED", "Refunds AED", "Net AED"], ...[...by.entries()].sort((a, b) => b[1].gross - a[1].gross).map(([k, v]) => [k, v.n, v.gross.toFixed(2), (refunds.get(k) ?? 0).toFixed(2), (v.gross - (refunds.get(k) ?? 0)).toFixed(2)])]
    },
  },
  {
    key: "refunds",
    name: "Refunds",
    description: "Every refund with reason, who approved it and the gateway reference",
    audience: "Finance",
    preview: (d, f, t) => {
      const list = d.refunds.filter((r) => inRange(r.requested_at, f, t))
      const reasons = new Map<string, number>()
      for (const r of list) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1)
      const top = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]
      return [["Refunds", String(list.length)], ["Sent", aed(list.filter((r) => r.status === "sent").reduce((s, r) => s + Number(r.amount), 0))], ["Most common reason", top ? `${top[0]} (${top[1]})` : "None"]]
    },
    csv: (d, f, t) => [["Requested", "Reference", "Customer", "Paid AED", "Refund AED", "Reason", "Status", "Requested by", "Decided by", "Gateway ref"], ...d.refunds.filter((r) => inRange(r.requested_at, f, t)).map((r) => {
      const c = d.cases.find((x) => x.id === r.application_id)
      return [day(r.requested_at), c?.ref ?? "", c?.name ?? "", Number(r.amount_paid).toFixed(2), Number(r.amount).toFixed(2), r.reason, r.status, r.requested_by, r.decided_by ?? "", r.gateway_ref ?? ""]
    })],
  },
  {
    key: "appointments",
    name: "Appointment list per centre",
    description: "Who is going where and when, names as on the application",
    audience: "Operations",
    preview: (d, f, t) => {
      const list = d.cases.filter((c) => inRange(c.appointmentAt, f, t))
      const centres = new Map<string, number>()
      for (const c of list) centres.set(c.appointmentCentre ?? "Not set", (centres.get(c.appointmentCentre ?? "Not set") ?? 0) + 1)
      return [["Appointments", String(list.length)], ...[...centres.entries()].slice(0, 4).map(([k, v]) => [k, String(v)] as [string, string])]
    },
    csv: (d, f, t) => [["Date and time (Dubai)", "Centre", "Applicant", "Reference", "Destination", "Phone"], ...d.cases.filter((c) => inRange(c.appointmentAt, f, t)).sort((a, b) => a.appointmentAt!.localeCompare(b.appointmentAt!)).map((c) => [day(c.appointmentAt!), c.appointmentCentre ?? "", c.name, c.ref, c.country, c.phone])],
  },
  {
    key: "sla",
    name: "SLA and owners",
    description: "Open cases waiting on us, their deadline and owner",
    audience: "Operations",
    preview: (d, _f, _t, now) => {
      const ours = d.cases.filter((c) => isOpen(c) && c.side === "us")
      const over = ours.filter((c) => isOver(c, now)).length
      return [["Waiting on us", String(ours.length)], ["Past SLA", String(over)], ["Within SLA", ours.length ? `${Math.round(((ours.length - over) / ours.length) * 100)} percent` : "–"]]
    },
    csv: (d, _f, _t, now) => [["Reference", "Applicant", "Stage", "Waiting for", "Owner", "Deadline (Dubai)", "SLA"], ...d.cases.filter((c) => isOpen(c) && c.side === "us").map((c) => [c.ref, c.name, STAGE[c.stage].label, c.what, d.ownerName(c.ownerId), c.dueAt ? day(c.dueAt) : "", c.dueAt ? slaLabel(c.dueAt, now).text : ""])],
  },
  {
    key: "rejections",
    name: "Document send-backs",
    description: "Which documents are sent back now, and why, per destination",
    audience: "Operations",
    preview: (d) => {
      const by = new Map<string, number>()
      for (const r of d.rejections) by.set(r.document_type, (by.get(r.document_type) ?? 0) + 1)
      const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0]
      return [["Documents sent back, now", String(d.rejections.length)], ["Most often", top ? `${top[0]} (${top[1]})` : "None"]]
    },
    csv: (d) => [["Document", "Destination", "Note to the customer"], ...d.rejections.map((r) => [r.document_type, r.country, r.note ?? ""])],
  },
]
