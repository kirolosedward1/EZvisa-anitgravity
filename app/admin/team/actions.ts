"use server"

// Team and roles: add a member (they sign in normally with that email), change a role, deactivate or reactivate.
// Admin only. Emails in ADMIN_EMAILS are always admins whatever their row says.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { serviceClient } from "@/lib/applications"
import { recordAudit } from "@/lib/staff/audit"
import { can, ROLES } from "@/lib/staff/roles"
import { getStaff, isStaffEmail, missingTable } from "@/lib/staff/session"

export type TeamResult = { ok: true; message: string } | { ok: false; error: string }
const NEEDS_005 = "Team changes need migration 005 (staff_users)."

export async function addMember(input: { email: string; name: string; role: string }): Promise<TeamResult> {
  const staff = await getStaff()
  if (!staff || !can(staff.role, "team")) return { ok: false, error: "Only an admin can manage the team." }
  const v = z.object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().min(2).max(80), role: z.enum(ROLES) }).safeParse(input)
  if (!v.success) return { ok: false, error: "Enter a name, a valid email and a role." }
  if (staff.demo) return { ok: true, message: `Demo: ${v.data.name} would be added as ${v.data.role}. Nothing was saved.` }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data, error } = await client.from("staff_users").insert({ email: v.data.email, name: v.data.name, role: v.data.role }).select("id").single()
  if (error) return { ok: false, error: missingTable(error) ? NEEDS_005 : error.code === "23505" ? "That email is already on the team." : "The member could not be added." }
  await recordAudit(staff, { action: `${v.data.name} added to the team as ${v.data.role}`, type: "team", targetTable: "staff_users", targetId: data.id, targetLabel: v.data.email, field: "staff_users", after: v.data, notified: "No", reversible: false })
  revalidatePath("/admin/team")
  return { ok: true, message: `${v.data.name} added. They sign in at /staff with ${v.data.email} (Google or an email sign-in link); 2-step can be turned on in their account.` }
}

export async function updateMember(input: { id: string; role?: string; active?: boolean; name?: string }): Promise<TeamResult> {
  const staff = await getStaff()
  if (!staff || !can(staff.role, "team")) return { ok: false, error: "Only an admin can manage the team." }
  const v = z.object({ id: staff.demo ? z.string().min(1) : z.string().uuid(), role: z.enum(ROLES).optional(), active: z.boolean().optional(), name: z.string().trim().min(2).max(80).optional() }).safeParse(input)
  if (!v.success || (v.data.role === undefined && v.data.active === undefined && v.data.name === undefined)) return { ok: false, error: v.success ? "Nothing to change." : "Enter a name of 2 to 80 characters." }
  if (v.data.id === staff.staffId && v.data.name === undefined) return { ok: false, error: "You cannot change your own role or access." }
  if (staff.demo) return { ok: true, message: "Demo: the change would be saved. Nothing was stored." }
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: before } = await client.from("staff_users").select("name, email, role, active").eq("id", v.data.id).maybeSingle()
  if (!before) return { ok: false, error: "Member not found." }
  // A rename is its own change (also allowed on yourself); role and access are not changed with it.
  const renaming = v.data.name !== undefined
  const patch = renaming ? { name: v.data.name } : { ...(v.data.role ? { role: v.data.role } : {}), ...(v.data.active !== undefined ? { active: v.data.active } : {}) }
  const { error } = await client.from("staff_users").update(patch).eq("id", v.data.id)
  if (error) return { ok: false, error: "The change could not be saved." }
  await recordAudit(staff, {
    action: renaming ? `Renamed ${before.name} to ${v.data.name}` : v.data.role ? `Role changed for ${before.name}: ${before.role} to ${v.data.role}` : `${before.name} ${v.data.active ? "reactivated" : "deactivated"}`,
    type: "team",
    targetTable: "staff_users",
    targetId: v.data.id,
    targetLabel: before.email,
    field: renaming ? "name" : v.data.role ? "role" : "active",
    before: renaming ? before.name : v.data.role ? before.role : before.active,
    after: renaming ? v.data.name : v.data.role ?? v.data.active,
    notified: "No",
    reversible: !renaming,
  }, client)
  revalidatePath("/admin/team")
  const env = isStaffEmail(before.email) ? " This email is in ADMIN_EMAILS, so it stays an admin until it is removed there." : ""
  return { ok: true, message: `Saved. It applies on their next page load.${env}` }
}
