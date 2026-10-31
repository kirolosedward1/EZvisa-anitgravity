"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setContactStatus } from "@/app/admin/messaging/actions"

export function ContactStatusButton({ id, status, demo }: { id: string; status: "new" | "handled"; demo: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const next = status === "new" ? "handled" : "new"
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className={status === "new" ? "btn primary sm" : "btn ghost sm"} disabled={pending} onClick={() => start(async () => { const r = await setContactStatus({ id, status: next }); setMsg(r.ok ? r.message : r.error); if (r.ok && !demo) router.refresh() })}>
        {status === "new" ? "Mark handled" : "Reopen"}
      </button>
      {msg ? <span className="muted" style={{ fontSize: 12 }} role="status">{msg}</span> : null}
    </span>
  )
}
