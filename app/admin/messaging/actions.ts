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
