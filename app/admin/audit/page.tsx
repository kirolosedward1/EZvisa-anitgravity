// Audit log board: every change made from the console, with filters and a detail panel (before and after, who was
// told, device, request id). Undo is offered for assignments, notes and role changes; it logs a Reversal event.
import { UndoButton } from "@/components/staff/undo-button"
import { ErrorBanner, PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { sectionAccess } from "@/lib/staff/guard"
import { can } from "@/lib/staff/roles"
import { missingTable } from "@/lib/staff/session"

export const dynamic = "force-dynamic"
type Ev = { id: number; created_at: string; actor_type: string; actor_name: string; action: string; type: string; target_table: string | null; target_id: string | null; target_label: string | null; field: string | null; before: unknown; after: unknown; notified: string | null; device: string | null; request_id: string | null; reversible: boolean; reversal_of: number | null }
const TYPES = ["document", "stage", "assignment", "payment", "upload", "appointment", "insurance", "note", "edit", "team", "export", "customer", "message", "reversal"]
const TONE: Record<string, string> = { document: "amber", stage: "blue", assignment: "grey", payment: "red", upload: "green", team: "blue", export: "grey", reversal: "blue", edit: "amber" }
const WHY: Record<string, string> = { document: "The customer has already seen the decision. Make a new decision instead.", stage: "The customer was told. Change the stage again with a note.", payment: "Money changes are final; record a new refund or decision.", export: "The file has already left the system.", upload: "Uploads are never removed by staff.", message: "A sent message cannot be recalled.", reversal: "A reversal is itself an event." }
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })
const show = (v: unknown) => (v === null || v === undefined ? "–" : typeof v === "string" ? v : JSON.stringify(v, null, 1))

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ days?: string; type?: string; actor?: string; q?: string; ev?: string; page?: string }> }) {
  const { staff, allowed } = await sectionAccess("audit")
  if (!allowed) return <PermissionDenied what="The audit log is for admins and Finance" role={staff.role} who="Ask an admin." />
  const sp = await searchParams
  const days = [1, 7, 30, 365].includes(Number(sp.days)) ? Number(sp.days) : 7
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)
  let rows: Ev[] = []
  let total = 0
  let reversed = new Set<number>()
  let problem: string | null = null
  if (staff.demo) problem = "The demo has no audit history: nothing it does is saved."
  else {
    const client = serviceClient()
    if (client) {
      let q = client.from("audit_events").select("*", { count: "exact" }).gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString()).order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1)
      if (sp.type && TYPES.includes(sp.type)) q = q.eq("type", sp.type)
      if (sp.actor && ["staff", "automation", "customer", "gateway"].includes(sp.actor)) q = q.eq("actor_type", sp.actor)
      if (sp.q) { const s = sp.q.replace(/[%_,()]/g, "").slice(0, 60); q = q.or(`action.ilike.%${s}%,actor_name.ilike.%${s}%,target_label.ilike.%${s}%`) }
      const res = await q
      if (res.error) problem = missingTable(res.error) ? "The audit log needs migration 005 (audit_events)." : "The audit log could not be read."
      rows = (res.data ?? []) as Ev[]
      total = res.count ?? rows.length
      const rev = await client.from("audit_events").select("reversal_of").not("reversal_of", "is", null).in("reversal_of", rows.map((r) => r.id).concat(Number(sp.ev) || 0))
      reversed = new Set(((rev.data ?? []) as { reversal_of: number }[]).map((r) => r.reversal_of))
    }
  }
  let selected = rows.find((r) => String(r.id) === sp.ev) ?? null
  if (!selected && sp.ev && !staff.demo) {
    const r = await serviceClient()?.from("audit_events").select("*").eq("id", Number(sp.ev)).maybeSingle()
    selected = (r?.data as Ev | null) ?? null
  }
  const href = (o: Record<string, string>) => `/staff/audit?${new URLSearchParams({ days: String(days), ...(sp.type ? { type: sp.type } : {}), ...(sp.actor ? { actor: sp.actor } : {}), ...(sp.q ? { q: sp.q } : {}), ...o })}`

  return (
    <>
      <div>
        <h1>Audit log</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Every change made from the console. Kept 7 years, read only.</p>
      </div>
      {problem ? <ErrorBanner title="Audit log" body={problem} /> : null}
      <form method="get" action="/staff/audit" className="q-filters" role="search">
        <input className="inp" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search action, person or target" aria-label="Search the audit log" />
        <select className="sel" name="days" defaultValue={String(days)} aria-label="Date range"><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="365">Last year</option></select>
        <select className="sel" name="actor" defaultValue={sp.actor ?? ""} aria-label="Actor"><option value="">All actors</option><option value="staff">Staff</option><option value="automation">Automations</option><option value="customer">Customers</option><option value="gateway">Payment gateway</option></select>
        <select className="sel" name="type" defaultValue={sp.type ?? ""} aria-label="Type"><option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
        <button type="submit" className="btn outline sm">Apply</button>
        <span className="muted" style={{ marginInlineStart: "auto", fontSize: 13 }}>{total} events in range</span>
      </form>
      <div className="audit">
        <section className="card" aria-label="Events" style={{ overflow: "hidden" }}>
          {rows.length === 0 ? <div className="empty">No events in this range.</div> : null}
          {rows.map((r) => (
            <a key={r.id} href={href({ ev: String(r.id), page: String(page) })} className="audit-row" aria-current={selected?.id === r.id ? "true" : undefined}>
              <span className="muted mono">{when(r.created_at)}</span>
              <span className="ellipsis">{r.actor_name || r.actor_type}</span>
              <span className="ellipsis" style={{ color: "#102347" }}>{r.action}</span>
              <span><span className={`pill xs ${TONE[r.type] ?? "grey"}`}>{r.type}</span></span>
            </a>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #eef1f6" }}>
            <span className="muted" style={{ fontSize: 13 }}>{rows.length ? `${(page - 1) * 50 + 1} to ${(page - 1) * 50 + rows.length} of ${total}` : ""}</span>
            <span style={{ display: "flex", gap: 6 }}>{page > 1 ? <a className="btn outline sm" href={href({ page: String(page - 1) })}>Previous</a> : null}{page * 50 < total ? <a className="btn outline sm" href={href({ page: String(page + 1) })}>Next</a> : null}</span>
          </div>
        </section>
        {selected ? (
          <aside className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-label={`Event ${selected.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Event #{selected.id}</span><a href={href({ page: String(page) })} aria-label="Close">✕</a></div>
            <span className={`pill ${TONE[selected.type] ?? "grey"}`}>{selected.type}</span>
            <h2>{selected.action}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>{when(selected.created_at)} · {selected.actor_name || selected.actor_type}{selected.device ? ` · ${selected.device}` : ""}</p>
            <dl className="kv">
              <dt>Target</dt><dd>{selected.target_table === "visa_applications" && selected.target_id ? <a href={`/staff/cases/${selected.target_id}`}>{selected.target_label ?? "Open case"}</a> : selected.target_label ?? selected.target_id ?? "–"}</dd>
              <dt>Field</dt><dd>{selected.field ?? "–"}</dd>
              <dt>Customer told</dt><dd>{selected.notified ?? "–"}</dd>
              <dt>Request id</dt><dd className="mono">{selected.request_id ?? "–"}</dd>
            </dl>
            <div className="diff"><div><b>Before</b><pre>{show(selected.before)}</pre></div><div><b>After</b><pre>{show(selected.after)}</pre></div></div>
            {reversed.has(selected.id) ? <span className="pill green">Undone, a reversal event was logged</span> : selected.reversible && can(staff.role, "team") ? <UndoButton id={selected.id} /> : <p className="muted" style={{ margin: 0, fontSize: 12 }}>This event cannot be undone. {WHY[selected.type] ?? ""}</p>}
            <p className="muted" style={{ margin: 0, fontSize: 11 }}>Undo is offered for assignments, notes and role changes. Payments, document decisions and messages get a new corrective event instead.</p>
          </aside>
        ) : null}
      </div>
    </>
  )
}
