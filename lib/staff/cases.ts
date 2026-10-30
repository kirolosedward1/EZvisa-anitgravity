/**
 * The staff view of a case: its console stage, who it is waiting on (us or the customer), what is blocking it and its
 * SLA clock. Built from the application row, its document reviews and its owner. Pure, tested in cases.test.ts.
 *
 * There is no visa outcome: a case ends at Completed after the appointment, or Cancelled. Old rows with the legacy
 * "rejected" status are shown as Closed and offered nowhere.
 */
import { getReference, isPaid } from "@/lib/application-status"
import { customerDocuments } from "@/lib/dashboard-state"
import { applicationInsurance } from "@/lib/insurance"
import { uploadRecords, type DocumentReviews } from "@/lib/document-reviews"
import { REQUIREMENTS } from "@/lib/shared/wizard-contract"
import type { VisaApplication } from "@/lib/types/visa-application"
import { addBusinessDays, addHours, SLA } from "@/lib/staff/sla"

export type StaffStage = "payment" | "documents" | "review" | "preparation" | "ready" | "appointment" | "completed" | "cancelled" | "closed"

export type Tone = "amber" | "green" | "blue" | "grey" | "red"

/** Stage names and pill tones from the Cases and Case boards ("Appointment booked" matches the code's status). */
export const STAGE: Record<StaffStage, { label: string; tone: Tone }> = {
  payment: { label: "Payment due", tone: "grey" },
  documents: { label: "Documents", tone: "amber" },
  review: { label: "Expert review", tone: "blue" },
  preparation: { label: "Preparation", tone: "blue" },
  ready: { label: "Ready", tone: "green" },
  appointment: { label: "Appointment booked", tone: "green" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
  closed: { label: "Closed", tone: "grey" },
}

/** The open stages in pipeline order (Overview "Open cases by stage"). */
export const OPEN_STAGES: StaffStage[] = ["payment", "documents", "review", "preparation", "ready", "appointment"]

/** Who the case waits on. "draft" is an unpaid application; "none" is open with no clock (appointment booked). */
export type Side = "us" | "customer" | "draft" | "none" | "closed"

/** What the team has to do when the case waits on us. */
export type Task = "review" | "files" | "help" | null

export type StaffCase = {
  id: string
  ref: string
  name: string
  email: string
  phone: string
  country: string
  stage: StaffStage
  side: Side
  task: Task
  /** The blocker, e.g. "Bank statement uploaded" or "Waiting for photo". */
  what: string
  /** When the current wait started (upload, last approval, help request). */
  since: string | null
  /** SLA deadline while the case waits on us. */
  dueAt: string | null
  ownerId: string | null
  createdAt: string
  updatedAt: string
  paid: boolean
  paidAt: string | null
  amount: number | null
  paymentFailed: boolean
  appointmentAt: string | null
  appointmentCentre: string | null
  helpRequested: boolean
  insuranceQuote: boolean
  /** Documents uploaded and not yet decided. */
  docsToCheck: number
}

const TITLE: Record<string, string> = Object.fromEntries(REQUIREMENTS.map((r) => [r.document_type, r.title]))

export function docTitle(type: string): string {
  return TITLE[type] ?? type
}

function list(names: string[]): string {
  if (names.length <= 2) return names.join(" and ")
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`
}

function staffStage(app: VisaApplication, missing: number): StaffStage {
  const status = (app.application_status ?? "").toLowerCase()
  if (status === "cancelled") return "cancelled"
  if (status === "completed") return "completed"
  if (status === "rejected") return "closed"
  if (!isPaid(app)) return "payment"
  if (status === "appointment_booked") return "appointment"
  if (status === "ready") return "ready"
  if (status === "preparation" || status === "approved") return "preparation"
  return missing > 0 ? "documents" : "review"
}

export function toStaffCase(app: VisaApplication, reviews: DocumentReviews = {}, ownerId: string | null = null): StaffCase {
  const id = app.id ?? ""
  const docs = customerDocuments(app, reviews)
  const uploads = uploadRecords(app.additional_notes)
  const lastUpload = (type: string) =>
    uploads.filter((u) => u.type === type).sort((a, b) => b.at.localeCompare(a.at))[0]?.at
  const stage = staffStage(app, docs.missing.length)
  const updated = app.updated_at || app.created_at || new Date(0).toISOString()

  const base: StaffCase = {
    id,
    ref: getReference(app.tracking_token) || `EZ-${id.slice(0, 8).toUpperCase()}`,
    name: (app.full_name || "").trim() || app.email || "Unnamed",
    email: app.email || "",
    phone: app.phone || "",
    country: app.destination_country || "",
    stage,
    side: "none",
    task: null,
    what: "",
    since: null,
    dueAt: null,
    ownerId,
    createdAt: app.created_at || updated,
    updatedAt: updated,
    paid: isPaid(app),
    paidAt: app.paid_at ?? null,
    amount: typeof app.payment_amount === "number" ? app.payment_amount : null,
    paymentFailed: (app.payment_status ?? "").toLowerCase() === "failed",
    appointmentAt: app.appointment_at ?? null,
    appointmentCentre: app.appointment_centre ?? null,
    helpRequested: app.appointment_help_status === "requested",
    insuranceQuote: applicationInsurance(app.additional_notes) === "quote",
    docsToCheck: 0,
  }

  if (stage === "completed" || stage === "cancelled" || stage === "closed") return { ...base, side: "closed", what: STAGE[stage].label }
  if (stage === "payment") return { ...base, side: "draft", what: base.paymentFailed ? "Payment failed" : "Not paid yet" }
  if (stage === "appointment") return { ...base, side: "none", what: "Appointment booked" }

  if (stage === "documents" || stage === "review") {
    // Uploaded and not decided: the team's turn, 24 hours from the oldest waiting upload.
    // Rows can share a flag (passport and residence visa both use has_passport), so when the case has upload
    // records only rows with an actual upload count; older cases without records fall back to the flags.
    const flagged = docs.rows.filter((r) => r.state === "received" || r.state === "checking")
    const uploaded = flagged.filter((r) => lastUpload(r.document_type))
    const waiting = uploads.length > 0 ? uploaded : flagged
    if (waiting.length > 0) {
      const since = waiting.map((r) => lastUpload(r.document_type) || updated).sort()[0]
      const names = waiting.map((r) => docTitle(r.document_type))
      return {
        ...base,
        side: "us",
        task: "review",
        what: waiting.length === 1 ? `${names[0]} uploaded` : `${waiting.length} documents to check`,
        since,
        dueAt: addHours(since, SLA.reviewHours),
        docsToCheck: waiting.length,
      }
    }
    const redo = docs.rows.filter((r) => r.state === "rejected").map((r) => docTitle(r.document_type))
    const unsent = uploads.length > 0 ? flagged.filter((r) => !lastUpload(r.document_type)) : []
    const missing = [...docs.rows.filter((r) => r.state === "missing"), ...unsent].map((r) => docTitle(r.document_type))
    if (redo.length || missing.length) {
      return { ...base, side: "customer", what: redo.length ? `${list(redo)} sent back` : `Waiting for ${list(missing).toLowerCase()}` }
    }
    // Everything approved but the stage was not moved on: the file is due, as in Preparation.
  }

  if (stage === "preparation" || stage === "documents" || stage === "review") {
    const approvals = Object.values(reviews).filter((r) => r.status === "approved").map((r) => r.reviewedAt).sort()
    const since = approvals[approvals.length - 1] || updated
    return { ...base, side: "us", task: "files", what: "File to prepare", since, dueAt: addBusinessDays(since, SLA.fileBusinessDays) }
  }

  // Ready
  if (base.helpRequested) {
    const since = app.appointment_help_requested_at || updated
    return { ...base, side: "us", task: "help", what: "Asked us to book the appointment", since, dueAt: addHours(since, SLA.helpHours) }
  }
  if (base.appointmentAt) return { ...base, side: "none", what: "Appointment saved" }
  return { ...base, side: "customer", what: app.file_downloaded_at ? "Appointment not saved yet" : "File not downloaded yet" }
}

export function isOpen(c: StaffCase): boolean {
  return c.side !== "closed"
}

export function isOver(c: StaffCase, now = Date.now()): boolean {
  return c.side === "us" && !!c.dueAt && Date.parse(c.dueAt) < now
}

/** Queue order: past SLA first (most overdue first), then by deadline, then the longest waiting. */
export function byUrgency(now = Date.now()) {
  return (a: StaffCase, b: StaffCase) => {
    const due = (c: StaffCase) => (c.dueAt ? Date.parse(c.dueAt) : Number.POSITIVE_INFINITY)
    const overA = isOver(a, now) ? 0 : 1
    const overB = isOver(b, now) ? 0 : 1
    if (overA !== overB) return overA - overB
    if (due(a) !== due(b)) return due(a) - due(b)
    return (a.since ?? a.updatedAt).localeCompare(b.since ?? b.updatedAt)
  }
}
