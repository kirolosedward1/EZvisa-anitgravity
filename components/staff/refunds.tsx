"use client"

// Refund modal (Payments board, Case payments tab) and the Finance decisions on refund requests.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { decideRefund, requestRefund } from "@/app/admin/payments/actions"
import { REFUND_REASONS } from "@/lib/staff/refunds"

export type RefundTarget = { caseId: string; name: string; amount: number; method: string; stageLabel: string; stage: string; policyLabel: string; policyAmount: number; duplicateAmount: number }

export function RefundButton({ target, canApprove, label, demo }: { target: RefundTarget; canApprove: boolean; label?: string; demo: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(target.policyAmount || target.amount))
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const value = Number(amount)

  return (
    <>
      <button type="button" className="btn outline sm" onClick={() => { setOpen(true); setError(null) }}>{label ?? (canApprove ? "Refund" : "Request refund")}</button>
      {done ? <span className="muted" style={{ fontSize: 12 }}>{done}</span> : null}
      {open ? (
        <div className="modal-scrim" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <form
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rf-title"
            onSubmit={(e) => {
              e.preventDefault()
              if (!reason) return setError("Choose a reason.")
              if (!(value >= 1 && value <= target.amount)) return setError(`Amount must be between 1 and ${target.amount} AED.`)
              start(async () => {
                const r = await requestRefund({ caseId: target.caseId, amount: value, reason, note, policy: target.policyLabel, stage: target.stage, approveNow: canApprove })
                if (!r.ok) return setError(r.error)
                setOpen(false)
                setDone(r.message)
                if (!demo) router.refresh()
              })
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="rf-title">{canApprove ? "Refund" : "Request a refund for"} {target.name}</h2>
              <button type="button" className="btn ghost" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <dl className="kv" style={{ background: "#f7f9fd", borderRadius: 8, padding: 10 }}>
              <dt>Payment</dt><dd>{target.amount.toFixed(2)} AED · {target.method}</dd>
              <dt>Case stage</dt><dd>{target.stageLabel}</dd>
              <dt>Policy says</dt><dd>{target.policyLabel}, {target.policyAmount.toFixed(2)} AED</dd>
            </dl>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              Amount to refund
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input className="inp" type="number" min={1} max={target.amount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ minWidth: 0, width: 140 }} />
                <span className="muted">AED of {target.amount.toFixed(2)}</span>
                <button type="button" className="btn ghost sm" onClick={() => setAmount(String(target.amount))}>Full</button>
                <button type="button" className="btn ghost sm" onClick={() => setAmount(String(Math.round(target.amount * 50) / 100))}>50 percent</button>
              </span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              Reason
              <select className="sel" value={reason} onChange={(e) => { setReason(e.target.value); if (e.target.value === "Duplicate payment") setAmount(String(target.duplicateAmount)) }} required>
                <option value="">Choose a reason</option>
                {REFUND_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              Note for the audit log
              <textarea className="inp" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Why, and anything Finance should know" style={{ height: "auto", padding: 10, minWidth: 0 }} />
            </label>
            {error ? <div className="flash err" role="alert"><span>{error}</span></div> : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn outline" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn danger" disabled={pending}>{canApprove ? `Approve refund of ${Number.isFinite(value) ? value.toFixed(2) : "0.00"} AED` : "Send to Finance"}</button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              {canApprove
                ? "Approving records the refund; issue it in the payment gateway dashboard (test mode stays on), then mark it sent. Logged with your name."
                : "Finance or an admin approves refunds. Your request goes to their queue with your note and lands in the audit log."}
            </p>
          </form>
        </div>
      ) : null}
    </>
  )
}

export function RefundDecision({ id, amount, max, status, demo }: { id: string; amount: number; max: number; status: string; demo: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(String(amount))
  const [ref, setRef] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const [finished, setFinished] = useState(false)
  const run = (input: Parameters<typeof decideRefund>[0]) =>
    start(async () => {
      const r = await decideRefund(input)
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) {
        setFinished(true)
        if (!demo) router.refresh()
      }
    })
  if (finished && msg) return <span className={`pill ${msg.ok ? "green" : "red"}`} style={{ whiteSpace: "normal", height: "auto", padding: "4px 10px" }}>{msg.text}</span>
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
      {status === "requested" ? (
        <>
          <label className="muted" style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            Amount
            <input className="inp" type="number" min={1} max={max} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 100, minWidth: 0, height: 30 }} />
          </label>
          <button type="button" className="btn primary sm" disabled={pending} onClick={() => run({ id, action: "approve", amount: Number(value) })}>Approve</button>
          <button type="button" className="btn outline sm" disabled={pending} onClick={() => run({ id, action: "decline" })}>Decline</button>
        </>
      ) : (
        <>
          <input className="inp" placeholder="Gateway refund reference" value={ref} onChange={(e) => setRef(e.target.value)} style={{ minWidth: 0, width: 200, height: 30 }} aria-label="Gateway refund reference" />
          <button type="button" className="btn outline sm" disabled={pending || !ref.trim()} onClick={() => run({ id, action: "sent", gatewayRef: ref })}>Mark sent</button>
        </>
      )}
      {msg && !msg.ok ? <span className="pill red">{msg.text}</span> : null}
    </div>
  )
}
