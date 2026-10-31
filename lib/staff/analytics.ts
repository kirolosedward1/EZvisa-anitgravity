/**
 * Analytics board numbers from the console's own data: applications, payments, stage changes (customer timeline
 * events) and document decisions. Website visits, sources' ad cost and ratings are not connected. Pure; tested.
 */
import { isOpen, isOver, type StaffCase } from "@/lib/staff/cases"

const DAY = 86_400_000

export type Range = 7 | 30 | 90
export type StageEvent = { applicationId: string; to: string; at: string }

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Percentage change, rounded; null when the previous period had nothing. */
export function delta(now: number, before: number): number | null {
  return before > 0 ? Math.round(((now - before) / before) * 100) : null
}

function within(iso: string | null | undefined, from: number, to: number): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  return t >= from && t < to
}

const READY = new Set(["ready", "appointment", "completed"])

export function marketing(cases: StaffCase[], range: Range, now = Date.now()) {
  const from = now - range * DAY
  const prevFrom = from - range * DAY
  const period = (f: number, t: number) => {
    const started = cases.filter((c) => within(c.createdAt, f, t))
    const paid = cases.filter((c) => c.paid && within(c.paidAt ?? c.createdAt, f, t))
    return { started: started.length, paid: paid.length, revenue: paid.reduce((s, c) => s + (c.amount ?? 0), 0) }
  }
  const cur = period(from, now)
  const prev = period(prevFrom, from)
  const cohort = cases.filter((c) => within(c.createdAt, from, now))
  const funnel = [
    { step: "Started an application", n: cohort.length },
    { step: "Paid", n: cohort.filter((c) => c.paid).length },
    { step: "Documents complete", n: cohort.filter((c) => c.paid && ["review", "preparation", "ready", "appointment", "completed"].includes(c.stage)).length },
    { step: "File ready", n: cohort.filter((c) => READY.has(c.stage)).length },
    { step: "Appointment saved", n: cohort.filter((c) => c.appointmentAt || c.stage === "appointment" || c.stage === "completed").length },
    { step: "Attended, case completed", n: cohort.filter((c) => c.stage === "completed").length },
  ]
  const days = Array.from({ length: Math.min(range, 30) }, (_, i) => {
    const end = now - i * DAY
    return cases.filter((c) => c.paid && within(c.paidAt ?? c.createdAt, end - DAY, end)).length
  }).reverse()
  return { cur, prev, funnel, days }
}

/** Source of an application from its stored referrer (host only) or channel. */
export function sourceOf(referrer: string | null | undefined, staffChannel?: string | null, platform?: string | null): string {
  if (staffChannel) return `Staff, ${staffChannel.replace("_", " ")}`
  if (platform === "ios" || platform === "android") return "Mobile app"
  if (!referrer) return "Direct"
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "")
    if (/google\./.test(host)) return "Google"
    if (/instagram|facebook|fb\.|t\.co|twitter|x\.com|tiktok|linkedin/.test(host)) return "Social"
    if (/whatsapp|wa\.me/.test(host)) return "WhatsApp shares"
    if (/ezvisa\.net$/.test(host)) return "Direct"
    return host
  } catch {
    return "Direct"
  }
}

export function operations(cases: StaffCase[], events: StageEvent[], reviewHours: number[], range: Range, now = Date.now()) {
  const from = now - range * DAY
  const readyAt = new Map<string, string>()
  for (const e of events) if (e.to === "ready" && within(e.at, from, now) && (!readyAt.has(e.applicationId) || e.at < readyAt.get(e.applicationId)!)) readyAt.set(e.applicationId, e.at)
  const toReady = cases.flatMap((c) => {
    const r = readyAt.get(c.id)
    return r && c.paidAt ? [(Date.parse(r) - Date.parse(c.paidAt)) / DAY] : []
  })
  const ours = cases.filter((c) => isOpen(c) && c.side === "us")
  const withinSla = ours.length ? Math.round((ours.filter((c) => !isOver(c, now)).length / ours.length) * 100) : null
  const byDest = new Map<string, { paid: number; ready: number; appts: number; toReady: number[] }>()
  for (const c of cases) {
    if (!c.paid || !within(c.paidAt ?? c.createdAt, from, now)) continue
    const d = byDest.get(c.country) ?? { paid: 0, ready: 0, appts: 0, toReady: [] }
    d.paid++
    if (READY.has(c.stage)) d.ready++
    if (c.appointmentAt) d.appts++
    const r = readyAt.get(c.id)
    if (r && c.paidAt) d.toReady.push((Date.parse(r) - Date.parse(c.paidAt)) / DAY)
    byDest.set(c.country, d)
  }
  return {
    medianToReadyDays: median(toReady),
    withinSla,
    medianReviewHours: median(reviewHours),
    destinations: [...byDest.entries()].map(([country, d]) => ({ country, paid: d.paid, ready: d.ready, appts: d.appts, median: median(d.toReady) })).sort((a, b) => b.paid - a.paid),
  }
}

export function team(cases: StaffCase[], members: { id: string; name: string; role: string }[], now = Date.now()) {
  return members
    .filter((m) => m.role === "specialist" || cases.some((c) => c.ownerId === m.id))
    .map((m) => {
      const mine = cases.filter((c) => c.ownerId === m.id)
      const open = mine.filter(isOpen)
      const ours = open.filter((c) => c.side === "us")
      return {
        id: m.id,
        name: m.name,
        open: open.length,
        ready: mine.filter((c) => READY.has(c.stage)).length,
        over: ours.filter((c) => isOver(c, now)).length,
        withinSla: ours.length ? Math.round((ours.filter((c) => !isOver(c, now)).length / ours.length) * 100) : null,
      }
    })
    .sort((a, b) => b.open - a.open)
}
