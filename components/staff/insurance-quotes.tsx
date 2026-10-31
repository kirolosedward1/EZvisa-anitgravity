"use client"

// Insurance board rows: price and send a quote, then remind, accept, decline or issue the policy.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { issuePolicy, sendQuote, setQuoteStatus, startPolicyUpload } from "@/app/admin/insurance/actions"
import { uploadWithToken } from "@/lib/staff/direct-upload"

type Result = { ok: true; message: string } | { ok: false; error: string }

function useRun(demo: boolean) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const r = await fn()
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) {
        after?.()
        if (!demo) router.refresh()
      }
    })
  const node = msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null
  return { pending, run, node }
}

export function QuoteRequest({ caseId, first, phone, trip, flexible, demo }: { caseId: string; first: string; phone: string; trip: string; flexible: boolean; demo: boolean }) {
  const [price, setPrice] = useState("")
  const [insurer, setInsurer] = useState("")
  const [sent, setSent] = useState(false)
  const { pending, run, node } = useRun(demo)
  const digits = phone.replace(/\D/g, "")
  const text = `Hi ${first}, here is your Schengen travel insurance quote for ${trip}: ${price} AED${insurer ? ` with ${insurer}` : ""}, medical cover 30,000 EUR as the embassy requires. This is separate from the visa service fee. Reply YES to go ahead.`
  const ask = `Hi ${first}, to quote your travel insurance we need your exact travel dates. Could you send them?`
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {flexible ? (
          digits.length >= 8 ? <a className="btn outline sm" href={`https://wa.me/${digits}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer">Ask for dates</a> : null
        ) : (
          <>
            <input className="inp" placeholder="Insurer" value={insurer} onChange={(e) => setInsurer(e.target.value)} style={{ width: 120, minWidth: 0, height: 32 }} aria-label="Insurer" />
            <input className="inp" type="number" min={1} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 90, minWidth: 0, height: 32 }} aria-label="Price in AED" />
            <span className="muted" style={{ fontSize: 12 }}>AED</span>
            <button type="button" className="btn primary sm" disabled={pending || !(Number(price) > 0)} onClick={() => run(() => sendQuote({ caseId, price: Number(price), insurer, cover: "Schengen medical 30,000 EUR" }), () => setSent(true))}>Record quote</button>
            {!(Number(price) > 0) ? <span className="muted" style={{ fontSize: 12 }}>Type the price first</span> : null}
          </>
        )}
      </div>
      {sent && digits.length >= 8 ? <a className="btn outline sm" style={{ alignSelf: "flex-end" }} href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Send quote on WhatsApp</a> : null}
      {node}
    </div>
  )
}

export function QuoteActions({ caseId, status, first, phone, demo }: { caseId: string; status: string; first: string; phone: string; demo: boolean }) {
  const { pending, run, node } = useRun(demo)
  const digits = phone.replace(/\D/g, "")
  return (
    <div className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {status === "sent" ? (
          <>
            {digits.length >= 8 ? <a className="btn ghost sm" href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${first}, a reminder about your travel insurance quote. Reply YES to go ahead, or tell us if you will bring your own policy.`)}`} target="_blank" rel="noopener noreferrer" onClick={() => run(() => setQuoteStatus({ caseId, status: "reminded" }))}>Remind</a> : null}
            <button type="button" className="btn outline sm" disabled={pending} onClick={() => run(() => setQuoteStatus({ caseId, status: "accepted" }))}>Mark accepted</button>
            <button type="button" className="btn ghost sm" disabled={pending} onClick={() => run(() => setQuoteStatus({ caseId, status: "declined" }))}>Declined</button>
          </>
        ) : null}
        {status === "accepted" ? (
          <label className="btn primary sm" style={{ cursor: "pointer" }}>
            Issue policy (PDF)
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              run(async () => {
                const s = await startPolicyUpload({ caseId, fileName: file.name, size: file.size })
                if (!s.ok) return s
                if (!s.demo) {
                  const err = await uploadWithToken(s.path, s.token, file)
                  if (err) return { ok: false as const, error: err }
                }
                return issuePolicy({ caseId, fileName: file.name })
              })
              e.target.value = ""
            }} />
          </label>
        ) : null}
      </div>
      {node}
    </div>
  )
}
