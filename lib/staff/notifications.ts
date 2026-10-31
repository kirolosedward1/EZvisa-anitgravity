/**
 * Notification feed for one staff member, built from the data (Notifications board): uploads waiting and past-SLA
 * cases they own, help requests and tomorrow's appointments on their cases, @mentions in internal notes, and money
 * items for roles that handle them. Pure; tested.
 */
import { isOpen, isOver, type StaffCase, lowerFirst } from "@/lib/staff/cases"
import { can, canOpen, type Role } from "@/lib/staff/roles"

export type NoteKind = "mine" | "mention" | "system"
export type Notification = { id: string; kind: NoteKind; event: EventKey; at: string; who: string; text: string; href: string; action: string; tone: "green" | "blue" | "grey" | "red" }

export const EVENTS = [
  { key: "assigned", label: "Assigned to me", hint: "A case becomes yours" },
  { key: "mention", label: "Mention", hint: "Someone writes @you in a case note" },
  { key: "uploaded", label: "Customer uploaded", hint: "New document on one of my cases" },
  { key: "sla", label: "Past SLA", hint: "My case passed its deadline" },
  { key: "help", label: "Appointment help", hint: "A customer on my case asked us to book" },
  { key: "appointment", label: "Appointment tomorrow", hint: "Reminder the day before" },
  { key: "payment", label: "Payment failed", hint: "The payment gateway declined a payment" },
  { key: "refund", label: "Refund request", hint: "A refund waits for Finance" },
] as const
export type EventKey = (typeof EVENTS)[number]["key"]
export type Prefs = { events: Record<string, { in_app: boolean; email: boolean; push: boolean }>; quiet: { on: boolean; from: string; to: string }; digest: boolean }

export function defaultPrefs(): Prefs {
  const events: Prefs["events"] = {}
  for (const e of EVENTS) events[e.key] = { in_app: true, email: ["assigned", "mention", "sla", "payment"].includes(e.key), push: !["payment", "refund"].includes(e.key) }
  return { events, quiet: { on: true, from: "21:00", to: "07:00" }, digest: true }
}

export function readPrefs(raw: unknown): Prefs {
  const d = defaultPrefs()
  if (!raw || typeof raw !== "object") return d
  const r = raw as Partial<Prefs>
  for (const e of EVENTS) {
    const x = r.events?.[e.key]
    if (x) d.events[e.key] = { in_app: x.in_app !== false, email: !!x.email, push: !!x.push }
  }
  if (r.quiet) d.quiet = { on: !!r.quiet.on, from: String(r.quiet.from ?? "21:00").slice(0, 5), to: String(r.quiet.to ?? "07:00").slice(0, 5) }
  if (typeof r.digest === "boolean") d.digest = r.digest
  return d
}

export type MentionNote = { id: string; applicationId: string; author: string; body: string; at: string }
export type RefundItem = { id: string; applicationId: string; amount: number; requestedBy: string; at: string }

export function buildFeed(args: { staffId: string | null; firstName: string; role: Role; cases: StaffCase[]; mentions: MentionNote[]; refunds: RefundItem[]; now?: number }): Notification[] {
  const now = args.now ?? Date.now()
  const mine = args.cases.filter((c) => isOpen(c) && args.staffId && c.ownerId === args.staffId)
  const out: Notification[] = []
  for (const c of mine) {
    if (c.task === "review" && c.since) out.push({ id: `up-${c.id}`, kind: "mine", event: "uploaded", at: c.since, who: c.name, text: c.what.toLowerCase().includes("uploaded") ? `uploaded ${lowerFirst(c.what.replace(/ uploaded$/, ""))}` : `has ${c.what}`, href: `/staff/cases/${c.id}?tab=documents`, action: "Review now", tone: "green" })
    if (isOver(c, now) && c.dueAt) out.push({ id: `sla-${c.id}`, kind: "mine", event: "sla", at: c.dueAt, who: "Past SLA", text: `${c.name} (${lowerFirst(c.what)})`, href: `/staff/cases/${c.id}`, action: "Open case", tone: "red" })
    if (c.task === "help" && c.since) out.push({ id: `help-${c.id}`, kind: "mine", event: "help", at: c.since, who: c.name, text: "asked us to book the appointment", href: canOpen(args.role, "appointments") ? "/staff/appointments" : `/staff/cases/${c.id}#appt`, action: "Book", tone: "green" })
    if (c.appointmentAt) {
      const t = Date.parse(c.appointmentAt)
      if (t > now && t < now + 36 * 3_600_000) out.push({ id: `appt-${c.id}`, kind: "mine", event: "appointment", at: new Date(t - 24 * 3_600_000).toISOString(), who: "Reminder", text: `${c.name} has an appointment ${c.appointmentCentre ? `at ${c.appointmentCentre}` : "soon"}`, href: `/staff/cases/${c.id}`, action: "Open case", tone: "grey" })
    }
  }
  const handle = `@${args.firstName.toLowerCase()}`
  for (const m of args.mentions) if (m.body.toLowerCase().includes(handle)) out.push({ id: `men-${m.id}`, kind: "mention", event: "mention", at: m.at, who: m.author, text: `mentioned you: "${m.body.slice(0, 140)}"`, href: `/staff/cases/${m.applicationId}`, action: "Open note", tone: "blue" })
  if (can(args.role, "refund")) for (const r of args.refunds) out.push({ id: `ref-${r.id}`, kind: "system", event: "refund", at: r.at, who: r.requestedBy, text: `requested a refund of ${r.amount.toFixed(2)} AED`, href: "/staff/payments?tab=requests", action: "Decide", tone: "blue" })
  if (can(args.role, "pay")) for (const c of args.cases) if (isOpen(c) && c.paymentFailed) out.push({ id: `pf-${c.id}`, kind: "system", event: "payment", at: c.updatedAt, who: "Payment gateway", text: `declined ${c.name}'s payment`, href: "/staff/payments?tab=failed", action: "See payments", tone: "grey" })
  return out.sort((a, b) => b.at.localeCompare(a.at))
}
