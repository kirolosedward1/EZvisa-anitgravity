"use server"

// Notification state for the signed-in staff member: mark all read and save preferences (migration 010).
import { revalidatePath } from "next/cache"
import { serviceClient } from "@/lib/applications"
import { readPrefs, type Prefs } from "@/lib/staff/notifications"
import { getStaff, missingTable } from "@/lib/staff/session"

export async function markAllRead(): Promise<{ ok: boolean; message: string }> {
  const staff = await getStaff()
  if (!staff) return { ok: false, message: "Your session has ended. Sign in again." }
  if (staff.demo) return { ok: true, message: "Demo: marked read on this screen only." }
  if (!staff.staffId) return { ok: false, message: "Your staff record is missing; apply migration 005 and sign in again." }
  const client = serviceClient()
  const { error } = client ? await client.from("staff_users").update({ notifications_read_at: new Date().toISOString() }).eq("id", staff.staffId) : { error: { code: "x" } }
  if (error) return { ok: false, message: (error as { code?: string }).code === "42703" || (error as { code?: string }).code === "PGRST204" ? "Needs migration 010." : "Could not save." }
  revalidatePath("/admin", "layout")
  return { ok: true, message: "All read." }
}

export async function savePrefs(prefs: Prefs): Promise<{ ok: boolean; message: string }> {
  const staff = await getStaff()
  if (!staff) return { ok: false, message: "Your session has ended. Sign in again." }
  if (staff.demo) return { ok: true, message: "Demo: preferences not saved." }
  if (!staff.staffId) return { ok: false, message: "Your staff record is missing; apply migration 005 and sign in again." }
  const client = serviceClient()
  const { error } = client ? await client.from("staff_users").update({ notification_prefs: readPrefs(prefs) }).eq("id", staff.staffId) : { error: { code: "x" } }
  if (error) return { ok: false, message: missingTable(error as { code?: string }) || (error as { code?: string }).code === "42703" || (error as { code?: string }).code === "PGRST204" ? "Needs migration 010." : "Could not save." }
  return { ok: true, message: "Saved" }
}
