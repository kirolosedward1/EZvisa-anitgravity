/**
 * The case's activity list and specialist name, from stored rows (application_events, supabase/migrations/004) and
 * what the application row already records, so cases from before the table existed are complete too:
 * - uploads always come from the row's upload records (they hold every upload; stored upload events are not shown);
 * - reviews are the stored review events plus, for document types with none, the latest document_reviews row;
 * - payment and file download come from the row only when no event of that kind is stored.
 * Pure: the dashboard, tracking page and tests share it.
 */
import { parseNotes } from "@/lib/shared/wizard-contract"
import { insurancePreference, type InsurancePreference } from "@/lib/insurance"
import { uploadRecords, type DocumentReviews } from "@/lib/document-reviews"

export const EVENT_KINDS = [
  "payment_received",
  "payment_failed",
  "document_uploaded",
  "document_reviewed",
  "status_changed",
  "specialist_assigned",
  "file_downloaded",
  "appointment_saved",
  "insurance_preference",
] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export type ApplicationEvent = { kind: EventKind; payload: Record<string, unknown>; created_at: string }

type ActivityApp = {
  additional_notes?: string | null
  paid_at?: string | null
  payment_status?: string | null
  payment_amount?: number | null
  file_downloaded_at?: string | null
  appointment_at?: string | null
  appointment_centre?: string | null
  updated_at?: string | null
}

export type ActivityTone = "blue" | "amber" | "green" | "neutral"

/** One line of the activity card. Text is chosen by the component from `kind` and these fields. */
export type ActivityEntry = {
  id: string
  at: string
  tone: ActivityTone
  kind: "paid" | "payFailed" | "uploaded" | "approved" | "rejected" | "status" | "specialist" | "downloaded" | "appointment" | "insurance"
  docs?: string[]
  n?: number
  amount?: number
  status?: string
  name?: string
  when?: string
  centre?: string
  preference?: InsurancePreference
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const time = (v: unknown) => {
  const s = str(v)
  return s && !Number.isNaN(Date.parse(s)) ? s : ""
}
const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10)

/** Keeps well-formed rows only (the table is written by several tools). */
export function toApplicationEvents(rows: unknown): ApplicationEvent[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    const r = row as Record<string, unknown> | null
    const kind = str(r?.kind) as EventKind
    const at = time(r?.created_at)
    if (!r || !EVENT_KINDS.includes(kind) || !at) return []
    const payload = r.payload && typeof r.payload === "object" && !Array.isArray(r.payload) ? (r.payload as Record<string, unknown>) : {}
    return [{ kind, payload, created_at: at }]
  })
}

/** Same-day entries of one kind become one line ("3 documents uploaded", "Passport and photo approved"). */
function grouped(kind: "uploaded" | "approved", items: { at: string; doc: string }[], tone: ActivityTone): ActivityEntry[] {
  const sorted = [...items].sort((a, b) => a.at.localeCompare(b.at))
  const out: ActivityEntry[] = []
  for (const item of sorted) {
    const last = out[out.length - 1]
    if (last && sameDay(last.at, item.at)) {
      if (!last.docs!.includes(item.doc)) last.docs!.push(item.doc)
      last.at = item.at
      last.n = last.docs!.length
    } else out.push({ id: `${kind}-${item.at}`, at: item.at, tone, kind, docs: [item.doc], n: 1 })
  }
  return out
}

export function activityFor(app: ActivityApp, reviews: DocumentReviews = {}, events: ApplicationEvent[] = []): ActivityEntry[] {
  const stored = new Set(events.map((e) => e.kind))
  const entries: ActivityEntry[] = []
  const uploads: { at: string; doc: string }[] = []
  const approvals: { at: string; doc: string }[] = []

  for (const [i, e] of events.entries()) {
    const p = e.payload
    const id = `${e.kind}-${i}`
    switch (e.kind) {
      case "payment_received":
        entries.push({ id, at: e.created_at, tone: "neutral", kind: "paid", amount: typeof p.amount === "number" ? p.amount : undefined })
        break
      case "payment_failed":
        entries.push({ id, at: e.created_at, tone: "amber", kind: "payFailed" })
        break
      case "document_uploaded":
        // Shown from the row's upload records below, which also cover uploads from before this table existed.
        break
      case "document_reviewed":
        if (p.status === "approved" && str(p.document_type)) approvals.push({ at: e.created_at, doc: str(p.document_type) })
        else if (p.status === "rejected" && str(p.document_type)) entries.push({ id, at: e.created_at, tone: "amber", kind: "rejected", docs: [str(p.document_type)] })
        break
      case "status_changed":
        if (str(p.to)) entries.push({ id, at: e.created_at, tone: str(p.to) === "ready" || str(p.to) === "completed" ? "green" : "blue", kind: "status", status: str(p.to) })
        break
      case "specialist_assigned":
        if (str(p.name)) entries.push({ id, at: e.created_at, tone: "blue", kind: "specialist", name: str(p.name) })
        break
      case "file_downloaded":
        entries.push({ id, at: e.created_at, tone: "neutral", kind: "downloaded" })
        break
      case "appointment_saved":
        entries.push({ id, at: e.created_at, tone: "blue", kind: "appointment", when: time(p.at) || undefined, centre: str(p.centre) || undefined })
        break
      case "insurance_preference": {
        const preference = insurancePreference(p.preference)
        if (preference) entries.push({ id, at: e.created_at, tone: "neutral", kind: "insurance", preference })
        break
      }
    }
  }

  // Rebuilt from the row for kinds that have no stored events.
  const paidAt = time(app.paid_at)
  if (!stored.has("payment_received") && paidAt && ["paid", "completed"].includes(str(app.payment_status).toLowerCase())) {
    entries.push({ id: "paid", at: paidAt, tone: "neutral", kind: "paid", amount: app.payment_amount ?? undefined })
  }
  for (const u of uploadRecords(app.additional_notes)) if (time(u.at)) uploads.push({ at: u.at, doc: u.type })
  const reviewedTypes = new Set(events.filter((e) => e.kind === "document_reviewed").map((e) => str(e.payload.document_type)))
  for (const [doc, review] of Object.entries(reviews)) {
    const at = time(review.reviewedAt)
    if (!at || reviewedTypes.has(doc)) continue
    if (review.status === "approved") approvals.push({ at, doc })
    else if (review.status === "rejected") entries.push({ id: `rejected-${doc}`, at, tone: "amber", kind: "rejected", docs: [doc] })
  }
  const downloaded = time(app.file_downloaded_at)
  if (!stored.has("file_downloaded") && downloaded) entries.push({ id: "downloaded", at: downloaded, tone: "neutral", kind: "downloaded" })

  entries.push(...grouped("uploaded", uploads, "neutral"), ...grouped("approved", approvals, "green"))
  return entries.sort((a, b) => b.at.localeCompare(a.at))
}

/** The visa specialist on the case: the latest specialist_assigned event, else additional_notes.specialist. */
export function specialistName(app: { additional_notes?: string | null }, events: ApplicationEvent[] = []): string {
  const latest = events
    .filter((e) => e.kind === "specialist_assigned" && str(e.payload.name))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  if (latest) return str(latest.payload.name).slice(0, 40)
  const notes = parseNotes(app.additional_notes) as unknown as Record<string, unknown>
  const s = notes.specialist
  const name = typeof s === "string" ? s : s && typeof s === "object" ? str((s as Record<string, unknown>).name) : ""
  return str(name).slice(0, 40)
}
