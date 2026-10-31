"use client"

// Refresh: re-reads the current board's data from the server (router.refresh), keeping scroll position and any typed
// text. The icon spins while the new data loads.
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

export function RefreshButton({ label = true, className = "" }: { label?: boolean; className?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      className={`btn outline ezc-refresh ${className}`.trim()}
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      aria-label={pending ? "Refreshing" : "Refresh"}
      title="Refresh this page's data"
    >
      <RefreshCw size={16} aria-hidden className={pending ? "spin" : undefined} />
      {label ? <span className="hide-sm">{pending ? "Refreshing" : "Refresh"}</span> : null}
    </button>
  )
}
