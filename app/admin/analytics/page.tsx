// Analytics board: Marketing (applications, payments, revenue, funnel, paid per day, sources) and Operations (time to
// ready, SLA, review time, by destination, team), with a 7/30/90 day switch. From the console's own data; website
// visits, ad cost and customer ratings are not connected.
import { serviceClient } from "@/lib/applications"
import { parseNotes } from "@/lib/shared/wizard-contract"
import { delta, marketing, operations, sourceOf, team, type Range, type StageEvent } from "@/lib/staff/analytics"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { uploadRecords } from "@/lib/document-reviews"

export const dynamic = "force-dynamic"
const fmt = (n: number | null, digits = 1) => (n === null ? "–" : n.toLocaleString("en-US", { maximumFractionDigits: digits }))

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="s">No earlier data</span>
  return <span className={`pill xs ${v >= 0 ? "green" : "red"}`}>{v >= 0 ? "+" : ""}{v} percent</span>
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; tab?: string }> }) {
  const { staff } = await sectionAccess("analytics")
  const sp = await searchParams
  const range = ([7, 30, 90].includes(Number(sp.range)) ? Number(sp.range) : 30) as Range
  const tab = sp.tab === "operations" ? "operations" : "marketing"
  const { cases, apps, reviews, team: members } = await loadConsoleData(staff)
  const now = Date.now()

  let events: StageEvent[] = []
  if (tab === "operations" && !staff.demo) {
    const client = serviceClient()
    const res = client ? await client.from("application_events").select("application_id, payload, created_at").eq("kind", "status_changed").gte("created_at", new Date(now - range * 86_400_000).toISOString()).limit(20000) : null
    events = ((res?.data ?? []) as { application_id: string; payload: { to?: string }; created_at: string }[]).map((e) => ({ applicationId: e.application_id, to: String(e.payload?.to ?? ""), at: e.created_at }))
  }
  // Review time: upload to decision, per document with both times in range.
  const reviewHours: number[] = []
  for (const a of apps) {
    const r = reviews[a.id ?? ""] ?? {}
    for (const u of uploadRecords(a.additional_notes)) {
      const d = r[u.type]
      if (d && d.status !== "checking" && d.reviewedAt > u.at && Date.parse(d.reviewedAt) > now - range * 86_400_000) reviewHours.push((Date.parse(d.reviewedAt) - Date.parse(u.at)) / 3_600_000)
    }
  }
  const m = marketing(cases, range, now)
  const o = operations(cases, events, reviewHours, range, now)
  const t = team(cases, members, now)
  const appById = new Map(apps.map((a) => [a.id ?? "", a]))
  const sources = new Map<string, { started: number; paid: number }>()
  for (const c of cases) {
    if (Date.parse(c.createdAt) < now - range * 86_400_000) continue
    const a = appById.get(c.id)
    const notes = parseNotes(a?.additional_notes) as Record<string, unknown>
    const key = sourceOf(a?.referrer, (notes.enteredByStaff as { channel?: string } | undefined)?.channel, notes.platform as string | undefined)
    const s = sources.get(key) ?? { started: 0, paid: 0 }
    s.started++
    if (c.paid) s.paid++
    sources.set(key, s)
  }
  const maxDay = Math.max(1, ...m.days)
  const top = Math.max(1, m.funnel[0].n)
  const href = (o2: Record<string, string | number>) => `/staff/analytics?${new URLSearchParams({ range: String(range), tab, ...Object.fromEntries(Object.entries(o2).map(([k, v]) => [k, String(v)])) })}`

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Analytics</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Last {range} days · compared with the {range} days before. Website visits and ad cost are not connected.</p>
        </div>
        <nav className="seg" aria-label="Range">{[7, 30, 90].map((r) => <a key={r} className="tab" href={href({ range: r })} aria-current={range === r ? "page" : undefined}>{r} days</a>)}</nav>
      </div>
      <nav className="utabs" aria-label="Analytics">
        <a className="tab" href={href({ tab: "marketing" })} aria-current={tab === "marketing" ? "page" : undefined}>Marketing and growth</a>
        <a className="tab" href={href({ tab: "operations" })} aria-current={tab === "operations" ? "page" : undefined}>Operations and team</a>
      </nav>

      {tab === "marketing" ? (
        <>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="card kpi"><span className="v">{m.cur.started}</span><span className="l">Applications started</span><Delta v={delta(m.cur.started, m.prev.started)} /></div>
            <div className="card kpi"><span className="v">{m.cur.paid}</span><span className="l">Paid</span><Delta v={delta(m.cur.paid, m.prev.paid)} /></div>
            <div className="card kpi"><span className="v">{Math.round(m.cur.revenue).toLocaleString("en-US")}<small> AED</small></span><span className="l">Revenue</span><Delta v={delta(m.cur.revenue, m.prev.revenue)} /></div>
            <div className="card kpi"><span className="v">{m.cur.started ? Math.round((m.cur.paid / m.cur.started) * 100) : 0}<small> percent</small></span><span className="l">Started to paid</span></div>
          </div>
          <div className="grid2">
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="fn-h">
              <h2 id="fn-h">Funnel, started to completed</h2>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Applications started in the period and how far they got.</p>
              {m.funnel.map((f, i) => (
                <div key={f.step} className="funnel">
                  <span>{f.step}</span>
                  <div className="bar"><span style={{ width: `${(f.n / top) * 100}%` }} /></div>
                  <b>{f.n}</b>
                  <span className="muted">{i > 0 && m.funnel[i - 1].n ? `-${Math.round((1 - f.n / m.funnel[i - 1].n) * 100)} percent` : ""}</span>
                </div>
              ))}
            </section>
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="src-h">
              <h2 id="src-h">Applications by source</h2>
              <div className="tbl"><div className="tbl-h" style={{ gridTemplateColumns: "1.4fr 0.7fr 0.7fr 0.7fr" }}><span>Source</span><span>Started</span><span>Paid</span><span>Rate</span></div>
                {[...sources.entries()].sort((a, b) => b[1].started - a[1].started).map(([k, s]) => (
                  <div key={k} className="tbl-r" style={{ gridTemplateColumns: "1.4fr 0.7fr 0.7fr 0.7fr" }}><span className="ellipsis">{k}</span><span>{s.started}</span><span>{s.paid}</span><span>{s.started ? Math.round((s.paid / s.started) * 100) : 0} percent</span></div>
                ))}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>From the referrer recorded with each application. Campaign names and cost per paid need Google Ads, which is not connected.</p>
            </section>
          </div>
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="pd-h">
            <h2 id="pd-h">Paid applications per day{range > 30 ? ", last 30 days" : ""}</h2>
            <div className="chart" role="img" aria-label={`Paid applications per day: ${m.days.join(", ")}`}>
              {m.days.map((d, i) => <div key={i} className="col" title={`${d} paid`}><div className="bw"><div className="b top" style={{ height: `${(d / maxDay) * 100}%`, minHeight: d ? 3 : 0 }} /></div></div>)}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="card kpi"><span className="v">{fmt(o.medianToReadyDays)}<small> days</small></span><span className="l">Paid to file ready, median</span></div>
            <div className="card kpi"><span className="v">{fmt(o.withinSla, 0)}<small> percent</small></span><span className="l">Open cases within SLA, now</span></div>
            <div className="card kpi"><span className="v">{fmt(o.medianReviewHours)}<small> h</small></span><span className="l">Upload to review decision, median</span></div>
            <div className="card kpi"><span className="v">{reviewHours.length}</span><span className="l">Document decisions in the period</span></div>
          </div>
          <div className="grid2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="bd-h">
              <h2 id="bd-h">By destination, paid in the period</h2>
              <div className="tbl"><div className="tbl-h" style={{ gridTemplateColumns: "1.3fr 0.6fr 0.6fr 0.8fr 1fr" }}><span>Destination</span><span>Paid</span><span>Ready</span><span>Appts</span><span>Median to ready</span></div>
                {o.destinations.map((d) => <div key={d.country} className="tbl-r" style={{ gridTemplateColumns: "1.3fr 0.6fr 0.6fr 0.8fr 1fr" }}><span>{d.country}</span><span>{d.paid}</span><span>{d.ready}</span><span>{d.appts}</span><span>{d.median === null ? "–" : `${fmt(d.median)} days`}</span></div>)}
                {o.destinations.length === 0 ? <div className="empty">No payments in the period.</div> : null}
              </div>
            </section>
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="tm-h">
              <h2 id="tm-h">Team</h2>
              <div className="tbl"><div className="tbl-h" style={{ gridTemplateColumns: "1.3fr 0.6fr 0.8fr 0.8fr 1fr" }}><span>Specialist</span><span>Open</span><span>Ready+</span><span>Past SLA</span><span>Within SLA</span></div>
                {t.map((r) => <div key={r.id} className="tbl-r" style={{ gridTemplateColumns: "1.3fr 0.6fr 0.8fr 0.8fr 1fr" }}><span className="ellipsis">{r.name}</span><span>{r.open}</span><span>{r.ready}</span><span style={{ color: r.over ? "#8a1c1c" : undefined }}>{r.over}</span><span>{r.withinSla === null ? "–" : <span className={`pill xs ${r.withinSla >= 90 ? "green" : "amber"}`}>{r.withinSla} percent</span>}</span></div>)}
                {t.length === 0 ? <div className="empty">No specialists yet.</div> : null}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Customer ratings are not collected yet.{staff.demo ? " The demo has no stage-change history, so time to ready shows a dash." : ""}</p>
            </section>
          </div>
        </>
      )}
    </>
  )
}
