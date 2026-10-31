/**
 * Document review queue: every uploaded document waiting for a decision, oldest first, across paid open cases. Pure
 * (tested in staff.test.ts); the Document review board signs the file links for the items it shows.
 */
import { customerDocuments } from "@/lib/dashboard-state"
import { uploadRecords, type DocumentReviews } from "@/lib/document-reviews"
import type { VisaApplication } from "@/lib/types/visa-application"
import { isOpen, type StaffCase } from "@/lib/staff/cases"
import { SLA } from "@/lib/staff/sla"

export type DocQueueItem = {
  key: string
  caseId: string
  type: string
  title: string
  name: string
  ref: string
  country: string
  ownerId: string | null
  /** Upload time of the file waiting (or the case's last change for old rows without upload records). */
  at: string
  fileName: string | null
  /** The customer re-uploaded after a send-back. */
  reupload: boolean
  over: boolean
}

export function docQueue(cases: StaffCase[], apps: VisaApplication[], reviews: Record<string, DocumentReviews>, now = Date.now()): DocQueueItem[] {
  const byId = new Map(apps.map((a) => [a.id ?? "", a]))
  const out: DocQueueItem[] = []
  for (const c of cases) {
    if (!isOpen(c) || !c.paid) continue
    const app = byId.get(c.id)
    if (!app) continue
    const r = reviews[c.id] ?? {}
    const uploads = uploadRecords(app.additional_notes)
    for (const row of customerDocuments(app, r).rows) {
      if (row.state !== "received" && row.state !== "checking") continue
      const latest = uploads.filter((u) => u.type === row.document_type).sort((a, b) => b.at.localeCompare(a.at))[0]
      // Rows sharing a flag with an uploaded row but with no upload of their own are not waiting for a check.
      if (!latest && uploads.length > 0) continue
      const at = latest?.at ?? c.updatedAt
      const review = r[row.document_type]
      out.push({
        key: `${c.id}~${row.document_type}`,
        caseId: c.id,
        type: row.document_type,
        title: row.title,
        name: c.name,
        ref: c.ref,
        country: c.country,
        ownerId: c.ownerId,
        at,
        fileName: latest?.name ?? null,
        reupload: !!review && review.status === "rejected",
        over: Date.parse(at) + SLA.reviewHours * 3_600_000 < now,
      })
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

/** "Over SLA", "Re-upload", or the age ("2h", "1d"). */
export function queueTag(item: DocQueueItem, now = Date.now()): { text: string; tone: "red" | "amber" | "blue" } {
  if (item.over) return { text: "Over SLA", tone: "red" }
  if (item.reupload) return { text: "Re-upload", tone: "amber" }
  const h = Math.max(0, Math.floor((now - Date.parse(item.at)) / 3_600_000))
  return h >= 24 ? { text: `${Math.floor(h / 24)}d`, tone: "amber" } : { text: `${Math.max(1, h)}h`, tone: "blue" }
}
