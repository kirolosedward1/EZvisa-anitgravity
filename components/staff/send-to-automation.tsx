"use client"

import { useState, useTransition } from "react"
import { Sparkles } from "lucide-react"
import { sendToAutomation } from "@/app/admin/files/actions"

/** File preparation: asks the Make scenario to draft this case's file (drafts come back for review). */
export function SendToAutomation({ caseId, connected }: { caseId: string; connected: boolean }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button type="button" className="btn outline sm" disabled={pending} title={connected ? "Drafts the travel plan, cover letter, form answers, reservations and checklist for review" : "Not connected yet"} onClick={() => start(async () => { const r = await sendToAutomation({ caseId }); setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error }) })}>
        <Sparkles size={14} aria-hidden /> {pending ? "Sending" : "Draft with automation"}
      </button>
      {msg ? <span className={msg.ok ? "muted" : ""} style={{ fontSize: 12, color: msg.ok ? undefined : "#8a1c1c", maxWidth: 320, textAlign: "end" }} role="status">{msg.text}</span> : null}
    </span>
  )
}
