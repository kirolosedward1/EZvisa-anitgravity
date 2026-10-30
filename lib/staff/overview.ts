/**
 * Everything the Overview board shows, worked out from the staff cases. Pure, tested in overview.test.ts.
 */
import { byUrgency, isOpen, isOver, OPEN_STAGES, STAGE, type StaffCase, type StaffStage, type Tone } from "@/lib/staff/cases"
import { dubaiDay, dubaiMonthStart, dubaiWeekStart, dueLabel, slaLabel, waitedFor } from "@/lib/staff/sla"

const DAY = 86_400_000
/** "Cap per specialist" default from the Team board: a full workload bar. */
export const WORKLOAD_CAP = 20
export const UNPAID_ALERT_DAYS = 7

export type QueueRow = { c: StaffCase; wait: string; waitTone: "red" | "amber" | "muted"; stageLabel: string; stageTone: Tone }

export type Overview = {
  kpi: {
    needsUs: number
    overdue: number
    needsCustomer: number
    files: number
    filesDueSoon: number
    apptsThisWeek: number
    nextAppt: { at: string; centre: string | null } | null
    paidThisMonth: number
    paidCount: number
    failedPayments: number
  }
  queues: { overdue: QueueRow[]; docs: QueueRow[]; files: QueueRow[] }
  counts: { overdue: number; docs: number; files: number; unassigned: number; staleDrafts: number; help: number; insurance: number; docsToCheck: number }
  workload: { id: string; name: string; open: number; over: number }[]
  byStage: { stage: StaffStage; label: string; n: number }[]
  chart: { day: string; paid: number; drafts: number }[]
}

function row(c: StaffCase, kind: "overdue" | "docs" | "files", now: number): QueueRow {
  const stage = STAGE[c.stage]
  if (kind === "overdue" && c.dueAt) return { c, wait: `${slaLabel(c.dueAt, now).text} SLA`, waitTone: "red", stageLabel: stage.label, stageTone: stage.tone }
  if (kind === "files" && c.dueAt) {
    const soon = Date.parse(c.dueAt) - now < 2 * DAY
    return { c, wait: dueLabel(c.dueAt, now), waitTone: soon ? "amber" : "muted", stageLabel: stage.label, stageTone: stage.tone }
  }
  const since = c.since ?? c.updatedAt
  const long = now - Date.parse(since) >= DAY
  return { c, wait: `${waitedFor(since, now)} waiting`, waitTone: long ? "amber" : "muted", stageLabel: stage.label, stageTone: stage.tone }
}

export function overviewFor(
  all: StaffCase[],
  team: { id: string; name: string; role: string }[],
  opts: { mine?: string | null; now?: number; rows?: number } = {},
): Overview {
  const now = opts.now ?? Date.now()
  const limit = opts.rows ?? 6
  const scoped = opts.mine ? all.filter((c) => c.ownerId === opts.mine) : all
  const open = scoped.filter(isOpen)
  const us = open.filter((c) => c.side === "us").sort(byUrgency(now))

  const weekStart = dubaiWeekStart(now)
  const nextMonday = weekStart + 7 * DAY
  const files = us.filter((c) => c.task === "files")
  const appts = scoped
    .filter((c) => c.appointmentAt && c.stage !== "cancelled")
    .map((c) => ({ at: c.appointmentAt as string, centre: c.appointmentCentre }))
  const upcoming = appts.filter((a) => Date.parse(a.at) >= now).sort((a, b) => a.at.localeCompare(b.at))

  // Paid this month and failed payments are team figures (the Overview's money tile does not follow "My cases").
  const monthStart = dubaiMonthStart(now)
  const paidMonth = all.filter((c) => c.paid && Date.parse(c.paidAt ?? c.createdAt) >= monthStart)
  const allOpen = all.filter(isOpen)

  const docs = us.filter((c) => c.task === "review").sort((a, b) => (a.since ?? "").localeCompare(b.since ?? ""))
  const overdue = us.filter((c) => isOver(c, now))

  const owners = new Map<string, { open: number; over: number }>()
  for (const c of allOpen) {
    if (!c.ownerId || c.side === "draft") continue
    const w = owners.get(c.ownerId) ?? { open: 0, over: 0 }
    w.open++
    if (isOver(c, now)) w.over++
    owners.set(c.ownerId, w)
  }
  const workloadIds = new Set([...team.filter((m) => m.role === "specialist").map((m) => m.id), ...owners.keys()])
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name ?? "Former staff"
  const workload = [...workloadIds]
    .map((id) => ({ id, name: nameOf(id), ...(owners.get(id) ?? { open: 0, over: 0 }) }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))

  const chart: Overview["chart"] = []
  for (let i = 13; i >= 0; i--) {
    const day = dubaiDay(now - i * DAY)
    const created = scoped.filter((c) => dubaiDay(Date.parse(c.createdAt)) === day && c.stage !== "cancelled")
    chart.push({ day, paid: created.filter((c) => c.paid).length, drafts: created.filter((c) => !c.paid).length })
  }

  return {
    kpi: {
      needsUs: us.length,
      overdue: overdue.length,
      needsCustomer: open.filter((c) => c.side === "customer").length,
      files: files.length,
      filesDueSoon: files.filter((c) => c.dueAt && Date.parse(c.dueAt) < nextMonday).length,
      apptsThisWeek: appts.filter((a) => Date.parse(a.at) >= weekStart && Date.parse(a.at) < nextMonday).length,
      nextAppt: upcoming[0] ?? null,
      paidThisMonth: paidMonth.reduce((sum, c) => sum + (c.amount ?? 0), 0),
      paidCount: paidMonth.length,
      failedPayments: allOpen.filter((c) => c.paymentFailed).length,
    },
    queues: {
      overdue: overdue.slice(0, limit).map((c) => row(c, "overdue", now)),
      docs: docs.slice(0, limit).map((c) => row(c, "docs", now)),
      files: files.slice(0, limit).map((c) => row(c, "files", now)),
    },
    counts: {
      overdue: overdue.length,
      docs: docs.length,
      files: files.length,
      unassigned: allOpen.filter((c) => c.paid && !c.ownerId).length,
      staleDrafts: allOpen.filter((c) => c.side === "draft" && now - Date.parse(c.createdAt) >= UNPAID_ALERT_DAYS * DAY).length,
      help: allOpen.filter((c) => c.task === "help").length,
      insurance: allOpen.filter((c) => c.paid && c.insuranceQuote).length,
      docsToCheck: open.reduce((sum, c) => sum + c.docsToCheck, 0),
    },
    workload,
    byStage: OPEN_STAGES.map((stage) => ({ stage, label: STAGE[stage].label, n: open.filter((c) => c.stage === stage).length })),
    chart,
  }
}

/** "Good morning" before noon, "Good afternoon" until 17:00, then "Good evening" (Dubai time). */
export function greeting(now = Date.now()): string {
  const hour = new Date(now + 4 * 3_600_000).getUTCHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}
