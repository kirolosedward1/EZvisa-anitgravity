"use server"

// Console search (the top bar and Ctrl+K): cases by name, email, phone, EZ reference, tracking code or country, and
// customers by email. Reads the same per-request console data as the boards; nothing is written.
import { loadConsoleData as loadFresh } from "@/lib/staff/data"
import type { Staff } from "@/lib/staff/session"

// Search and hover previews run on every keystroke or hover: reuse one read for 20 seconds per server instance
// (every staff member sees the same cases, so one copy serves everyone; the demo has its own).
const CACHE_MS = 20_000
const cached: Record<"live" | "demo", { at: number; data: Awaited<ReturnType<typeof loadFresh>> } | undefined> = { live: undefined, demo: undefined }
async function loadConsoleData(staff: Staff) {
  const key = staff.demo ? "demo" : "live"
  const hit = cached[key]
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data
  const data = await loadFresh(staff)
  if (!data.problem) cached[key] = { at: Date.now(), data }
  return data
}
import { getStaff } from "@/lib/staff/session"
import { STAGE } from "@/lib/staff/cases"

export type SearchHit =
  | { kind: "case"; id: string; title: string; sub: string; stage: string; tone: string; href: string }
  | { kind: "customer"; id: string; title: string; sub: string; href: string }

export async function searchConsole(query: string): Promise<SearchHit[]> {
  const staff = await getStaff()
  if (!staff) return []
  const q = String(query ?? "").trim().toLowerCase().slice(0, 80)
  if (q.length < 2) return []
  const digits = q.replace(/\D/g, "")
  const { cases } = await loadConsoleData(staff)
  const score = (c: (typeof cases)[number]): number => {
    const ref = c.ref.toLowerCase()
    if (ref === q || ref.replace(/^ez-?/, "") === q.replace(/^ez-?/, "")) return 100
    if (c.trackingToken && c.trackingToken.toLowerCase() === q) return 95
    if (c.email.toLowerCase() === q) return 90
    if (digits.length >= 5 && c.phone.replace(/\D/g, "").includes(digits)) return 80
    if (c.name.toLowerCase().startsWith(q)) return 70
    if (ref.includes(q) || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) return 60
    if (c.country.toLowerCase().startsWith(q)) return 30
    return 0
  }
  const matched = cases.map((c) => ({ c, s: score(c) })).filter((x) => x.s > 0)
  matched.sort((a, b) => b.s - a.s || Number(b.c.side === "us") - Number(a.c.side === "us") || b.c.updatedAt.localeCompare(a.c.updatedAt))
  const hits: SearchHit[] = matched.slice(0, 8).map(({ c }) => ({
    kind: "case",
    id: c.id,
    title: c.name,
    sub: `${c.ref} · ${c.country} · ${c.what}`,
    stage: STAGE[c.stage].label,
    tone: STAGE[c.stage].tone,
    href: `/staff/cases/${c.id}`,
  }))
  const customers = new Map<string, { name: string; n: number }>()
  for (const { c } of matched) {
    const e = c.email.toLowerCase()
    if (!e) continue
    const x = customers.get(e) ?? { name: c.name, n: 0 }
    x.n++
    customers.set(e, x)
  }
  for (const [email, x] of [...customers.entries()].slice(0, 4)) {
    hits.push({ kind: "customer", id: email, title: x.name, sub: `${email} · ${x.n} ${x.n === 1 ? "case" : "cases"}`, href: `/staff/customers?email=${encodeURIComponent(email)}` })
  }
  return hits
}

export type CasePeek = {
  id: string
  name: string
  ref: string
  country: string
  stage: string
  tone: string
  what: string
  waitingOn: string
  owner: string
  due: string | null
  over: boolean
  travel: string
  phone: string
  email: string
  paid: boolean
  appointment: string | null
}

/** Hover preview of a case (any link to a case in the console). Read only. */
export async function peekCase(id: string): Promise<CasePeek | null> {
  const staff = await getStaff()
  if (!staff || typeof id !== "string" || id.length > 64) return null
  const { cases, team } = await loadConsoleData(staff)
  const c = cases.find((x) => x.id === id)
  if (!c) return null
  const { slaLabel } = await import("@/lib/staff/sla")
  const { travelLabel } = await import("@/lib/staff/queue")
  const sla = c.dueAt && c.side === "us" ? slaLabel(c.dueAt) : null
  return {
    id: c.id,
    name: c.name,
    ref: c.ref,
    country: c.country,
    stage: STAGE[c.stage].label,
    tone: STAGE[c.stage].tone,
    what: c.what,
    waitingOn: c.side === "us" ? "Us" : c.side === "customer" || c.side === "draft" ? "Customer" : "Nobody",
    owner: c.ownerId ? team.find((m) => m.id === c.ownerId)?.name ?? "Former staff" : "Unassigned",
    due: sla ? sla.text : null,
    over: !!sla?.over,
    travel: travelLabel(c.travelStart, c.travelEnd),
    phone: c.phone,
    email: c.email,
    paid: c.paid,
    appointment: c.appointmentAt ? new Date(c.appointmentAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + (c.appointmentCentre ? `, ${c.appointmentCentre}` : "") : null,
  }
}
