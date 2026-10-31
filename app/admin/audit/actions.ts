"use server"

// Undo from the audit log: only assignments, internal notes and role changes. The original row is never edited; a
// Reversal event is logged with reversal_of pointing to it. Admin only.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { serviceClient } from "@/lib/applications"
import { recordAudit } from "@/lib/staff/audit"
import { can, isRole } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

export async function undoEvent(input: { id: number }): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const staff = await getStaff()
  if (!staff || !can(staff.role, "team")) return { ok: false, error: "Only an admin can undo." }
  if (staff.demo) return { ok: true, message: "Demo: nothing to undo." }
  const v = z.object({ id: z.number().int().positive() }).safeParse(input)
  if (!v.success) return { ok: false, error: "Invalid event." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: ev } = await client.from("audit_events").select("*").eq("id", v.data.id).maybeSingle()
  if (!ev || !ev.reversible) return { ok: false, error: "This event cannot be undone." }
  const { data: done } = await client.from("audit_events").select("id").eq("reversal_of", ev.id).limit(1)
  if (done?.length) return { ok: false, error: "This event was already undone." }

  if (ev.type === "assignment" && ev.target_id) {
    const { error } = await client.from("case_assignments").insert({ application_id: ev.target_id, staff_id: (ev.before as string | null) ?? null, assigned_by: staff.staffId, rule: ev.before ? "manual" : "unassigned" })
    if (error) return { ok: false, error: "The owner could not be restored." }
  } else if (ev.type === "note" && typeof ev.field === "string" && ev.field.startsWith("case_notes.")) {
    const { error } = await client.from("case_notes").delete().eq("id", ev.field.slice("case_notes.".length))
    if (error) return { ok: false, error: "The note could not be removed." }
  } else if (ev.type === "team" && ev.field === "role" && ev.target_id && isRole(ev.before)) {
    const { error } = await client.from("staff_users").update({ role: ev.before }).eq("id", ev.target_id)
    if (error) return { ok: false, error: "The role could not be restored." }
  } else if (ev.type === "team" && ev.field === "active" && ev.target_id && typeof ev.before === "boolean") {
    const { error } = await client.from("staff_users").update({ active: ev.before }).eq("id", ev.target_id)
    if (error) return { ok: false, error: "The change could not be reversed." }
  } else {
    return { ok: false, error: "This event cannot be undone." }
  }
  await recordAudit(staff, { action: `Undid #${ev.id}: ${ev.action}`, type: "reversal", targetTable: ev.target_table ?? undefined, targetId: ev.target_id ?? undefined, targetLabel: ev.target_label ?? undefined, field: ev.field ?? undefined, before: ev.after, after: ev.before, notified: "No", reversalOf: ev.id }, client)
  revalidatePath("/admin/audit")
  return { ok: true, message: "Undone. A reversal event was logged." }
}
