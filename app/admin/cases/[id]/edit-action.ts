"use server"

// Edit application details on behalf of the customer (Case board). The answers are merged into the same shared
// contract the website and app write (lib/shared/wizard-contract.ts applicationColumns), so all three stay in step.
// The email (how the customer signs in) never changes here, and after payment nothing that changes the fee does.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { isPaid } from "@/lib/application-status"
import { applicationColumns, parseNotes, type WizardAnswers } from "@/lib/shared/wizard-contract"
import { editableAnswers, editableFields as fields, type EditableFields } from "@/lib/staff/editable"
import { recordAudit } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

export async function editApplication(input: { id: string; answers: EditableFields; note: string }): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "edit")) return { ok: false, error: "Your role cannot edit application details." }
  const parsed = z.object({ id: staff.demo ? z.string().min(1) : z.string().regex(UUID_RE), answers: fields, note: z.string().trim().min(3).max(300) }).safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue?.path.includes("note") ? "Write why you are changing it (for the audit log)." : `Check ${String(issue?.path.at(-1) ?? "the form")}.` }
  }
  const v = parsed.data
  if (v.answers.travelStartDate && v.answers.travelEndDate && v.answers.travelEndDate < v.answers.travelStartDate) return { ok: false, error: "The return date must be after the departure date." }
  if (staff.demo) return { ok: true, message: "Demo: the changes would be saved. Nothing was stored." }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: row } = await client.from("visa_applications").select("*").eq("id", v.id).maybeSingle()
  if (!row) return { ok: false, error: "Case not found." }
  const before = editableAnswers(row)
  const notes = parseNotes(row.additional_notes)
  // After payment the fee is fixed: a spouse joining or leaving the application is a new case or a refund.
  if (isPaid(row) && before.spouseAccompanying !== v.answers.spouseAccompanying) return { ok: false, error: "The fee is paid: a spouse cannot be added or removed now. Create a separate case or use a refund." }
  const changed = (Object.keys(v.answers) as (keyof EditableFields)[]).filter((k) => (before[k] ?? "") !== (v.answers[k] ?? ""))
  if (!changed.length) return { ok: false, error: "Nothing changed." }

  const merged: Partial<WizardAnswers> = { ...((notes.wizard ?? {}) as Partial<WizardAnswers>), ...v.answers, email: row.email } as Partial<WizardAnswers>
  const platform = notes.platform === "ios" || notes.platform === "android" ? notes.platform : "web"
  const columns = applicationColumns(merged, row.email, String(notes.wizardStep ?? "payment"), notes, {
    platform,
    source: notes.source === "mobile-app" ? "mobile-app" : "website",
    extra: { lastEditedByStaff: { id: staff.staffId, name: staff.name, at: new Date().toISOString(), fields: changed } } as Record<string, unknown>,
  })
  // Keep the columns this edit does not own.
  const { email: _email, ...update } = columns
  let q = client.from("visa_applications").update({ ...update, updated_at: new Date().toISOString() }).eq("id", v.id)
  q = row.updated_at ? q.eq("updated_at", row.updated_at) : q.is("updated_at", null)
  const { data: saved, error } = await q.select("id")
  if (error) return { ok: false, error: "The changes could not be saved." }
  if (!saved?.length) return { ok: false, error: "The customer or a colleague changed this case a moment ago. Reload and try again." }

  const pick = (o: EditableFields) => Object.fromEntries(changed.map((k) => [k, k === "passportNumber" && o[k] ? `…${String(o[k]).slice(-3)}` : o[k]]))
  await recordAudit(staff, {
    action: `Application details edited on behalf of the customer (${changed.join(", ")}): ${v.note}`,
    type: "edit",
    targetTable: "visa_applications",
    targetId: v.id,
    field: changed.join(", "),
    before: pick(before),
    after: pick(v.answers),
    notified: "Customer dashboard shows the new details",
  }, client)
  revalidatePath(`/admin/cases/${v.id}`)
  revalidatePath("/admin/cases")
  return { ok: true, message: `Saved ${changed.length} ${changed.length === 1 ? "change" : "changes"} and logged them with your name.` }
}
