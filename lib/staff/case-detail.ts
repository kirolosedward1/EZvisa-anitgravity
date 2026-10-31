/**
 * Everything the Case board shows for one case: the row as a StaffCase plus its raw answers, document rows with their
 * uploads (15-minute signed links) and latest review, the customer timeline, staff audit entries, internal notes and
 * the customer's other cases. Server only, service role, after the page checked the staff session. The demo session
 * reads lib/staff/demo.ts and never the database or storage.
 */
import { serviceClient, UUID_RE } from "@/lib/applications"
import { loadApplicationEvents } from "@/lib/application-events-server"
import { toApplicationEvents, type ApplicationEvent } from "@/lib/application-events"
import { customerDocuments } from "@/lib/dashboard-state"
import { toDocumentReviews, type DocumentReviews } from "@/lib/document-reviews"
import { DOC_BUCKET, parseNotes, type ApplicationNotes } from "@/lib/shared/wizard-contract"
import type { VisaApplication } from "@/lib/types/visa-application"
import { toStaffCase, type StaffCase } from "@/lib/staff/cases"
import { loadConsoleData, type StaffMember } from "@/lib/staff/data"
import { demoConsoleData } from "@/lib/staff/demo"
import { missingTable, type Staff } from "@/lib/staff/session"

export type DocFile = { name: string; at: string; url: string | null }
export type DocRow = {
  type: string
  title: string
  state: "missing" | "received" | "checking" | "approved" | "rejected"
  note: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  files: DocFile[]
}
export type AuditRow = { id: number; at: string; actor: string; action: string; type: string; field: string | null; notified: string | null }
export type NoteRow = { id: string; at: string; author: string; authorId?: string | null; body: string; pinned: boolean }

export type CaseDetail = {
  app: VisaApplication
  notes: ApplicationNotes & Record<string, unknown>
  c: StaffCase
  docs: DocRow[]
  reviews: DocumentReviews
  events: ApplicationEvent[]
  audit: AuditRow[]
  caseNotes: NoteRow[]
  others: StaffCase[]
  team: StaffMember[]
  hasPreparedFile: boolean
  /** Money and insurance on this case, for the full history (empty before migrations 008 and 009). */
  refunds: { id: string; at: string; amount: number; status: string; reason: string; by: string; decidedAt: string | null; decidedBy: string | null }[]
  quotes: { at: string; price: number; insurer: string | null; status: string; decidedAt: string | null }[]
  /** Set when part of the case could not be read; the rest is shown. */
  problem: string | null
}

export async function loadCaseDetail(staff: Staff, id: string): Promise<CaseDetail | null> {
  if (staff.demo) {
    const data = demoConsoleData()
    const app = data.apps.find((a) => a.id === id)
    if (!app) return null
    const { cases, team } = await loadConsoleData(staff)
    const reviews = data.reviews[id] ?? {}
    const c = cases.find((x) => x.id === id) ?? toStaffCase(app, reviews, data.owners[id] ?? null)
    const notes = parseNotes(app.additional_notes) as ApplicationNotes & Record<string, unknown>
    const uploads = (notes.uploads ?? []).map((u) => ({ type: u.type, name: u.name, at: u.at, url: null }))
    const docs = buildDocs(app, reviews, {}, uploads)
    return { app, notes, c, docs, reviews, events: [], audit: [], caseNotes: [], refunds: [], quotes: [], others: cases.filter((x) => x.email === c.email && x.id !== id), team, hasPreparedFile: c.stage === "ready" || c.stage === "appointment" || c.stage === "completed", problem: null }
  }

  if (!UUID_RE.test(id)) return null
  const client = serviceClient()
  if (!client) return null
  const { data: row, error } = await client.from("visa_applications").select("*").eq("id", id).maybeSingle()
  if (error || !row) return null
  const app = row as VisaApplication
  let problem: string | null = null

  const [reviewRes, events, auditRes, notesRes, assignRes, files, consoleData, refundRes, quoteRes] = await Promise.all([
    client.from("document_reviews").select("document_type, status, note, reviewed_at, reviewed_by").eq("application_id", id),
    loadApplicationEvents(id),
    client.from("audit_events").select("id, created_at, actor_name, actor_type, action, type, field, notified").eq("target_table", "visa_applications").eq("target_id", id).order("created_at", { ascending: false }).limit(100),
    client.from("case_notes").select("id, created_at, author_id, author_name, body, pinned").eq("application_id", id).order("created_at", { ascending: false }).limit(100),
    client.from("case_assignments").select("staff_id").eq("application_id", id).order("created_at", { ascending: false }).limit(1),
    client.storage.from(DOC_BUCKET).list(id, { limit: 100 }),
    loadConsoleData(staff),
    client.from("refund_requests").select("id, requested_at, amount, status, reason, requested_by, decided_at, decided_by").eq("application_id", id).order("requested_at", { ascending: false }).limit(20),
    client.from("insurance_quotes").select("sent_at, price, insurer, status, decided_at").eq("application_id", id).limit(5),
  ])
  if (reviewRes.error && !missingTable(reviewRes.error)) problem = "Document reviews could not be read."
  if (auditRes.error && !missingTable(auditRes.error)) problem ??= "The audit history could not be read."

  const reviews = toDocumentReviews(reviewRes.data ?? [])
  const reviewers: Record<string, string> = {}
  for (const r of (reviewRes.data ?? []) as { document_type: string; reviewed_by: string | null }[]) if (r.reviewed_by) reviewers[r.document_type] = r.reviewed_by
  const notes = parseNotes(app.additional_notes) as ApplicationNotes & Record<string, unknown>

  // Upload records with their storage paths, signed for 15 minutes (customer-facing views never get the path).
  const uploads = (notes.uploads ?? []).filter((u) => u && typeof u.path === "string" && u.path.startsWith(`${id}/`))
  const signed = await Promise.all(
    uploads.map(async (u) => {
      const { data } = await client.storage.from(DOC_BUCKET).createSignedUrl(u.path, 15 * 60)
      return { type: u.type, name: u.name, at: u.at, url: data?.signedUrl ?? null }
    }),
  )
  const docs = buildDocs(app, reviews, reviewers, signed)
  const ownerId = ((assignRes.data ?? []) as { staff_id: string | null }[])[0]?.staff_id ?? null
  const c = toStaffCase(app, reviews, ownerId, consoleData.settings.sla)
  const email = (app.email ?? "").toLowerCase()

  return {
    app,
    notes,
    c,
    docs,
    reviews,
    events: toApplicationEvents(events),
    audit: ((auditRes.data ?? []) as { id: number; created_at: string; actor_name: string; actor_type: string; action: string; type: string; field: string | null; notified: string | null }[]).map((a) => ({
      id: a.id,
      at: a.created_at,
      actor: a.actor_name || a.actor_type,
      action: a.action,
      type: a.type,
      field: a.field,
      notified: a.notified,
    })),
    caseNotes: ((notesRes.data ?? []) as { id: string; created_at: string; author_id: string | null; author_name: string; body: string; pinned: boolean }[])
      .map((n) => ({ id: n.id, at: n.created_at, author: n.author_name, authorId: n.author_id, body: n.body, pinned: n.pinned }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at)),
    others: consoleData.cases.filter((x) => x.email.toLowerCase() === email && x.id !== id),
    team: consoleData.team,
    hasPreparedFile: !!files.data?.some((f) => f.name === "final_package.pdf"),
    refunds: ((refundRes.data ?? []) as { id: string; requested_at: string; amount: number; status: string; reason: string; requested_by: string; decided_at: string | null; decided_by: string | null }[]).map((r) => ({ id: r.id, at: r.requested_at, amount: Number(r.amount), status: r.status, reason: r.reason, by: r.requested_by, decidedAt: r.decided_at, decidedBy: r.decided_by })),
    quotes: ((quoteRes.data ?? []) as { sent_at: string; price: number; insurer: string | null; status: string; decided_at: string | null }[]).map((q) => ({ at: q.sent_at, price: Number(q.price), insurer: q.insurer, status: q.status, decidedAt: q.decided_at })),
    problem,
  }
}

function buildDocs(app: VisaApplication, reviews: DocumentReviews, reviewers: Record<string, string>, files: { type: string; name: string; at: string; url: string | null }[]): DocRow[] {
  return customerDocuments(app, reviews).rows.map((r) => {
    const review = reviews[r.document_type]
    return {
      type: r.document_type,
      title: r.title,
      state: r.state,
      note: review?.status === "rejected" ? review.note : null,
      reviewedAt: review?.reviewedAt ?? null,
      reviewedBy: reviewers[r.document_type] ?? null,
      files: files.filter((f) => f.type === r.document_type).sort((a, b) => b.at.localeCompare(a.at)).map(({ name, at, url }) => ({ name, at, url })),
    }
  })
}
