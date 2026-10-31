"use server"

// Cases queue writes. Each goes through staffWrite (permission check, service-role write, audit row); the demo staff
// session gets a success answer and nothing is written.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { UUID_RE } from "@/lib/applications"
import { recordAudit, staffWrite } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"
import { serviceClient } from "@/lib/applications"

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

const ids = z.array(z.string().regex(UUID_RE)).min(1).max(200)

/** Assigns cases to a staff member, or unassigns them (staffId null). Admins assign anyone; specialists may take unassigned cases for themselves. */
export async function assignCases(input: { ids: string[]; staffId: string | null }): Promise<ActionResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  const parsed = z.object({ ids: staff.demo ? z.array(z.string()).min(1).max(200) : ids, staffId: staff.demo ? z.string().min(1).max(64).nullable() : z.string().uuid().nullable() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: "Pick at least one case and a valid owner." }
  const { staffId } = parsed.data
  const caseIds = [...new Set(parsed.data.ids)]

  const selfTake = staffId !== null && staffId === staff.staffId && can(staff.role, "docs")
  if (!can(staff.role, "assign") && !selfTake) return { ok: false, error: "Only an admin can assign cases to someone else." }
  if (staff.demo) return { ok: true, message: `Demo: ${caseIds.length} ${caseIds.length === 1 ? "case" : "cases"} would be assigned. Nothing was saved.` }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }

  let ownerName = "Unassigned"
  if (staffId) {
    const { data: owner, error } = await client.from("staff_users").select("id, name, active").eq("id", staffId).maybeSingle()
    if (error || !owner?.active) return { ok: false, error: "That team member is not active." }
    ownerName = owner.name || "a team member"
  }

  const { data: current, error: readError } = await client
    .from("case_assignments")
    .select("application_id, staff_id, created_at")
    .in("application_id", caseIds)
    .order("created_at", { ascending: false })
  if (readError) return { ok: false, error: "Case owners could not be read. Is migration 005 applied?" }
  const before = new Map<string, string | null>()
  for (const r of current ?? []) if (!before.has(r.application_id)) before.set(r.application_id, r.staff_id)

  // A specialist may only take cases nobody owns.
  if (selfTake && !can(staff.role, "assign") && caseIds.some((id) => before.get(id))) {
    return { ok: false, error: "Some of these cases already have an owner. Ask an admin to reassign them." }
  }

  const changed = caseIds.filter((id) => (before.get(id) ?? null) !== staffId)
  if (changed.length === 0) return { ok: true, message: "Nothing to change: those cases already have that owner." }

  const { error: writeError } = await client
    .from("case_assignments")
    .insert(changed.map((id) => ({ application_id: id, staff_id: staffId, assigned_by: staff.staffId, rule: staffId ? "manual" : "unassigned" })))
  if (writeError) return { ok: false, error: "The cases could not be assigned." }

  // One audit row per case, so each case's history and undo are exact.
  await Promise.all(
    changed.map((id) =>
      recordAudit(staff, {
        action: staffId ? `Case assigned to ${ownerName}` : "Case unassigned",
        type: "assignment",
        targetTable: "visa_applications",
        targetId: id,
        field: "owner",
        before: before.get(id) ?? null,
        after: staffId,
        notified: "No",
        reversible: true,
      }),
    ),
  )
  if (staffId) {
    const first = ownerName.split(/\s+/)[0]
    await Promise.all(changed.map((id) => recordApplicationEvent(id, "specialist_assigned", { name: first }, "team", client)))
  }
  revalidatePath("/admin/cases")
  revalidatePath("/admin/overview")
  return { ok: true, message: staffId ? `${changed.length} ${changed.length === 1 ? "case" : "cases"} assigned to ${ownerName}.` : `${changed.length} unassigned.` }
}

/** Cancels an open case. A note for the audit log is required; refunds are a separate step on Payments. */
export async function cancelCase(input: { id: string; note: string }): Promise<ActionResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  const parsed = z.object({ id: staff.demo ? z.string().min(1) : z.string().regex(UUID_RE), note: z.string().trim().min(3).max(500) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: "Write a short note for the audit log (at least 3 characters)." }
  if (!can(staff.role, "stage")) return { ok: false, error: "Your role cannot change a case's stage." }
  if (staff.demo) return { ok: true, message: "Demo: the case would be cancelled. Nothing was saved." }

  const { id, note } = parsed.data
  const result = await staffWrite(
    staff,
    "stage",
    { action: `Case cancelled: ${note}`, type: "stage", targetTable: "visa_applications", targetId: id, field: "application_status", notified: "No", reversible: false },
    async (c) => {
      const { data: row, error } = await c.from("visa_applications").select("application_status, updated_at").eq("id", id).maybeSingle()
      if (error || !row) return { ok: false, status: 404, error: "Case not found." }
      if (["cancelled", "completed"].includes((row.application_status ?? "").toLowerCase())) return { ok: false, error: "This case is already closed." }
      // Compare-before-write: only if nobody changed the case since it was read.
      let update = c.from("visa_applications").update({ application_status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id)
      update = row.updated_at ? update.eq("updated_at", row.updated_at) : update.is("updated_at", null)
      const { data: updated, error: writeError } = await update.select("id")
      if (writeError) return { ok: false, error: "The case could not be cancelled." }
      if (!updated?.length) return { ok: false, status: 409, error: "Someone changed this case a moment ago. Reload and try again." }
      return { ok: true, value: null, before: row.application_status, after: "cancelled" }
    },
  )
  if (!result.ok) return { ok: false, error: result.error }
  await recordApplicationEvent(id, "status_changed", { to: "cancelled" }, "team")
  revalidatePath("/admin/cases")
  revalidatePath("/admin/overview")
  return { ok: true, message: "Case cancelled and logged. If the customer paid, issue any refund from Payments." }
}

/** Bulk stage change from the queue: the same checks as the Case board, case by case (each one is logged). */
export async function bulkChangeStage(input: { ids: string[]; to: string; note: string }): Promise<ActionResult> {
  const { changeStage } = await import("@/app/admin/cases/[id]/actions")
  const { STAGE_TARGETS } = await import("@/lib/staff/stage-targets")
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "stage")) return { ok: false, error: "Your role cannot change a case's stage." }
  const v = z.object({ ids: z.array(z.string().min(1)).min(1).max(100), to: z.enum(Object.keys(STAGE_TARGETS) as [string, ...string[]]), note: z.string().trim().min(3).max(500) }).safeParse(input)
  if (!v.success) return { ok: false, error: "Choose a stage and write a reason for the audit log." }
  let done = 0
  const failed: string[] = []
  for (const id of v.data.ids) {
    const r = await changeStage({ id, to: v.data.to as keyof typeof STAGE_TARGETS, note: v.data.note })
    if (r.ok) done++
    else failed.push(r.error)
  }
  const label = STAGE_TARGETS[v.data.to as keyof typeof STAGE_TARGETS]
  if (staff.demo) return { ok: true, message: `Demo: ${v.data.ids.length} ${v.data.ids.length === 1 ? "case" : "cases"} would move to ${label}. Nothing was saved.` }
  if (!failed.length) return { ok: true, message: `${done} ${done === 1 ? "case" : "cases"} moved to ${label}.` }
  const reasons = [...new Set(failed)].slice(0, 2).join(" ")
  return done ? { ok: true, message: `${done} moved to ${label}; ${failed.length} not changed: ${reasons}` } : { ok: false, error: `None changed: ${reasons}` }
}
