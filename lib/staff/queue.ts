/**
 * The Cases queue: tabs, filters, search, sort and the row texts. Pure, tested in staff.test.ts; the page, the CSV
 * export and the bulk actions all use it so they agree on what "shown" means.
 */
import { byUrgency, isOpen, isOver, OPEN_STAGES, STAGE, type StaffCase, type StaffStage } from "@/lib/staff/cases"
import { slaLabel } from "@/lib/staff/sla"

export const QUEUE_TABS = [
  { key: "all", label: "All open" },
  { key: "us", label: "Needs us", tone: "blue" },
  { key: "customer", label: "Needs customer", tone: "amber" },
  { key: "sla", label: "Past SLA", tone: "red" },
  { key: "unassigned", label: "Unassigned", tone: "grey" },
  { key: "closed", label: "Closed" },
] as const
export type QueueTab = (typeof QUEUE_TABS)[number]["key"]

export const SORTS = [
  { key: "waiting", label: "Sort: waiting longest" },
  { key: "sla", label: "Sort: SLA deadline" },
  { key: "newest", label: "Sort: newest" },
  { key: "travel", label: "Sort: travel date" },
] as const
export type QueueSort = (typeof SORTS)[number]["key"]

export type QueueFilters = { tab: QueueTab; q: string; stage: StaffStage | ""; owner: string; country: string; sort: QueueSort }

export const PAGE_SIZE = 50

const TAB_KEYS = QUEUE_TABS.map((t) => t.key) as string[]
const SORT_KEYS = SORTS.map((s) => s.key) as string[]
const STAGE_KEYS = Object.keys(STAGE)

/** URL search params into filters; anything unknown falls back to the default. */
export function parseFilters(p: Record<string, string | string[] | undefined>): QueueFilters {
  const one = (k: string) => {
    const v = p[k]
    return (Array.isArray(v) ? v[0] : v ?? "").trim()
  }
  const tab = one("tab")
  const stage = one("stage")
  const sort = one("sort")
  return {
    tab: (TAB_KEYS.includes(tab) ? tab : "all") as QueueTab,
    q: one("q").slice(0, 120),
    stage: (STAGE_KEYS.includes(stage) ? stage : "") as StaffStage | "",
    owner: one("owner").slice(0, 64),
    country: one("country").slice(0, 60),
    sort: (SORT_KEYS.includes(sort) ? sort : "waiting") as QueueSort,
  }
}

export function inTab(c: StaffCase, tab: QueueTab, now = Date.now()): boolean {
  if (tab === "closed") return !isOpen(c)
  if (!isOpen(c)) return false
  if (tab === "us") return c.side === "us"
  if (tab === "customer") return c.side === "customer"
  if (tab === "sla") return isOver(c, now)
  if (tab === "unassigned") return c.paid && !c.ownerId
  return true
}

const digits = (s: string) => s.replace(/\D/g, "")

/** Name, email, phone (any formatting), EZ reference or tracking code, destination. */
export function matches(c: StaffCase, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [c.name, c.email, c.ref, c.trackingToken ?? "", c.country].join(" ").toLowerCase()
  if (hay.includes(needle) || hay.includes(needle.replace(/^ez-?/, ""))) return true
  const d = digits(needle)
  return d.length >= 4 && digits(c.phone).includes(d)
}

export function sortCases(list: StaffCase[], sort: QueueSort, now = Date.now()): StaffCase[] {
  const copy = [...list]
  if (sort === "sla") return copy.sort(byUrgency(now))
  if (sort === "newest") return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (sort === "travel") {
    return copy.sort((a, b) => (a.travelStart ?? "9999").localeCompare(b.travelStart ?? "9999") || a.name.localeCompare(b.name))
  }
  // Waiting longest: past SLA first, then the longest current wait.
  return copy.sort((a, b) => {
    const over = Number(isOver(b, now)) - Number(isOver(a, now))
    if (over) return over
    return (a.since ?? a.updatedAt).localeCompare(b.since ?? b.updatedAt)
  })
}

export function applyQueue(all: StaffCase[], f: QueueFilters, now = Date.now()): StaffCase[] {
  const list = all.filter(
    (c) =>
      inTab(c, f.tab, now) &&
      matches(c, f.q) &&
      (!f.stage || c.stage === f.stage) &&
      (!f.country || c.country === f.country) &&
      (!f.owner || (f.owner === "none" ? !c.ownerId : c.ownerId === f.owner)),
  )
  return sortCases(list, f.sort, now)
}

export function tabCounts(all: StaffCase[], now = Date.now()): Record<QueueTab, number> {
  const out = Object.fromEntries(QUEUE_TABS.map((t) => [t.key, 0])) as Record<QueueTab, number>
  for (const c of all) for (const t of QUEUE_TABS) if (inTab(c, t.key, now)) out[t.key]++
  return out
}

/** Stage filter options: the open stages, then the closed ones. */
export const STAGE_OPTIONS: StaffStage[] = [...OPEN_STAGES, "completed", "cancelled"]

/** Who the case waits on, under the "Waiting for" text. */
export function whoLabel(c: StaffCase): string {
  if (c.side === "us") return "us"
  if (c.side === "customer" || c.side === "draft") return "customer"
  if (c.side === "closed") return "closed"
  return "no clock"
}

/** SLA column: "1d 4h over", "19h left", "No clock" or "Closed", with its colour. */
export function slaCell(c: StaffCase, now = Date.now()): { text: string; tone: "red" | "amber" | "muted" } {
  if (c.side === "closed") return { text: "Closed", tone: "muted" }
  if (c.side !== "us" || !c.dueAt) return { text: "No clock", tone: "muted" }
  const s = slaLabel(c.dueAt, now)
  return { text: s.text, tone: s.over ? "red" : "amber" }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "14 to 28 Dec", "28 Dec to 4 Jan" or "Not set". */
export function travelLabel(start: string | null, end: string | null): string {
  const parse = (v: string | null) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? "")
    return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null
  }
  const a = parse(start)
  const b = parse(end)
  if (!a) return "Not set"
  if (!b) return `From ${a.d} ${MONTHS[a.m]}`
  if (a.y === b.y && a.m === b.m) return `${a.d} to ${b.d} ${MONTHS[b.m]}`
  return `${a.d} ${MONTHS[a.m]} to ${b.d} ${MONTHS[b.m]}`
}

/** "Just now", "40m ago", "5h ago", "3d ago", "6w ago". */
export function agoLabel(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.floor((now - Date.parse(iso)) / 60000))
  if (m < 2) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 14) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

/** CSV with formula-injection protection (cells starting with = + - @ are quoted as text). */
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    let s = v === null || v === undefined ? "" : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n"
}
