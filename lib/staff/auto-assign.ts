/**
 * Automatic owner on payment (Team board, "fewest open cases"): a newly paid case without an owner goes to the active
 * specialist with the fewest open cases. Server only, best effort: it never throws and never blocks the payment;
 * before migration 005 (or with no specialists) it does nothing. Settings can turn it off or cap it per specialist. Logged as an automation, undoable from Audit.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

const CLOSED = new Set(["completed", "cancelled", "rejected"])

/** Pure: the specialist with the fewest open cases (ties by name). */
export function pickFewestOpen(specialists: { id: string; name: string }[], openCount: Map<string, number>): { id: string; name: string } | null {
  return [...specialists].sort((a, b) => (openCount.get(a.id) ?? 0) - (openCount.get(b.id) ?? 0) || a.name.localeCompare(b.name))[0] ?? null
}

export async function autoAssignOnPayment(client: SupabaseClient, applicationId: string): Promise<void> {
  try {
    // Settings board (migration 011): automatic assignment can be turned off or capped. No row means on, no cap.
    const setting = await client.from("console_settings").select("value").eq("key", "auto_assign").maybeSingle()
    const rule = (setting.data?.value ?? {}) as { on?: boolean; cap?: number | null }
    if (rule.on === false) return
    const existing = await client.from("case_assignments").select("id").eq("application_id", applicationId).limit(1)
    if (existing.error || existing.data?.length) return
    const staff = await client.from("staff_users").select("id, name").eq("role", "specialist").eq("active", true)
    const specialists = (staff.data ?? []) as { id: string; name: string }[]
    if (staff.error || !specialists.length) return

    // Open cases per specialist: the latest assignment of each case, on a case that is not closed.
    const rows = await client.from("case_assignments").select("application_id, staff_id, created_at").order("created_at", { ascending: false }).limit(20000)
    const latest = new Map<string, string | null>()
    for (const r of (rows.data ?? []) as { application_id: string; staff_id: string | null }[]) if (!latest.has(r.application_id)) latest.set(r.application_id, r.staff_id)
    const ids = [...latest.entries()].filter(([, s]) => s && specialists.some((x) => x.id === s)).map(([id]) => id)
    const open = new Map<string, number>()
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200)
      const { data } = await client.from("visa_applications").select("id, application_status").in("id", chunk)
      for (const a of (data ?? []) as { id: string; application_status: string | null }[]) {
        if (CLOSED.has((a.application_status ?? "").toLowerCase())) continue
        const s = latest.get(a.id)!
        open.set(s, (open.get(s) ?? 0) + 1)
      }
    }
    const cap = typeof rule.cap === "number" && rule.cap > 0 ? rule.cap : null
    const owner = pickFewestOpen(cap ? specialists.filter((x) => (open.get(x.id) ?? 0) < cap) : specialists, open)
    if (!owner) return
    const { error } = await client.from("case_assignments").insert({ application_id: applicationId, staff_id: owner.id, assigned_by: null, rule: "fewest_open" })
    if (error) return
    await client.from("audit_events").insert({
      actor_type: "automation",
      actor_name: "Automation",
      action: `Case auto-assigned to ${owner.name}, rule "fewest open cases"`,
      type: "assignment",
      target_table: "visa_applications",
      target_id: applicationId,
      field: "owner",
      before: null,
      after: owner.id,
      notified: "No",
      reversible: true,
    })
    const { recordApplicationEvent } = await import("@/lib/application-events-server")
    await recordApplicationEvent(applicationId, "specialist_assigned", { name: owner.name.split(/\s+/)[0] }, "system", client)
  } catch {
    // best effort
  }
}
