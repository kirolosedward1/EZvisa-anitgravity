"use client"

// Refresh: re-reads the current board's data from the server (router.refresh), keeping scroll position and any typed
// text. The icon spins while the new data loads. The board also refreshes itself every 2 minutes while the tab is
// visible, unless someone is typing in a field or has a dialog open.
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

const AUTO_MS = 2 * 60 * 1000

export function RefreshButton({ label = true, className = "", auto = true }: { label?: boolean; className?: string; auto?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [at, setAt] = useState(() => Date.now())
  const last = useRef(at)
  const refresh = () => start(() => { router.refresh(); last.current = Date.now(); setAt(last.current) })

  useEffect(() => {
    if (!auto) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - last.current < AUTO_MS - 1000) return
      const a = document.activeElement as HTMLElement | null
      const typing = !!a && (a.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName))
      if (typing || document.querySelector(".modal-scrim, [aria-expanded='true'] + form")) return
      refresh()
    }, 15_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  const time = new Date(at).toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" })
  return (
    <button
      type="button"
      className={`btn outline ezc-refresh ${className}`.trim()}
      onClick={refresh}
      disabled={pending}
      aria-label={pending ? "Refreshing" : `Refresh (updated ${time})`}
      title={`Updated ${time}. Updates by itself every 2 minutes.`}
    >
      <RefreshCw size={16} aria-hidden className={pending ? "spin" : undefined} />
      {label ? <span className="hide-sm">{pending ? "Refreshing" : "Refresh"}</span> : null}
    </button>
  )
}
