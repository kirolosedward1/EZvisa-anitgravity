"use client"

// Notification centre (feed with tabs, mark read) and per-person preferences.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { markAllRead, savePrefs } from "@/app/admin/notifications/actions"
import { defaultPrefs, EVENTS, type Notification, type Prefs } from "@/lib/staff/notifications"

const TABS = [{ key: "all", label: "All" }, { key: "mine", label: "My cases" }, { key: "mention", label: "Mentions" }, { key: "system", label: "System" }] as const
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000))
  return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}

export function NotificationCentre({ items, readAt, prefs: initialPrefs, demo }: { items: Notification[]; readAt: string | null; prefs: Prefs; demo: boolean }) {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all")
  const [seen, setSeen] = useState<string | null>(readAt)
  const [read, setRead] = useState<Set<string>>(new Set())
  const [prefs, setPrefs] = useState(initialPrefs)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const unread = (n: Notification) => !read.has(n.id) && (!seen || n.at > seen)
  const shown = items.filter((n) => tab === "all" || n.kind === tab).sort((a, b) => Number(unread(b)) - Number(unread(a)) || b.at.localeCompare(a.at))
  const count = items.filter(unread).length
  const flip = (k: string, ch: "in_app" | "email" | "push") => { setPrefs((p) => ({ ...p, events: { ...p.events, [k]: { ...p.events[k], [ch]: !p.events[k][ch] } } })); setSaved(null) }

  return (
    <div className="grid2">
      <section className="card" aria-labelledby="nc-h" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "14px 16px 10px", flexWrap: "wrap", alignItems: "center" }}>
          <h2 id="nc-h">{count ? `${count} unread` : "All read"}</h2>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} role="tablist">
            {TABS.map((t) => <button key={t.key} type="button" role="tab" className="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
            <button type="button" className="btn outline sm" disabled={pending || !count} onClick={() => start(async () => { const r = await markAllRead(); if (r.ok) { setSeen(new Date().toISOString()); if (!demo) router.refresh() } })}>Mark all read</button>
          </div>
        </div>
        {shown.length === 0 ? <div className="empty"><b style={{ fontWeight: 500, color: "#102347" }}>Nothing here</b><br />You are up to date on this view.</div> : null}
        {shown.map((n) => (
          <div key={n.id} className="note-item" data-unread={unread(n) ? "true" : undefined}>
            <span className="dot-unread" aria-label={unread(n) ? "Unread" : undefined} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13 }}><b style={{ fontWeight: 500 }}>{n.who}</b> {n.text}</p>
              <span className="muted" style={{ fontSize: 12 }}>{ago(n.at)}</span>
            </div>
            <a className="btn outline sm" href={n.href} onClick={() => setRead((r) => new Set(r).add(n.id))}>{n.action}</a>
          </div>
        ))}
      </section>
      <aside className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="pf-h">
        <div>
          <h2 id="pf-h">My preferences</h2>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Per person. In-app notifications work now; email and push delivery are not connected yet, so those choices are saved for later.</p>
        </div>
        <div className="tbl"><div className="tbl-h" style={{ gridTemplateColumns: "1.6fr 0.6fr 0.6fr 0.6fr" }}><span>Event</span><span>In app</span><span>Email</span><span>Push</span></div>
          {EVENTS.map((e) => (
            <div key={e.key} className="tbl-r" style={{ gridTemplateColumns: "1.6fr 0.6fr 0.6fr 0.6fr" }}>
              <span style={{ display: "flex", flexDirection: "column" }}>{e.label}<span className="muted" style={{ fontSize: 11 }}>{e.hint}</span></span>
              {(["in_app", "email", "push"] as const).map((ch) => (
                <span key={ch}><input type="checkbox" aria-label={`${e.label}, ${ch.replace("_", "-")}`} checked={prefs.events[e.key][ch]} onChange={() => flip(e.key, ch)} /></span>
              ))}
            </div>
          ))}
        </div>
        <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="checkbox" checked={prefs.quiet.on} onChange={() => { setPrefs((p) => ({ ...p, quiet: { ...p.quiet, on: !p.quiet.on } })); setSaved(null) }} />
          Quiet hours: no push or email from
          <input className="inp" type="time" value={prefs.quiet.from} onChange={(e) => { setPrefs((p) => ({ ...p, quiet: { ...p.quiet, from: e.target.value } })); setSaved(null) }} style={{ minWidth: 0, width: 110, height: 30 }} aria-label="Quiet from" />
          to
          <input className="inp" type="time" value={prefs.quiet.to} onChange={(e) => { setPrefs((p) => ({ ...p, quiet: { ...p.quiet, to: e.target.value } })); setSaved(null) }} style={{ minWidth: 0, width: 110, height: 30 }} aria-label="Quiet to" />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Past SLA alerts on your own cases still come through.</p>
        <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={prefs.digest} onChange={() => { setPrefs((p) => ({ ...p, digest: !p.digest })); setSaved(null) }} /> Daily digest at 08:00 (needs the email service)
        </label>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => { setPrefs(defaultPrefs()); setSaved(null) }}>Reset to default</button>
          <button type="button" className="btn primary" disabled={pending} onClick={() => start(async () => { const r = await savePrefs(prefs); setSaved(r.message) })}>{saved ?? "Save preferences"}</button>
        </div>
      </aside>
    </div>
  )
}
