// Reports board: run a report (catalogue, period, preview, CSV download) and the history of exports from the audit
// log. Scheduled and emailed reports need the email service, which is not working yet, so they are not offered.
import { PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { sectionAccess } from "@/lib/staff/guard"
import { loadReportData } from "@/lib/staff/report-data"
import { periodRange, PERIODS, REPORTS } from "@/lib/staff/reports"
import { can } from "@/lib/staff/roles"

export const dynamic = "force-dynamic"

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string; period?: string; tab?: string }> }) {
  const { staff, allowed } = await sectionAccess("reports")
  if (!allowed || !can(staff.role, "export")) return <PermissionDenied what="Reports need the Export permission" role={staff.role} who="Finance and admins run reports." />
  const sp = await searchParams
  const tab = sp.tab === "history" ? "history" : "run"
  const report = REPORTS.find((r) => r.key === sp.r) ?? REPORTS[0]
  const period = PERIODS.some((p) => p.key === sp.period) ? sp.period! : "this_month"
  const now = Date.now()
  const { from, to, label } = periodRange(period, now)
  const preview = tab === "run" ? report.preview(await loadReportData(staff), from, to, now) : []
  let history: { created_at: string; actor_name: string; action: string }[] = []
  if (tab === "history" && !staff.demo) {
    const client = serviceClient()
    const res = client ? await client.from("audit_events").select("created_at, actor_name, action").eq("type", "export").order("created_at", { ascending: false }).limit(50) : null
    history = (res?.data ?? []) as typeof history
  }
  const q = (o: Record<string, string>) => `/staff/reports?${new URLSearchParams({ r: report.key, period, tab, ...o })}`

  return (
    <>
      <div>
        <h1>Reports and exports</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Every export is logged with who ran it and the period. Scheduled and emailed reports need the email service, which is not working yet.</p>
      </div>
      <nav className="utabs" aria-label="Reports">
        <a className="tab" href={q({ tab: "run" })} aria-current={tab === "run" ? "page" : undefined}>Run a report</a>
        <a className="tab" href={q({ tab: "history" })} aria-current={tab === "history" ? "page" : undefined}>History</a>
      </nav>
      {tab === "run" ? (
        <div className="grid2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
          <section className="card" style={{ padding: 8 }} aria-label="Pick a report">
            {REPORTS.map((r) => (
              <a key={r.key} href={q({ r: r.key })} className="qbtn" aria-current={r.key === report.key ? "true" : undefined} style={{ alignItems: "flex-start" }}>
                <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <b>{r.name}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{r.description}</span>
                </span>
                <span className={`pill xs ${r.audience === "Finance" ? "blue" : "green"}`}>{r.audience}</span>
              </a>
            ))}
          </section>
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="rp-h">
            <h2 id="rp-h">{report.name}</h2>
            <nav className="seg" aria-label="Period" style={{ width: "max-content", maxWidth: "100%", flexWrap: "wrap" }}>
              {PERIODS.map((p) => <a key={p.key} className="tab" href={q({ period: p.key })} aria-current={p.key === period ? "page" : undefined}>{p.label}</a>)}
            </nav>
            <div className="compare" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <b>Preview, {label}</b>
              <dl className="kv" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>{preview.map(([k, v]) => [<dt key={`k${k}`}>{k}</dt>, <dd key={`v${k}`} style={{ textAlign: "end" }}>{v}</dd>])}</dl>
            </div>
            <a className="btn primary" style={{ alignSelf: "flex-start" }} href={`/api/admin/reports/${report.key}?period=${period}`}>Download CSV</a>
          </section>
        </div>
      ) : (
        <section className="card" style={{ overflow: "hidden" }} aria-label="Export history">
          {history.length === 0 ? <div className="empty">{staff.demo ? "The demo keeps no history." : "No exports yet (or migration 005 is not applied)."}</div> : null}
          {history.map((h, i) => (
            <div key={i} className="tl" style={{ padding: "10px 16px" }}><span className="tl-dot grey" /><span>{h.action}</span><span className="muted">{new Date(h.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {h.actor_name}</span></div>
          ))}
        </section>
      )}
    </>
  )
}
