"use client"

// Hover preview for any link to a case in the console: stage, what it waits for, owner, SLA, travel, appointment and
// contact, without leaving the page. Mouse only (touch opens the case as usual); Esc or moving away closes it.
import { useEffect, useRef, useState } from "react"
import { peekCase, type CasePeek } from "@/app/admin/search-action"

const CASE_PATH = /^\/staff\/cases\/([^/?#]+)/
const DELAY = 450

export function CasePeekLayer() {
  const [peek, setPeek] = useState<{ data: CasePeek | null; x: number; y: number; above: boolean } | null>(null)
  const cache = useRef(new Map<string, CasePeek | null>())
  const timer = useRef<number | null>(null)
  const current = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    const here = () => window.location.pathname.match(CASE_PATH)?.[1]
    const close = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = null
      current.current = null
      setPeek(null)
    }
    const onOver = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a || a === current.current) return
      if ((e.target as HTMLElement).closest(".case-peek")) return
      const url = new URL(a.href, window.location.href)
      const id = url.origin === window.location.origin ? url.pathname.match(CASE_PATH)?.[1] : undefined
      if (!id || id === "new" || id === "legacy" || id === here() || a.closest(".pal, .ezc-side, .menu")) return
      close()
      current.current = a
      timer.current = window.setTimeout(async () => {
        const r = a.getBoundingClientRect()
        const above = r.bottom + 230 > window.innerHeight
        const place = (data: CasePeek | null) => {
          if (current.current !== a) return
          setPeek({ data, x: Math.max(12, Math.min(r.left, window.innerWidth - 340)), y: above ? r.top - 8 : r.bottom + 8, above })
        }
        if (cache.current.has(id)) return place(cache.current.get(id)!)
        const data = await peekCase(id).catch(() => null)
        cache.current.set(id, data)
        place(data)
      }, DELAY)
    }
    const onOut = (e: MouseEvent) => {
      const to = e.relatedTarget as HTMLElement | null
      if (current.current && (current.current.contains(to) || to?.closest?.(".case-peek"))) return
      if ((e.target as HTMLElement).closest?.(".case-peek") && to && (to.closest(".case-peek") || to === current.current)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    document.addEventListener("mouseover", onOver)
    document.addEventListener("mouseout", onOut)
    document.addEventListener("scroll", close, true)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("mouseout", onOut)
      document.removeEventListener("scroll", close, true)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  if (!peek?.data) return null
  const d = peek.data
  return (
    <div className="case-peek" role="tooltip" style={{ left: peek.x, top: peek.y, transform: peek.above ? "translateY(-100%)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <span style={{ minWidth: 0 }}>
          <b className="ellipsis" style={{ display: "block" }}>{d.name}</b>
          <span className="muted" style={{ fontSize: 12 }}>{d.ref} · {d.country}</span>
        </span>
        <span className={`pill xs ${d.tone}`}>{d.stage}</span>
      </div>
      <dl>
        <dt>Waiting on</dt><dd>{d.waitingOn}: {d.what}{d.due ? <span className={`pill xs ${d.over ? "red" : "amber"}`} style={{ marginInlineStart: 6 }}>{d.due}</span> : null}</dd>
        <dt>Owner</dt><dd>{d.owner}</dd>
        <dt>Travel</dt><dd>{d.travel}</dd>
        {d.appointment ? <><dt>Appointment</dt><dd>{d.appointment}</dd></> : null}
        <dt>Contact</dt><dd className="ellipsis">{d.phone || "No phone"} · {d.email}</dd>
        <dt>Fee</dt><dd>{d.paid ? "Paid" : "Not paid"}</dd>
      </dl>
    </div>
  )
}
