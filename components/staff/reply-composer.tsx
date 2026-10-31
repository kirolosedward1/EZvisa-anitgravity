"use client"

// Messaging reply box: quick replies fill the text, Send opens WhatsApp with it (WhatsApp Business is not connected,
// so nothing is sent from the console and there is no stored history).
import { useState } from "react"

export function ReplyComposer({ phone, quick }: { phone: string; quick: { label: string; text: string }[] }) {
  const [text, setText] = useState("")
  const digits = phone.replace(/\D/g, "")
  return (
    <div className="composer">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12 }}>Quick replies:</span>
        {quick.map((q) => <button key={q.label} type="button" className="chip" onClick={() => setText(q.text)}>{q.label}</button>)}
      </div>
      <textarea className="inp" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply on WhatsApp… the case reference is in the quick replies" aria-label="Reply" style={{ height: "auto", padding: 10, minWidth: 0, width: "100%" }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {digits.length >= 8 ? (
          <a className={`btn primary sm${text.trim() ? "" : " is-disabled"}`} aria-disabled={!text.trim()} href={text.trim() ? `https://wa.me/${digits}?text=${encodeURIComponent(text.trim())}` : undefined} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>No WhatsApp number on this case.</span>
        )}
        <span className="muted" style={{ fontSize: 12, marginInlineStart: "auto" }}>Opens WhatsApp with this text; you press send there.</span>
      </div>
    </div>
  )
}
