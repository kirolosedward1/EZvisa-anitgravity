"use server"

// Settings board writes: message templates, SLA targets, automatic assignment and visa centres (migration 011).
// Admin only (permission "settings"), validated, logged in the audit with before and after values.
import { revalidatePath } from "next/cache"
import { SCHEMAS, type SettingKey } from "@/lib/staff/console-settings"
import { staffWrite } from "@/lib/staff/audit"
import { getStaff, invalidateMatrix, missingTable } from "@/lib/staff/session"

export type SettingResult = { ok: true; message: string } | { ok: false; error: string }
const LABEL: Record<SettingKey, string> = { templates: "Message templates", sla: "SLA targets", auto_assign: "Automatic assignment", centres: "Visa centres", permissions: "Permissions by role" }

export async function saveSetting(key: SettingKey, value: unknown): Promise<SettingResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Sign in again." }
  if (!Object.hasOwn(SCHEMAS, key)) return { ok: false, error: "Unknown setting." }
  const v = SCHEMAS[key].safeParse(value)
  if (!v.success) return { ok: false, error: v.error.issues[0]?.message ? `Check the values: ${v.error.issues[0].message}.` : "Check the values." }
  const res = await staffWrite(staff, "settings", { action: `${LABEL[key]} changed`, type: "settings", targetTable: "console_settings", targetId: key, targetLabel: LABEL[key], field: key, notified: "No" }, async (client) => {
    const before = await client.from("console_settings").select("value").eq("key", key).maybeSingle()
    if (before.error) return { ok: false, status: 500, error: missingTable(before.error) ? "Saving settings needs migrations 011 and 012 (console_settings)." : "The setting could not be read." }
    const { error } = await client.from("console_settings").upsert({ key, value: v.data, updated_by: staff.staffId || null, updated_at: new Date().toISOString() })
    if (error) return { ok: false, status: 500, error: "The setting could not be saved." }
    return { ok: true, value: true, before: before.data?.value ?? "default", after: v.data }
  })
  if (!res.ok) return { ok: false, error: res.error }
  if (key === "permissions") await invalidateMatrix()
  revalidatePath("/admin", "layout")
  return { ok: true, message: res.demo ? "Demo: this would be saved. Nothing was stored." : `${LABEL[key]} saved. Every board uses it from the next page load.` }
}

export async function resetSetting(key: SettingKey): Promise<SettingResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Sign in again." }
  if (!Object.hasOwn(SCHEMAS, key)) return { ok: false, error: "Unknown setting." }
  const res = await staffWrite(staff, "settings", { action: `${LABEL[key]} reset to the default`, type: "settings", targetTable: "console_settings", targetId: key, targetLabel: LABEL[key], field: key, after: "default", notified: "No" }, async (client) => {
    const before = await client.from("console_settings").select("value").eq("key", key).maybeSingle()
    if (before.error) return { ok: false, status: 500, error: missingTable(before.error) ? "Saving settings needs migrations 011 and 012 (console_settings)." : "The setting could not be read." }
    const { error } = await client.from("console_settings").delete().eq("key", key)
    if (error) return { ok: false, status: 500, error: "The setting could not be reset." }
    return { ok: true, value: true, before: before.data?.value ?? "default" }
  })
  if (!res.ok) return { ok: false, error: res.error }
  if (key === "permissions") await invalidateMatrix()
  revalidatePath("/admin", "layout")
  return { ok: true, message: res.demo ? "Demo: this would be reset. Nothing was stored." : `${LABEL[key]} reset to the default.` }
}
