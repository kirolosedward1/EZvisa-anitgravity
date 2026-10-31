"use client"

// Console search (Ctrl+K, "/" or the search box): cases, customers and boards as you type; arrow keys to move, Enter
// to open. With no pick, Enter searches the Cases queue. Results come from app/admin/search-action.ts.
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BookOpen, Inbox, Search, User } from "lucide-react"
import { searchConsole, type SearchHit } from "@/app/admin/search-action"
import type { NavGroup } from "@/lib/staff/roles"

type Item = { key: string; title: string; sub?: string; href: string; icon: "case" | "customer" | "page"; pill?: { label: string; tone: string } }

export function CommandPalette({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: NavGroup[] }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!open) return
    setQ("")
    setHits([])
    setActive(0)
    const t = setTimeout(() => input.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setHits([]); return }
    const t = setTimeout(() => start(async () => { setHits(await searchConsole(term)); setActive(0) }), 180)
    return () => clearTimeout(t)
  }, [q])

  const pages: Item[] = useMemo(() => {
    const all: Item[] = [...nav.flatMap((g) => g.items.map((i) => ({ key: `p-${i.key}`, title: i.label, href: i.href, icon: "page" as const }))), { key: "p-guide", title: "User guide", sub: "How every board works", href: "/staff/guide", icon: "page" as const }, { key: "p-new", title: "New case", sub: "Create a case for a customer", href: "/staff/cases/new", icon: "page" as const }]
    const t = q.trim().toLowerCase()
    return t ? all.filter((p) => p.title.toLowerCase().includes(t) || p.sub?.toLowerCase().includes(t)).slice(0, 4) : all.slice(0, 6)
  }, [nav, q])

  const items: Item[] = [
    ...hits.map((h) => ({ key: `${h.kind}-${h.id}`, title: h.title, sub: h.sub, href: h.href, icon: h.kind, pill: h.kind === "case" ? { label: h.stage, tone: h.tone } : undefined })),
    ...pages,
  ]
  const go = (href: string) => { onClose(); router.push(href) }

  if (!open) return null
  return (
    <div className="modal-scrim pal-scrim" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Search the console">
        <form
          className="pal-input"
          onSubmit={(e) => {
            e.preventDefault()
            const pick = items[active]
            if (pick && (hits.length || q.trim().length < 2 || pick.icon === "page")) go(pick.href)
            else if (q.trim()) go(`/staff/cases?tab=all&q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <Search size={18} aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)) }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
              if (e.key === "Escape") { e.preventDefault(); onClose() }
            }}
            placeholder="Name, email, phone, EZ reference or a board"
            aria-label="Search"
            aria-controls="pal-list"
            aria-activedescendant={items[active] ? `pal-${items[active].key}` : undefined}
            role="combobox"
            aria-expanded="true"
            autoComplete="off"
          />
          <kbd className="ezc-kbd">Esc</kbd>
        </form>
        <ul id="pal-list" role="listbox" className="pal-list">
          {q.trim().length >= 2 && !pending && hits.length === 0 ? <li className="pal-empty">No cases or customers match. Press Enter to search the Cases queue.</li> : null}
          {pending ? <li className="pal-empty">Searching…</li> : null}
          {items.map((it, i) => (
            <li key={it.key} id={`pal-${it.key}`} role="option" aria-selected={i === active}>
              <a href={it.href} onClick={(e) => { e.preventDefault(); go(it.href) }} onMouseMove={() => setActive(i)} className="pal-item" data-active={i === active ? "true" : undefined}>
                <span className="pal-ico" aria-hidden="true">{it.icon === "case" ? <Inbox size={16} /> : it.icon === "customer" ? <User size={16} /> : it.key === "p-guide" ? <BookOpen size={16} /> : <ArrowRight size={16} />}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <b className="ellipsis">{it.title}</b>
                  {it.sub ? <span className="muted ellipsis" style={{ fontSize: 12 }}>{it.sub}</span> : null}
                </span>
                {it.pill ? <span className={`pill xs ${it.pill.tone}`}>{it.pill.label}</span> : it.icon === "page" ? <span className="muted" style={{ fontSize: 11 }}>Board</span> : it.icon === "customer" ? <span className="muted" style={{ fontSize: 11 }}>Customer</span> : null}
              </a>
            </li>
          ))}
        </ul>
        <div className="pal-foot muted"><span><kbd className="ezc-kbd">↑</kbd> <kbd className="ezc-kbd">↓</kbd> move</span><span><kbd className="ezc-kbd">Enter</kbd> open</span><span><kbd className="ezc-kbd">Ctrl</kbd> <kbd className="ezc-kbd">K</kbd> or <kbd className="ezc-kbd">/</kbd> anywhere</span></div>
      </div>
    </div>
  )
}
