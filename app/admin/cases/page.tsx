// Cases board: the queue with tabs, filters, sort, saved views, bulk actions and a row menu. Filters live in the URL
// so a view can be shared or saved; the CSV export uses the same query.
import { Download } from "lucide-react"
import { CasesQueue, type QueueRow } from "@/components/staff/cases-queue"
import { ErrorBanner } from "@/components/staff/states"
import { SCHENGEN_META } from "@/lib/countries"
import { STAGE, isOpen } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { agoLabel, applyQueue, PAGE_SIZE, parseFilters, QUEUE_TABS, slaCell, SORTS, STAGE_OPTIONS, tabCounts, travelLabel, whoLabel } from "@/lib/staff/queue"
import { can } from "@/lib/staff/roles"
import { initials } from "@/lib/staff/session"

export const dynamic = "force-dynamic"

const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "")
  return d.length >= 8 ? `https://wa.me/${d}` : null
}

export default async function CasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { staff } = await sectionAccess("cases")
  const sp = await searchParams
  const filters = parseFilters(sp)
  const { cases, team, problem } = await loadConsoleData(staff)
  const now = Date.now()

  const counts = tabCounts(cases, now)
  const list = applyQueue(cases, filters, now)
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const page = Math.min(pages, Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1))
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const openCount = cases.filter(isOpen).length

  const nameOf = (id: string | null) => (id ? team.find((m) => m.id === id)?.name ?? "Former staff" : "Unassigned")
  const rows: QueueRow[] = shown.map((c) => {
    const sla = slaCell(c, now)
    return {
      id: c.id,
      name: c.name,
      ref: c.ref,
      country: c.country,
      iso: SCHENGEN_META[c.country]?.iso,
      travellers: c.travellers,
      stage: STAGE[c.stage].label,
      stageKey: c.stage,
      tone: STAGE[c.stage].tone,
      what: c.what,
      who: whoLabel(c),
      travel: travelLabel(c.travelStart, c.travelEnd),
      last: agoLabel(c.updatedAt, now),
      ownerId: c.ownerId,
      owner: c.ownerId ? initials(nameOf(c.ownerId)) : null,
      ownerName: nameOf(c.ownerId),
      sla: sla.text,
      slaTone: sla.tone,
      open: isOpen(c),
      paid: c.paid,
      canRemind: c.side === "customer" && c.stage === "documents",
      waLink: waLink(c.phone),
      trackingPath: c.trackingToken ? `/track/${c.trackingToken}` : null,
    }
  })

  const query = (over: Record<string, string>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] ?? "" : v ?? ""])), ...over })) {
      if (v) p.set(k, v)
    }
    const s = p.toString()
    return s ? `?${s}` : ""
  }
  const countries = [...new Set(cases.map((c) => c.country).filter(Boolean))].sort()
  const owners = [...team.map((m) => ({ value: m.id, label: m.name })), { value: "none", label: "Unassigned" }]

  return (
    <>
      {problem ? <ErrorBanner title="Some data did not load." body={`${problem} What did load is shown; reload to try again.`} /> : null}

      <div className="ezc-pagehead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h1>Cases</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {list.length} shown · {openCount} open · {cases.length - openCount} closed
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {staff.role === "admin" && !staff.demo ? (
            <a className="btn ghost" href="/staff/cases/legacy" title="Status changes and emails, until the Case board replaces them">Old case tools</a>
          ) : null}
          {can(staff.role, "export") ? (
            <a className="btn outline" href={`/api/admin/export/cases${query({ page: "" })}`}>
              <Download size={16} aria-hidden /> Export CSV
            </a>
          ) : null}
        </div>
      </div>

      <nav className="utabs" aria-label="Queues">
        {QUEUE_TABS.map((t) => (
          <a key={t.key} className="tab" href={`/staff/cases${query({ tab: t.key === "all" ? "" : t.key, page: "" })}`} aria-current={filters.tab === t.key ? "page" : undefined}>
            {t.label}
            {"tone" in t ? <span className={`pill xs ${t.tone}`}>{counts[t.key]}</span> : null}
          </a>
        ))}
      </nav>

      <CasesQueue
        rows={rows}
        stages={STAGE_OPTIONS.map((s) => ({ value: s, label: STAGE[s].label }))}
        owners={owners}
        countries={countries.map((c) => ({ value: c, label: c }))}
        sorts={SORTS.map((s) => ({ value: s.key, label: s.label }))}
        me={{ staffId: staff.staffId }}
        perms={{
          assign: can(staff.role, "assign"),
          selfAssign: can(staff.role, "docs"),
          stage: can(staff.role, "stage"),
          export: can(staff.role, "export"),
          msg: can(staff.role, "msg"),
          edit: can(staff.role, "edit"),
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {list.length === 0 ? "No cases" : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${(page - 1) * PAGE_SIZE + shown.length} of ${list.length}`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {page > 1 ? <a className="btn outline sm" href={`/staff/cases${query({ page: String(page - 1) })}`}>Previous</a> : <span className="btn outline sm" aria-disabled="true" style={{ opacity: 0.5 }}>Previous</span>}
          {page < pages ? <a className="btn outline sm" href={`/staff/cases${query({ page: String(page + 1) })}`}>Next</a> : <span className="btn outline sm" aria-disabled="true" style={{ opacity: 0.5 }}>Next</span>}
        </div>
      </div>
    </>
  )
}
