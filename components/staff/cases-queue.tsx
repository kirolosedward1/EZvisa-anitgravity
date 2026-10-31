"use client"

// Cases queue (Cases board): filters in the URL, saved views and column choice on this device, selection with a bulk
// bar, and a row menu. Writes go through the server actions in app/admin/cases/actions.ts.
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, Download, MoreHorizontal } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { assignCases, bulkChangeStage, cancelCase, type ActionResult } from "@/app/admin/cases/actions"
import { STAGE_TARGETS } from "@/lib/staff/stage-targets"

export type QueueRow = {
  id: string
  name: string
  ref: string
  country: string
  iso?: string
  travellers: number
  stage: string
  stageKey: string
  tone: string
  what: string
  who: string
  travel: string
  last: string
  ownerId: string | null
  owner: string | null
  ownerName: string
  sla: string
  slaTone: "red" | "amber" | "muted"
  open: boolean
  paid: boolean
  canRemind: boolean
  waLink: string | null
  trackingPath: string | null
}

type Option = { value: string; label: string }
type Col = "waiting" | "travel" | "last" | "owner" | "sla"
const COLS: { key: Col; label: string }[] = [
  { key: "waiting", label: "Waiting for" },
  { key: "travel", label: "Travel" },
  { key: "last", label: "Last activity" },
  { key: "owner", label: "Owner" },
  { key: "sla", label: "SLA" },
]
const COL_WIDTH: Record<Col, string> = { waiting: "minmax(0,1.2fr)", travel: "minmax(0,1fr)", last: "minmax(0,.8fr)", owner: "40px", sla: "auto" }
const SLA_COLOR = { red: "#8a1c1c", amber: "#7a4b00", muted: "#52617a" }
const VIEWS_KEY = "ezc-case-views"
const COLS_KEY = "ezc-case-columns"

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked: the choice lasts for this page only
  }
}

export function CasesQueue({
  rows,
  stages,
  owners,
  countries,
  sorts,
  me,
  perms,
}: {
  rows: QueueRow[]
  stages: Option[]
  owners: Option[]
  countries: Option[]
  sorts: Option[]
  me: { staffId: string | null }
  perms: { assign: boolean; selfAssign: boolean; stage: boolean; export: boolean; msg: boolean; edit: boolean }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<string | null>(null)
  const [bulkTo, setBulkTo] = useState("")
  const [bulkNote, setBulkNote] = useState("")
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [cancelling, setCancelling] = useState<QueueRow | null>(null)
  const [note, setNote] = useState("")
  const [hidden, setHidden] = useState<Col[]>([])
  const [views, setViews] = useState<{ name: string; query: string }[]>([])
  const [showCols, setShowCols] = useState(false)
  const [q, setQ] = useState(params.get("q") ?? "")
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHidden(readJson<Col[]>(COLS_KEY, []))
    setViews(readJson(VIEWS_KEY, []))
  }, [])
  useEffect(() => setSelected(new Set()), [rows])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setMenu(null)
      setShowCols(false)
      setCancelling(null)
    }
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu-root]")) {
        setMenu(null)
        setShowCols(false)
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("click", onClick)
    }
  }, [])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete("page")
    router.push(`${pathname.replace(/^\/admin/, "/staff")}?${next.toString()}`)
  }
  const onSearch = (value: string) => {
    setQ(value)
    if (typing.current) clearTimeout(typing.current)
    typing.current = setTimeout(() => setParam("q", value.trim()), 300)
  }

  const visible = COLS.filter((c) => !hidden.includes(c.key))
  const grid = useMemo(
    () => ["36px", "26px", "minmax(0,1.6fr)", "minmax(0,1fr)", ...visible.map((c) => COL_WIDTH[c.key]), "36px"].join(" "),
    [visible],
  )
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn()
      setFlash(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) router.refresh()
    })

  const saveView = () => {
    const name = window.prompt("Name this view")?.trim()
    if (!name) return
    const next = [...views.filter((v) => v.name !== name), { name: name.slice(0, 40), query: params.toString() }]
    setViews(next)
    writeJson(VIEWS_KEY, next)
  }
  const removeView = (name: string) => {
    const next = views.filter((v) => v.name !== name)
    setViews(next)
    writeJson(VIEWS_KEY, next)
  }
  const toggleCol = (key: Col) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]
    setHidden(next)
    writeJson(COLS_KEY, next)
  }
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setFlash({ ok: true, text: `${label} copied.` })
    } catch {
      setFlash({ ok: false, text: "Copy is blocked in this browser." })
    }
  }

  const selectedIds = [...selected]
  const assignOptions = owners.filter((o) => o.value && o.value !== "none")

  return (
    <>
      <div className="q-filters">
        <label>
          <span className="muted">Search</span>
          <input className="inp" type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Name, email, phone, reference" />
        </label>
        <label>
          <span className="muted">Stage</span>
          <select className="sel" value={params.get("stage") ?? ""} onChange={(e) => setParam("stage", e.target.value)}>
            <option value="">Any stage</option>
            {stages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          <span className="muted">Owner</span>
          <select className="sel" value={params.get("owner") ?? ""} onChange={(e) => setParam("owner", e.target.value)}>
            <option value="">Anyone</option>
            {owners.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          <span className="muted">Destination</span>
          <select className="sel" value={params.get("country") ?? ""} onChange={(e) => setParam("country", e.target.value)}>
            <option value="">Any country</option>
            {countries.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" className="btn ghost" style={{ height: 34 }} onClick={() => { setQ(""); router.push("/staff/cases") }}>Clear</button>
        <div className="q-right" data-menu-root>
          <button type="button" className="btn ghost" style={{ height: 34 }} onClick={saveView}>Save this view</button>
          <div style={{ position: "relative" }}>
            <button type="button" className="btn ghost" style={{ height: 34 }} aria-expanded={showCols} aria-haspopup="true" onClick={() => setShowCols((v) => !v)}>Columns</button>
            {showCols ? (
              <div className="menu" style={{ top: 38 }}>
                {COLS.map((c) => (
                  <label key={c.key} className="menu-check">
                    <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
                  </label>
                ))}
                <p className="muted" style={{ margin: "4px 10px 2px", fontSize: 11 }}>Saved on this device.</p>
              </div>
            ) : null}
          </div>
          <select className="sel" aria-label="Sort" value={params.get("sort") ?? "waiting"} onChange={(e) => setParam("sort", e.target.value === "waiting" ? "" : e.target.value)}>
            {sorts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {views.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>Saved views:</span>
          {views.map((v) => (
            <span key={v.name} className="pill grey" style={{ paddingInlineEnd: 4 }}>
              <a href={`/staff/cases${v.query ? `?${v.query}` : ""}`} style={{ color: "inherit" }}>{v.name}</a>
              <button type="button" aria-label={`Remove view ${v.name}`} onClick={() => removeView(v.name)} style={{ border: 0, background: "none", cursor: "pointer", color: "inherit", padding: "0 4px" }}>×</button>
            </span>
          ))}
        </div>
      ) : null}

      {flash ? (
        <div className={flash.ok ? "flash ok" : "flash err"} role="status">
          {flash.ok ? <Check size={16} aria-hidden /> : null}
          <span>{flash.text}</span>
          <button type="button" className="btn ghost" style={{ height: 28, marginInlineStart: "auto" }} onClick={() => setFlash(null)}>Dismiss</button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="bulk" role="region" aria-label="Bulk actions">
          <span style={{ fontSize: 13, fontWeight: 500 }}>{selected.size} selected</span>
          {perms.assign ? (
            <select
              className="sel"
              style={{ height: 30 }}
              aria-label="Assign selected cases to"
              value=""
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value
                if (v) run(() => assignCases({ ids: selectedIds, staffId: v === "none" ? null : v }))
              }}
            >
              <option value="">Assign to…</option>
              {assignOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="none">Unassign</option>
            </select>
          ) : null}
          {perms.stage ? (
            <>
              <select className="sel" style={{ height: 30 }} aria-label="Move selected cases to stage" value={bulkTo} disabled={pending} onChange={(e) => setBulkTo(e.target.value)}>
                <option value="">Move to stage…</option>
                {Object.entries(STAGE_TARGETS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              {bulkTo ? (
                <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); run(() => bulkChangeStage({ ids: selectedIds, to: bulkTo, note: bulkNote })); setBulkTo(""); setBulkNote("") }}>
                  <input className="inp" style={{ height: 30, minWidth: 0, width: 200 }} required minLength={3} placeholder="Reason (for the audit log)" value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} aria-label="Reason for the stage change" />
                  <button type="submit" className="btn primary" style={{ height: 30 }} disabled={pending || bulkNote.trim().length < 3}>Apply</button>
                </form>
              ) : null}
            </>
          ) : null}
          {perms.msg ? (
            <button type="button" className="btn outline" style={{ height: 30 }} onClick={() => copy(rows.filter((r) => selected.has(r.id) && r.waLink).map((r) => `${r.name}\t+${r.waLink!.replace(/\D/g, "")}`).join("\n"), "Names and phone numbers")} title="Copies name and number of each selected customer, for WhatsApp or a call list">
              Copy phone numbers
            </button>
          ) : null}
          {perms.export ? (
            <a className="btn outline" style={{ height: 30 }} href={`/api/admin/export/cases?ids=${selectedIds.join(",")}`}>
              <Download size={14} aria-hidden /> Export selected
            </a>
          ) : null}
          <button type="button" className="btn ghost" style={{ height: 30, color: "#fff" }} onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      ) : null}

      <section className="card" aria-label="Case list" style={{ overflow: "visible" }}>
        <div className="th" style={{ gridTemplateColumns: grid }}>
          <button type="button" className={allOn ? "chk on" : "chk"} aria-label={allOn ? "Clear selection" : "Select all shown"} aria-pressed={allOn} onClick={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)))}>
            {allOn ? <Check size={11} strokeWidth={3} aria-hidden /> : null}
          </button>
          <span />
          <span>Applicant</span>
          <span>Stage</span>
          {visible.map((c) => <span key={c.key} className={`c-${c.key}`}>{c.key === "owner" ? "" : c.label}</span>)}
          <span />
        </div>
        {rows.length === 0 ? (
          <div className="empty">
            <p style={{ margin: "0 0 10px" }}>No cases match.</p>
            <a className="btn outline sm" href="/staff/cases">Clear the filters</a>
          </div>
        ) : (
          rows.map((r) => {
            const on = selected.has(r.id)
            return (
              <div key={r.id} className="tr" style={{ gridTemplateColumns: grid }}>
                <button type="button" className={on ? "chk on" : "chk"} aria-label={`Select ${r.name}`} aria-pressed={on} onClick={() => toggle(r.id)}>
                  {on ? <Check size={11} strokeWidth={3} aria-hidden /> : null}
                </button>
                <a href={`/staff/cases?country=${encodeURIComponent(r.country)}`} className="row-flag" title={`All ${r.country} cases`}><CountryFlag iso={r.iso} title={r.country} className="size-[26px]" /></a>
                <a href={`/staff/cases/${r.id}`} className="who">
                  <b>{r.name}</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {r.ref} · {r.country} · {r.travellers === 1 ? "1 traveller" : `${r.travellers} travellers`}
                  </span>
                </a>
                <a href={`/staff/cases?stage=${r.stageKey}`} className={`pill ${r.tone}`} title={`All cases at ${r.stage}`}><span className="dot" />{r.stage}</a>
                {visible.map((c) =>
                  c.key === "waiting" ? (
                    <span key={c.key} className="c-waiting">
                      <span className="ellipsis" style={{ fontSize: 13 }}>{r.what}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{r.who}</span>
                    </span>
                  ) : c.key === "travel" ? (
                    <span key={c.key} className="muted c-travel" style={{ fontSize: 12 }}>{r.travel}</span>
                  ) : c.key === "last" ? (
                    <span key={c.key} className="muted c-last" style={{ fontSize: 12 }}>{r.last}</span>
                  ) : c.key === "owner" ? (
                    r.owner ? (
                      <a key={c.key} href={`/staff/cases?owner=${r.ownerId}`} className="av c-owner" title={`${r.ownerName}: their cases`}>{r.owner}</a>
                    ) : !r.paid ? (
                      // Unpaid drafts get an owner after payment; no "unassigned" marker for them.
                      <span key={c.key} className="muted c-owner" style={{ textAlign: "center" }} title="Assigned after payment">–</span>
                    ) : (
                      r.open && me.staffId && (perms.assign || perms.selfAssign) ? (
                        <button key={c.key} type="button" className="av none c-owner" title="Unassigned: assign to me" aria-label={`Assign ${r.name} to me`} onClick={() => run(() => assignCases({ ids: [r.id], staffId: me.staffId }))}>?</button>
                      ) : (
                        <a key={c.key} href="/staff/cases?owner=none" className="av none c-owner" title="Unassigned cases">?</a>
                      )
                    )
                  ) : (
                    <span key={c.key} className="c-sla" style={{ fontSize: 12, fontWeight: 500, color: SLA_COLOR[r.slaTone], whiteSpace: "nowrap" }}>{r.sla}</span>
                  ),
                )}
                <div data-menu-root style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="btn ghost"
                    aria-label={`Actions for ${r.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menu === r.id}
                    onClick={() => setMenu(menu === r.id ? null : r.id)}
                    style={{ height: 30, width: 30, padding: 0, justifyContent: "center" }}
                  >
                    <MoreHorizontal size={16} aria-hidden />
                  </button>
                  {menu === r.id ? (
                    <div className="menu" role="menu" aria-label={`Actions for ${r.name}`}>
                      <a role="menuitem" href={`/staff/cases/${r.id}`}>Open case</a>
                      {r.open && (perms.assign || (perms.selfAssign && !r.ownerId)) && me.staffId && r.ownerId !== me.staffId ? (
                        <button role="menuitem" type="button" onClick={() => { setMenu(null); run(() => assignCases({ ids: [r.id], staffId: me.staffId })) }}>Assign to me</button>
                      ) : null}
                      {perms.msg && r.waLink ? (
                        <a role="menuitem" href={r.waLink} target="_blank" rel="noopener noreferrer">WhatsApp the customer</a>
                      ) : null}
                      {r.paid ? <a role="menuitem" href={`/staff/cases/${r.id}?tab=documents`}>Review documents</a> : null}
                      {perms.edit && r.open ? <a role="menuitem" href={`/staff/cases/${r.id}?tab=details&edit=1`}>Edit application details</a> : null}
                      <a role="menuitem" href={`/staff/customers?case=${r.id}`}>Customer profile</a>
                      {perms.msg && r.canRemind && r.waLink ? (
                        <a role="menuitem" href={`${r.waLink}?text=${encodeURIComponent(`Hi ${r.name.split(" ")[0]}, this is EZvisa about your application ${r.ref}. ${r.what}. You can upload from your dashboard: https://www.ezvisa.net/dashboard`)}`} target="_blank" rel="noopener noreferrer">
                          Send document reminder (WhatsApp)
                        </a>
                      ) : null}
                      {r.trackingPath ? (
                        <button role="menuitem" type="button" onClick={() => { setMenu(null); copy(`https://www.ezvisa.net${r.trackingPath}`, "Tracking link") }}>Copy tracking link</button>
                      ) : null}
                      {perms.stage && r.open ? (
                        <button role="menuitem" type="button" className="danger" onClick={() => { setMenu(null); setNote(""); setCancelling(r) }}>Cancel case…</button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </section>

      {cancelling ? (
        <div className="modal-scrim" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setCancelling(null) }}>
          <form
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onSubmit={(e) => {
              e.preventDefault()
              const target = cancelling
              setCancelling(null)
              run(() => cancelCase({ id: target.id, note }))
            }}
          >
            <h2 id="cancel-title">Cancel {cancelling.name}&rsquo;s case?</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {cancelling.ref} · {cancelling.country}. The case closes and leaves the queue. A refund, if any, is a separate step on Payments.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              Note for the audit log (required)
              <textarea className="inp" autoFocus required minLength={3} maxLength={500} rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={{ height: "auto", padding: 10 }} />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn outline" onClick={() => setCancelling(null)}>Keep the case</button>
              <button type="submit" className="btn danger" disabled={note.trim().length < 3}>Cancel case</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
