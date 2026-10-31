// Overview board: today at a glance. KPI tiles, quick actions, the Needs action queue, alerts, workload, open cases
// by stage and new applications over the last 14 days. "My cases" narrows everything except the money tile.
import { ChevronRight } from "lucide-react"
import { NeedsAction, type NeedsRow } from "@/components/staff/needs-action"
import { ErrorBanner } from "@/components/staff/states"
import { SCHENGEN_META } from "@/lib/countries"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { greeting, overviewFor, WORKLOAD_CAP, type QueueRow } from "@/lib/staff/overview"
import { can, canOpen } from "@/lib/staff/roles"
import { firstName, initials } from "@/lib/staff/session"

export const dynamic = "force-dynamic"

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", weekday: "long", day: "numeric", month: "long", year: "numeric" })
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit", hour12: false })
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", weekday: "short" })
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric" })
const aed = (n: number) => Math.round(n).toLocaleString("en-US")

function when(iso: string, now: number): string {
  const d = new Date(iso)
  const day = (ms: number) => new Date(ms + 4 * 3_600_000).toISOString().slice(0, 10)
  const label = day(d.getTime()) === day(now) ? "today" : day(d.getTime()) === day(now + 86_400_000) ? "tomorrow" : weekdayFmt.format(d)
  return `${label} ${timeFmt.format(d)}`
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { staff } = await sectionAccess("overview")
  const { scope } = await searchParams
  const mine = scope === "mine"
  const { cases, team, problem } = await loadConsoleData(staff)
  const now = Date.now()
  const o = overviewFor(cases, team, { mine: mine ? staff.staffId ?? "__none__" : null, now })
  const showMoney = can(staff.role, "pay")

  const ownerInitials = (id: string | null) => (id ? initials(team.find((m) => m.id === id)?.name ?? "?") : null)
  const toRow = (q: QueueRow): NeedsRow => ({
    id: q.c.id,
    name: q.c.name,
    ref: q.c.ref,
    country: q.c.country,
    iso: SCHENGEN_META[q.c.country]?.iso,
    what: q.c.what,
    stage: q.stageLabel,
    tone: q.stageTone,
    wait: q.wait,
    waitTone: q.waitTone,
    owner: ownerInitials(q.c.ownerId),
  })

  const who = mine ? "need you" : "need the team"
  const subtitle = `${dateFmt.format(now)} · ${o.kpi.needsUs} ${o.kpi.needsUs === 1 ? "case" : "cases"} ${who} today${
    o.kpi.overdue ? `, ${o.kpi.overdue} ${o.kpi.overdue === 1 ? "is" : "are"} past ${o.kpi.overdue === 1 ? "its" : "their"} SLA` : ""
  }`

  const quick = [
    can(staff.role, "assign") && o.counts.unassigned > 0 && { href: "/staff/cases?tab=unassigned", label: `Assign ${o.counts.unassigned} unassigned ${o.counts.unassigned === 1 ? "case" : "cases"}` },
    can(staff.role, "msg") && o.counts.staleDrafts > 0 && { href: "/staff/messaging?tab=broadcast&tpl=pay_reminder&stage=payment", label: `Remind ${o.counts.staleDrafts} unpaid ${o.counts.staleDrafts === 1 ? "draft" : "drafts"}` },
    can(staff.role, "docs") && o.counts.docsToCheck > 0 && { href: "/staff/documents", label: `Start document review (${o.counts.docsToCheck})` },
    can(staff.role, "appt") && o.counts.help > 0 && { href: "/staff/appointments", label: `Answer ${o.counts.help} appointment ${o.counts.help === 1 ? "request" : "requests"}` },
    { href: "/staff/analytics?range=7", label: "This week's report" },
  ].filter(Boolean) as { href: string; label: string }[]

  const alerts = [
    showMoney && { n: o.kpi.failedPayments, tone: "red", label: "Failed payments to follow up", href: "/staff/payments" },
    showMoney && { n: o.counts.insurance, tone: "amber", label: "Insurance quotes requested", href: "/staff/insurance" },
    { n: o.counts.help, tone: "blue", label: "Appointment help requests", href: canOpen(staff.role, "appointments") ? "/staff/appointments" : "/staff/cases?tab=us" },
    { n: o.counts.staleDrafts, tone: "grey", label: `Drafts unpaid for 7+ days`, href: "/staff/cases?stage=payment" },
  ].filter((a): a is { n: number; tone: string; label: string; href: string } => !!a && a.n > 0)

  const unassigned = o.counts.unassigned
  const chartMax = Math.max(1, ...o.chart.map((d) => d.paid + d.drafts))
  const chartPaid = o.chart.reduce((s, d) => s + d.paid, 0)
  const chartDrafts = o.chart.reduce((s, d) => s + d.drafts, 0)

  return (
    <>
      {problem ? <ErrorBanner title="Some data did not load." body={`${problem} What did load is shown; reload to try again. Customers are not affected.`} /> : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h1>{greeting(now)}, {firstName(staff)}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{subtitle}</p>
        </div>
        <nav className="seg" aria-label="Scope">
          <a className="tab" href="/staff/overview" aria-current={!mine ? "page" : undefined}>Whole team</a>
          <a className="tab" href="/staff/overview?scope=mine" aria-current={mine ? "page" : undefined}>My cases</a>
        </nav>
      </div>

      <div className="kpis" style={showMoney ? undefined : { gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <a className="card kpi" href="/staff/cases?tab=us">
          <span className="v">{o.kpi.needsUs}</span>
          <span className="l">Needs us now</span>
          {o.kpi.overdue > 0 ? (
            <span className="pill red"><span className="dot" />{o.kpi.overdue} past SLA</span>
          ) : (
            <span className="s">Nothing past SLA</span>
          )}
        </a>
        <a className="card kpi" href="/staff/cases?tab=customer">
          <span className="v">{o.kpi.needsCustomer}</span>
          <span className="l">Waiting on customers</span>
          <span className="s">Documents, a re-upload or the appointment</span>
        </a>
        <a className="card kpi" href={canOpen(staff.role, "files") ? "/staff/files" : "/staff/cases?stage=preparation"}>
          <span className="v">{o.kpi.files}</span>
          <span className="l">Files to prepare</span>
          <span className="s">{o.kpi.filesDueSoon} due before Monday</span>
        </a>
        <a className="card kpi" href={canOpen(staff.role, "appointments") ? "/staff/appointments" : "/staff/cases?stage=appointment"}>
          <span className="v">{o.kpi.apptsThisWeek}</span>
          <span className="l">Appointments this week</span>
          <span className="s">
            {o.kpi.nextAppt ? `Next: ${when(o.kpi.nextAppt.at, now)}${o.kpi.nextAppt.centre ? `, ${o.kpi.nextAppt.centre}` : ""}` : "None coming up"}
          </span>
        </a>
        {showMoney ? (
          <a className="card kpi" href="/staff/payments">
            <span className="v">{aed(o.kpi.paidThisMonth)}<small> AED</small></span>
            <span className="l">Paid this month · {o.kpi.paidCount} {o.kpi.paidCount === 1 ? "case" : "cases"}</span>
            {o.kpi.failedPayments > 0 ? (
              <span className="pill amber"><span className="dot" />{o.kpi.failedPayments} failed {o.kpi.failedPayments === 1 ? "payment" : "payments"}</span>
            ) : (
              <span className="s">No failed payments</span>
            )}
          </a>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Quick actions</span>
        {quick.map((q) => (
          <a key={q.href} className="btn outline sm" href={q.href}>{q.label}</a>
        ))}
      </div>

      <div className="grid2">
        <div className="stack">
          <NeedsAction
            rows={{ overdue: o.queues.overdue.map(toRow), docs: o.queues.docs.map(toRow), files: o.queues.files.map(toRow) }}
            // Documents counts documents (as the sidebar and quick action do); the rows are the cases holding them.
            counts={{ overdue: o.counts.overdue, docs: o.counts.docsToCheck, files: o.counts.files }}
          />
          <section className="card" aria-labelledby="alerts" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 id="alerts">Alerts</h2>
            {alerts.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 13, paddingTop: 8, borderTop: "1px solid #eef1f6" }}>No alerts right now.</p>
            ) : (
              alerts.map((a) => (
                <a key={a.label} href={a.href} className="alert-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`pill xs ${a.tone}`}>{a.n}</span>
                    {a.label}
                  </span>
                  <ChevronRight size={14} color="#8b97ab" aria-hidden />
                </a>
              ))
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="workload" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 id="workload">Workload</h2>
              {can(staff.role, "assign") ? <a href="/staff/cases?tab=all" style={{ fontSize: 12, fontWeight: 500 }} title="Select cases in the queue and assign them">Reassign</a> : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {o.workload.length === 0 && unassigned === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>No open cases are assigned yet.</p>
              ) : null}
              {o.workload.map((w) => (
                <a key={w.id} href={`/staff/cases?owner=${w.id}`} className="wl-row" title={`${w.name}: open cases`}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="av" aria-hidden="true">{initials(w.name)}</span>
                      {w.name.split(/\s+/)[0]}
                    </span>
                    <span className="muted">{w.open} open{w.over ? ` · ${w.over} past SLA` : ""}</span>
                  </div>
                  <div className="bar" role="presentation"><span style={{ width: `${Math.min(100, (w.open / WORKLOAD_CAP) * 100)}%` }} /></div>
                </a>
              ))}
              {unassigned > 0 ? (
                <a href="/staff/cases?tab=unassigned" className="wl-row" title="Unassigned cases: assign them from the queue">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="av none" aria-hidden="true">?</span>Unassigned
                    </span>
                    <span style={{ color: "#7a4b00", fontWeight: 500 }}>{unassigned} {unassigned === 1 ? "case" : "cases"}</span>
                  </div>
                  <div className="bar" role="presentation"><span style={{ width: `${Math.min(100, (unassigned / WORKLOAD_CAP) * 100)}%`, background: "#d98a00" }} /></div>
                </a>
              ) : null}
            </div>
          </section>

          <section className="card" aria-labelledby="by-stage" style={{ padding: "16px 18px", display: "flex", flexDirection: "column" }}>
            <h2 id="by-stage" style={{ marginBottom: 6 }}>Open cases by stage</h2>
            {o.byStage.map((s) => (
              <a
                key={s.stage}
                href={`/staff/cases?stage=${s.stage}`}
                className="alert-row"
                style={{ padding: "10px 0" }}
              >
                <span>{s.label}</span>
                <span style={{ fontWeight: 500 }}>{s.n}</span>
              </a>
            ))}
          </section>
        </div>
      </div>

      <section className="card" aria-labelledby="new-apps" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 id="new-apps">New applications, last 14 days</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            Paid in blue, unpaid drafts in light blue · {chartPaid} paid, {chartDrafts} {chartDrafts === 1 ? "draft" : "drafts"}
          </span>
        </div>
        <div className="chart" role="img" aria-label={`New applications per day over the last 14 days: ${chartPaid} paid and ${chartDrafts} unpaid drafts.`}>
          {o.chart.map((d) => {
            const paidH = (d.paid / chartMax) * 100
            const draftH = (d.drafts / chartMax) * 100
            return (
              <div key={d.day} className="col" title={`${d.day}: ${d.paid} paid, ${d.drafts} drafts`}>
                <div className="bw">
                  {d.drafts > 0 ? <div className="b draft top" style={{ height: `${draftH}%` }} /> : null}
                  {d.paid > 0 ? <div className={d.drafts > 0 ? "b" : "b top"} style={{ height: `${paidH}%` }} /> : null}
                </div>
                <span className="d">{dayFmt.format(new Date(`${d.day}T12:00:00+04:00`))}</span>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
