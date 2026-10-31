"use server"

// Customers board: correct a customer's name, phone or nationality once, on every case under their email. Each case
// is written through the same shared contract as the Case board edit (lib/shared/wizard-contract.ts), with the same
// compare-before-write check. The email (how the customer signs in) never changes here. Logged per customer.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { serviceClient } from "@/lib/applications"
import { applicationColumns, parseNotes, type WizardAnswers } from "@/lib/shared/wizard-contract"
import { editableAnswers } from "@/lib/staff/editable"
import { recordAudit } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  nationality: z.string().trim().max(60),
  note: z.string().trim().min(3).max(300),
})

export async function updateCustomerContact(input: z.input<typeof schema>): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "edit")) return { ok: false, error: "Your role cannot edit customer details." }
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue?.path.includes("note") ? "Write why you are changing it (for the audit log)." : `Check ${String(issue?.path.at(-1) ?? "the form")}.` }
  }
  const v = parsed.data
  if (staff.demo) return { ok: true, message: "Demo: the details would be saved on every case for this customer. Nothing was stored." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data, error } = await client.from("visa_applications").select("*").ilike("email", v.email.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(50)
  if (error) return { ok: false, error: "The customer's cases could not be read." }
  const rows = (data ?? []) as Record<string, unknown>[]
  if (!rows.length) return { ok: false, error: "No cases found for this email." }

  const patch = { firstName: v.firstName, lastName: v.lastName, phone: v.phone, nationality: v.nationality }
  let saved = 0
  let changedAny = false
  const busy: string[] = []
  let before: Record<string, string> | null = null
  for (const row of rows) {
    const current = editableAnswers(row)
    before ??= { firstName: current.firstName, lastName: current.lastName, phone: current.phone, nationality: current.nationality }
    const changed = (Object.keys(patch) as (keyof typeof patch)[]).filter((k) => (current[k] ?? "") !== patch[k])
    if (!changed.length) continue
    changedAny = true
    const notes = parseNotes(row.additional_notes as string | null | undefined)
    const merged = { ...((notes.wizard ?? {}) as Partial<WizardAnswers>), ...current, ...patch, email: row.email } as Partial<WizardAnswers>
    const platform = notes.platform === "ios" || notes.platform === "android" ? notes.platform : "web"
    const columns = applicationColumns(merged, String(row.email), String(notes.wizardStep ?? "payment"), notes, {
      platform,
      source: notes.source === "mobile-app" ? "mobile-app" : "website",
      extra: { lastEditedByStaff: { id: staff.staffId, name: staff.name, at: new Date().toISOString(), fields: changed } } as Record<string, unknown>,
    })
    const { email: _email, ...update } = columns
    let q = client.from("visa_applications").update({ ...update, updated_at: new Date().toISOString() }).eq("id", String(row.id))
    q = row.updated_at ? q.eq("updated_at", String(row.updated_at)) : q.is("updated_at", null)
    const res = await q.select("id")
    if (res.error || !res.data?.length) busy.push(String(row.tracking_token ?? row.id).slice(0, 12))
    else saved++
  }
  if (!changedAny) return { ok: false, error: "Nothing changed." }

  await recordAudit(staff, {
    action: `Customer details corrected on ${saved} ${saved === 1 ? "case" : "cases"}: ${v.note}`,
    type: "customer",
    targetTable: "customers",
    targetId: v.email,
    targetLabel: v.email,
    field: "firstName, lastName, phone, nationality",
    before,
    after: patch,
    notified: "Customer dashboard shows the new details",
  }, client)
  revalidatePath("/admin", "layout")
  if (busy.length) return { ok: false, error: `Saved on ${saved} ${saved === 1 ? "case" : "cases"}; ${busy.length} changed a moment ago and were skipped. Reload and try again.` }
  return { ok: true, message: `Saved on ${saved} ${saved === 1 ? "case" : "cases"} and logged with your name.` }
}
