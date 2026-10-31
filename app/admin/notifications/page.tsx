// Notifications board: the feed for the signed-in staff member and their preferences.
import { NotificationCentre } from "@/components/staff/notification-centre"
import { serviceClient } from "@/lib/applications"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { buildFeed, readPrefs, type MentionNote, type RefundItem } from "@/lib/staff/notifications"
import { ROLE_LABEL } from "@/lib/staff/roles"
import { firstName } from "@/lib/staff/session"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const { staff } = await sectionAccess("notifications")
  const { cases } = await loadConsoleData(staff)
  let mentions: MentionNote[] = []
  let refunds: RefundItem[] = []
  let readAt: string | null = null
  let prefsRaw: unknown = null
  if (!staff.demo) {
    const client = serviceClient()
    if (client) {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString()
      const [m, r, me] = await Promise.all([
        client.from("case_notes").select("id, application_id, author_name, body, created_at").ilike("body", `%@${firstName(staff).replace(/[%_]/g, "")}%`).gte("created_at", since).limit(100),
        client.from("refund_requests").select("id, application_id, amount, requested_by, requested_at").eq("status", "requested").limit(100),
        staff.staffId ? client.from("staff_users").select("notifications_read_at, notification_prefs").eq("id", staff.staffId).maybeSingle() : Promise.resolve({ data: null }),
      ])
      mentions = ((m.data ?? []) as { id: string; application_id: string; author_name: string; body: string; created_at: string }[]).map((n) => ({ id: n.id, applicationId: n.application_id, author: n.author_name, body: n.body, at: n.created_at }))
      refunds = ((r.data ?? []) as { id: string; application_id: string; amount: number; requested_by: string; requested_at: string }[]).map((x) => ({ id: x.id, applicationId: x.application_id, amount: Number(x.amount), requestedBy: x.requested_by, at: x.requested_at }))
      const row = (me as { data: { notifications_read_at?: string | null; notification_prefs?: unknown } | null }).data
      readAt = row?.notifications_read_at ?? null
      prefsRaw = row?.notification_prefs ?? null
    }
  }
  const items = buildFeed({ staffId: staff.staffId, firstName: firstName(staff), role: staff.role, cases, mentions, refunds })
  return (
    <>
      <div>
        <h1>Notifications</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>You are {staff.name}, {ROLE_LABEL[staff.role]}. Built from your cases, mentions in internal notes{staff.role === "finance" || staff.role === "admin" ? " and money waiting on you" : ""}.</p>
      </div>
      <NotificationCentre items={items} readAt={readAt} prefs={readPrefs(prefsRaw)} demo={staff.demo} />
    </>
  )
}
