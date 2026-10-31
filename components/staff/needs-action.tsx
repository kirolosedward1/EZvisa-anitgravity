"use client"

// Overview "Needs action" card: Past SLA, Documents and Files tabs over rows the server already sorted.
import { useState } from "react"
import { CountryFlag } from "@/components/country-flag"

export type NeedsRow = {
  id: string
  name: string
  ref: string
  country: string
  iso?: string
  what: string
  stage: string
  tone: string
  wait: string
  waitTone: "red" | "amber" | "muted"
  owner: string | null
}

type Tab = "overdue" | "docs" | "files"
const TABS: { key: Tab; label: string; tone: string; empty: string; all: { href: string; label: string } }[] = [
  { key: "overdue", label: "Past SLA", tone: "red", empty: "Nothing is past its SLA.", all: { href: "/staff/cases?tab=sla", label: "Open every case past SLA" } },
  { key: "docs", label: "Documents", tone: "blue", empty: "No documents waiting for a check.", all: { href: "/staff/documents", label: "Open document review" } },
  { key: "files", label: "Files", tone: "grey", empty: "No files to prepare.", all: { href: "/staff/files", label: "Open file preparation" } },
]
const WAIT_COLOR = { red: "#8a1c1c", amber: "#7a4b00", muted: "#52617a" }

export function NeedsAction({ rows, counts }: { rows: Record<Tab, NeedsRow[]>; counts: Record<Tab, number> }) {
  const [tab, setTab] = useState<Tab>(counts.overdue > 0 ? "overdue" : counts.docs > 0 ? "docs" : "files")
  const current = TABS.find((t) => t.key === tab)!
  return (
    <section className="card" aria-labelledby="needs-action">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px 10px", flexWrap: "wrap" }}>
        <h2 id="needs-action">Needs action</h2>
        <div role="tablist" aria-label="Needs action" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`na-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="na-panel"
              className="tab"
              onClick={() => setTab(t.key)}
            >
              {t.label} <span className={`pill xs ${t.tone}`}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id="na-panel" aria-labelledby={`na-tab-${tab}`}>
        {rows[tab].length === 0 ? (
          <div className="empty">{current.empty}</div>
        ) : (
          rows[tab].map((r) => (
            <a key={r.id} className="qrow" href={`/staff/cases/${r.id}`}>
              <CountryFlag iso={r.iso} title={r.country} className="size-[26px]" />
              <span className="who">
                <b>{r.name}</b>
                <span className="muted" style={{ fontSize: 12 }}>{r.ref} · {r.country}</span>
              </span>
              <span className="muted what" style={{ fontSize: 12 }}>{r.what}</span>
              <span className={`pill ${r.tone}`}><span className="dot" />{r.stage}</span>
              <span className="wait" style={{ color: WAIT_COLOR[r.waitTone] }}>{r.wait}</span>
              {r.owner ? (
                <span className="av" title="Owner">{r.owner}</span>
              ) : (
                <span className="av none" title="Unassigned">?</span>
              )}
            </a>
          ))
        )}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid #eef1f6" }}>
        <a href={current.all.href} style={{ fontSize: 13, fontWeight: 500 }}>{current.all.label}</a>
      </div>
    </section>
  )
}
