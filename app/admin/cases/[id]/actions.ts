"use server"

// Case writes: document decisions (the shared DocumentReview panel on the Case, Documents and Viewer boards), stage
// changes and internal notes. Each checks the role, writes with the service role, records the audit row and, where
// the customer sees it, the application_events row their dashboard reads.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { customerDocuments } from "@/lib/dashboard-state"
import { toDocumentReviews } from "@/lib/document-reviews"
import { DOC_BUCKET } from "@/lib/shared/wizard-contract"
import { recordAudit } from "@/lib/staff/audit"
import { docTitle } from "@/lib/staff/cases"
import { can } from "@/lib/staff/roles"
import { getStaff, type Staff } from "@/lib/staff/session"
import { STAGE_TARGETS, type StageTarget } from "@/lib/staff/stage-targets"

export type CaseActionResult = { ok: true; message: string; movedToPreparation?: boolean } | { ok: false; error: string }

const id = z.string().regex(UUID_RE)

function refresh(caseId: string) {
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath("/admin/cases")
  revalidatePath("/admin/overview")
  revalidatePath("/admin/documents")
}

async function session(): Promise<Staff | { error: string }> {
  const staff = await getStaff()
  return staff ?? { error: "Your session has ended. Sign in again." }
}

/** Approve, send back (note required, the customer reads it) or undo (back to "being checked"). */
export type Highlight = { n: number; label: string; page: number; x: number; y: number; w: number; h: number }

export async function reviewDocument(input: { id: string; documentType: string; decision: "approved" | "rejected" | "checking"; note?: string; uncheckedCount?: number; highlights?: Highlight[] }): Promise<CaseActionResult> {
  const staff = await session()
  if ("error" in staff) return { ok: false, error: staff.error }
  if (!can(staff.role, "docs")) return { ok: false, error: "Your role can view documents but not decide on them." }
  const parsed = z
    .object({
      id: staff.demo ? z.string().min(1) : id,
      documentType: z.string().min(2).max(40),
      decision: z.enum(["approved", "rejected", "checking"]),
      note: z.string().trim().max(1000).optional(),
      uncheckedCount: z.number().int().min(0).max(20).optional(),
      highlights: z
        .array(z.object({ n: z.number().int().min(1).max(50), label: z.string().max(60), page: z.number().int().min(1).max(500), x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0).max(1), h: z.number().min(0).max(1) }))
        .max(20)
        .optional(),
    })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: "That decision is not valid." }
  const v = parsed.data
  const note = v.note ?? ""
  if (v.decision === "rejected" && note.length < 5) return { ok: false, error: "Tell the customer what to fix (a few words at least)." }
  const title = docTitle(v.documentType)
  if (staff.demo) return { ok: true, message: `Demo: ${title} would be ${v.decision === "approved" ? "approved" : v.decision === "rejected" ? "sent back" : "reopened"}. Nothing was saved.` }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: row } = await client
    .from("visa_applications")
    .select("id, application_status, payment_status, additional_notes, has_passport, has_photos, has_bank_statements, has_employment_proof, updated_at")
    .eq("id", v.id)
    .maybeSingle()
  if (!row) return { ok: false, error: "Case not found." }
  if (!customerDocuments(row).rows.some((r) => r.document_type === v.documentType)) return { ok: false, error: "This document is not on the case's checklist." }

  const { data: prev } = await client.from("document_reviews").select("status, note").eq("application_id", v.id).eq("document_type", v.documentType).maybeSingle()
  const row0 = {
    application_id: v.id,
    document_type: v.documentType,
    status: v.decision,
    note: v.decision === "rejected" ? note : null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: staff.name,
  }
  // highlights and reviewer_id come with migration 006; without it the decision is saved without them.
  let { error } = await client
    .from("document_reviews")
    .upsert({ ...row0, highlights: v.decision === "rejected" && v.highlights?.length ? v.highlights : null, reviewer_id: staff.staffId }, { onConflict: "application_id,document_type" })
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ;({ error } = await client.from("document_reviews").upsert(row0, { onConflict: "application_id,document_type" }))
  }
  if (error) return { ok: false, error: "The decision could not be saved." }

  const unticked = v.decision === "approved" && v.uncheckedCount ? ` with ${v.uncheckedCount} checks unticked` : ""
  await recordAudit(staff, {
    action: v.decision === "approved" ? `${title} approved${unticked}` : v.decision === "rejected" ? `${title} sent back: "${note}"` : `${title} reopened for checking`,
    type: "document",
    targetTable: "visa_applications",
    targetId: v.id,
    field: `documents.${v.documentType}.status`,
    before: prev ?? null,
    after: { status: v.decision, note: v.decision === "rejected" ? note : null, ...(v.highlights?.length ? { highlights: v.highlights.length } : {}) },
    notified: v.decision === "rejected" ? "Customer dashboard (note)" : "Customer dashboard",
  }, client)
  if (v.decision !== "checking") await recordApplicationEvent(v.id, "document_reviewed", { document_type: v.documentType, status: v.decision }, "team", client)

  // Every document approved: the case moves to Preparation (Case board rule) and the customer sees it.
  let moved = false
  if (v.decision === "approved" && ["submitted", "awaiting_documents", "reviewing", "draft"].includes((row.application_status ?? "").toLowerCase())) {
    const { data: all } = await client.from("document_reviews").select("document_type, status, note, reviewed_at").eq("application_id", v.id)
    const docs = customerDocuments(row, toDocumentReviews(all ?? [])).rows
    if (docs.length > 0 && docs.every((d) => d.state === "approved")) {
      const { data: updated } = await client
        .from("visa_applications")
        .update({ application_status: "preparation", updated_at: new Date().toISOString() })
        .eq("id", v.id)
        .eq("application_status", row.application_status)
        .select("id")
      if (updated?.length) {
        moved = true
        await recordAudit(staff, { action: "Stage changed to Preparation: all documents approved", type: "stage", targetTable: "visa_applications", targetId: v.id, field: "application_status", before: row.application_status, after: "preparation", notified: "Customer dashboard" }, client)
        await recordApplicationEvent(v.id, "status_changed", { to: "preparation" }, "team", client)
      }
    }
  }
  refresh(v.id)
  const base = v.decision === "approved" ? `${title} approved.` : v.decision === "rejected" ? `${title} sent back. The customer sees your note on their dashboard.` : `${title} is back to being checked.`
  return { ok: true, message: moved ? `${base} Every document is approved, so the case moved to Preparation.` : base, movedToPreparation: moved }
}

/** Explicit stage change with a required note for the audit log. Ready needs the prepared file in storage. */
export async function changeStage(input: { id: string; to: StageTarget; note: string }): Promise<CaseActionResult> {
  const staff = await session()
  if ("error" in staff) return { ok: false, error: staff.error }
  if (!can(staff.role, "stage")) return { ok: false, error: "Your role cannot change a case's stage." }
  const parsed = z
    .object({ id: staff.demo ? z.string().min(1) : id, to: z.enum(Object.keys(STAGE_TARGETS) as [StageTarget, ...StageTarget[]]), note: z.string().trim().min(3).max(500) })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: "Choose a stage and write a note for the audit log." }
  const v = parsed.data
  const label = STAGE_TARGETS[v.to]
  if (staff.demo) return { ok: true, message: `Demo: the stage would change to ${label}. Nothing was saved.` }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: row } = await client.from("visa_applications").select("application_status, payment_status, updated_at").eq("id", v.id).maybeSingle()
  if (!row) return { ok: false, error: "Case not found." }
  if (!["paid", "completed"].includes((row.payment_status ?? "").toLowerCase()) && v.to !== "cancelled") {
    return { ok: false, error: "The case is not paid yet. Only Cancelled is possible before payment." }
  }
  if (row.application_status === v.to) return { ok: false, error: `The case is already at ${label}.` }
  if (v.to === "ready") {
    const { data: files } = await client.storage.from(DOC_BUCKET).list(v.id, { limit: 100 })
    if (!files?.some((f) => f.name === "final_package.pdf")) return { ok: false, error: "Ready needs the prepared file. Assemble it on the File preparation board first." }
  }

  let update = client.from("visa_applications").update({ application_status: v.to, updated_at: new Date().toISOString() }).eq("id", v.id)
  update = row.updated_at ? update.eq("updated_at", row.updated_at) : update.is("updated_at", null)
  const { data: updated, error } = await update.select("id")
  if (error) return { ok: false, error: "The stage could not be changed." }
  if (!updated?.length) return { ok: false, error: "Someone changed this case a moment ago. Reload and try again." }

  await recordAudit(staff, {
    action: `Stage changed to ${label}: ${v.note}`,
    type: "stage",
    targetTable: "visa_applications",
    targetId: v.id,
    field: "application_status",
    before: row.application_status,
    after: v.to,
    notified: "Customer dashboard",
  }, client)
  await recordApplicationEvent(v.id, "status_changed", { to: v.to }, "team", client)
  refresh(v.id)
  return { ok: true, message: `Stage changed to ${label}. Logged; the customer sees it on their dashboard.` }
}

/** Internal note, never shown to the customer. */
export async function addCaseNote(input: { id: string; body: string; pinned?: boolean }): Promise<CaseActionResult> {
  const staff = await session()
  if ("error" in staff) return { ok: false, error: staff.error }
  if (staff.role === "finance") return { ok: false, error: "Finance has cases read only." }
  const parsed = z.object({ id: staff.demo ? z.string().min(1) : id, body: z.string().trim().min(1).max(4000), pinned: z.boolean().optional() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: "Write the note first." }
  if (staff.demo) return { ok: true, message: "Demo: the note would be added. Nothing was saved." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data, error } = await client
    .from("case_notes")
    .insert({ application_id: parsed.data.id, author_id: staff.staffId, author_name: staff.name, body: parsed.data.body, pinned: !!parsed.data.pinned })
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: "The note could not be saved. Is migration 005 applied?" }
  await recordAudit(staff, { action: "Internal note added", type: "note", targetTable: "visa_applications", targetId: parsed.data.id, field: `case_notes.${data.id}`, after: { pinned: !!parsed.data.pinned }, notified: "No", reversible: true }, client)
  refresh(parsed.data.id)
  return { ok: true, message: "Note added." }
}
