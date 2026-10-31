"use server"

// Messaging: the broadcast recipient list leaves the console only through here, so it is logged.
import { z } from "zod"
import { recordAudit } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

export async function logBroadcastList(input: { count: number; filters: string; template: string }): Promise<{ ok: boolean; error?: string }> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "msg")) return { ok: false, error: "Your role cannot message customers." }
  const v = z.object({ count: z.number().int().min(0).max(100000), filters: z.string().max(500), template: z.string().max(60) }).safeParse(input)
  if (!v.success) return { ok: false, error: "Invalid request." }
  await recordAudit(staff, { action: `Broadcast list copied: ${v.data.count} recipients (${v.data.filters}), template ${v.data.template}`, type: "message", targetLabel: "Broadcast", field: "broadcast", after: v.data, notified: "No" })
  return { ok: true }
}

/** Website messages: mark one handled (or new again). Logged. */
export async function setContactStatus(input: { id: string; status: "new" | "handled" }): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "msg")) return { ok: false, error: "Your role cannot answer messages." }
  const v = z.object({ id: z.string().min(1).max(64), status: z.enum(["new", "handled"]) }).safeParse(input)
  if (!v.success) return { ok: false, error: "Invalid request." }
  if (staff.demo) return { ok: true, message: `Demo: the message would be marked ${v.data.status}. Nothing was saved.` }
  const { serviceClient } = await import("@/lib/applications")
  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const handled = v.data.status === "handled"
  const { data, error } = await client.from("contact_messages").update({ status: v.data.status, handled_by: handled ? staff.name : null, handled_at: handled ? new Date().toISOString() : null }).eq("id", v.data.id).select("email").maybeSingle()
  if (error || !data) return { ok: false, error: "The message could not be updated." }
  await recordAudit(staff, { action: handled ? "Website message marked handled" : "Website message reopened", type: "message", targetTable: "contact_messages", targetId: v.data.id, targetLabel: (data as { email: string }).email, field: "status", after: v.data.status, notified: "No" }, client)
  const { revalidatePath } = await import("next/cache")
  revalidatePath("/admin", "layout")
  return { ok: true, message: handled ? "Marked handled." : "Moved back to new." }
}
