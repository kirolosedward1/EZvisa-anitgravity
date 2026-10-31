import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ConsoleShell, type ShellCounts } from "@/components/staff/console-shell"
import { loadConsoleData } from "@/lib/staff/data"
import { loadContactMessages } from "@/lib/staff/contact-messages"
import { navFor, ROLE_LABEL } from "@/lib/staff/roles"
import { firstName, getStaff, initials } from "@/lib/staff/session"
import { buildFeed } from "@/lib/staff/notifications"
import { serviceClient } from "@/lib/applications"
import { isOpen } from "@/lib/staff/cases"
import "./console.css"

// Staff console, reached at /staff (middleware.ts rewrites it here). Only signed-in staff (ADMIN_EMAILS or
// staff_users, see lib/staff/session.ts) see it; everyone else gets the normal missing page, with nothing in the
// response (title, loading screen) that names the console. Never indexed, and links out of it send no referrer.
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const hidden: Metadata = { robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" }
  return (await getStaff()) ? { ...hidden, title: "Staff" } : hidden
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) notFound()

  // Sidebar counts mean "waiting for a person" (canvas principle 7).
  const { cases } = await loadConsoleData(staff)
  const open = cases.filter(isOpen)
  const counts: ShellCounts = {
    cases: { n: open.filter((c) => c.side === "us").length },
    documents: { n: open.reduce((sum, c) => sum + c.docsToCheck, 0) },
    files: { n: open.filter((c) => c.task === "files").length },
    appointments: { n: open.filter((c) => c.task === "help").length },
    payments: { n: open.filter((c) => c.paymentFailed).length },
    insurance: { n: open.filter((c) => c.paid && c.insuranceQuote).length },
    messaging: { n: (await loadContactMessages(staff)).rows.filter((m) => m.status === "new").length },
  }
  // Bell: unread items from the person's own cases (mentions and money are counted on the Notifications page).
  let readAt: string | null = null
  if (!staff.demo && staff.staffId) {
    const { data } = (await serviceClient()?.from("staff_users").select("notifications_read_at").eq("id", staff.staffId).maybeSingle()) ?? { data: null }
    readAt = (data as { notifications_read_at?: string | null } | null)?.notifications_read_at ?? null
  }
  counts.notifications = { n: buildFeed({ staffId: staff.staffId, firstName: firstName(staff), role: staff.role, cases, mentions: [], refunds: [] }).filter((i) => !readAt || i.at > readAt).length, tone: "red" }

  return (
    <ConsoleShell
      nav={navFor(staff.role)}
      counts={counts}
      me={{ name: staff.name, initials: initials(staff.name), role: ROLE_LABEL[staff.role], demo: staff.demo }}
      // The New case board is drawn for Support; Finance has cases read only.
      canCreate={staff.role !== "finance"}
    >
      {children}
    </ConsoleShell>
  )
}
