"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { undoEvent } from "@/app/admin/audit/actions"

export function UndoButton({ id }: { id: number }) {
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  if (msg?.ok) return <span className="pill green">{msg.text}</span>
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn outline" disabled={pending} onClick={() => start(async () => { const r = await undoEvent({ id }); setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error }); if (r.ok) router.refresh() })}>Undo this change</button>
      {msg ? <span className="pill red">{msg.text}</span> : null}
    </div>
  )
}
