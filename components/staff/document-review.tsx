"use client"

// DocumentReview: the one panel for document decisions, shared by the Case board's Documents tab, the Document review
// split view and the viewer. Decisions and notes are stored once per document (document_reviews); a send-back note is
// what the customer reads on their dashboard.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ExternalLink, FileText } from "lucide-react"
import { reviewDocument, type Highlight } from "@/app/admin/cases/[id]/actions"
import { checklistFor, QUICK_REASONS } from "@/lib/staff/checklists"

export type ReviewDoc = {
  type: string
  title: string
  state: "missing" | "received" | "checking" | "approved" | "rejected"
  note: string | null
  reviewedBy: string | null
  files: { name: string; at: string; url: string | null }[]
}

const STATE: Record<ReviewDoc["state"], { label: string; tone: string }> = {
  missing: { label: "Not uploaded", tone: "grey" },
  received: { label: "To check", tone: "blue" },
  checking: { label: "To check", tone: "blue" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Sent back", tone: "amber" },
}
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function StatePill({ state }: { state: ReviewDoc["state"] }) {
  const s = STATE[state]
  return <span className={`pill ${s.tone}`}><span className="dot" />{s.label}</span>
}

/** Send-back editor: quick reasons fill the note; the note is required. */
function RejectEditor({ busy, onSend, onCancel, autoFocus = true, initial = "" }: { busy: boolean; onSend: (note: string) => void; onCancel: () => void; autoFocus?: boolean; initial?: string }) {
  const [note, setNote] = useState(initial)
  return (
    <div className="reject">
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Tell the customer what to fix (shown on their dashboard)
        <textarea
          className="inp"
          rows={3}
          autoFocus={autoFocus}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: the statement is missing the bank stamp and the last month. Please download the stamped PDF from the bank app."
          style={{ height: "auto", padding: 10 }}
        />
      </label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12 }}>Quick reasons:</span>
        {QUICK_REASONS.map((r) => (
          <button key={r.label} type="button" className="btn outline sm" style={{ height: 28 }} onClick={() => setNote(r.text)}>{r.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn danger sm" disabled={busy || note.trim().length < 5} onClick={() => onSend(note.trim())}>Send back to customer</button>
        <button type="button" className="btn ghost sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

/** All of a case's documents with inline decisions (Case board, Documents tab). */
export function CaseDocuments({ caseId, docs, canDecide, demo }: { caseId: string; docs: ReviewDoc[]; canDecide: boolean; demo: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [local, setLocal] = useState<Record<string, Partial<ReviewDoc>>>({})

  const decide = (doc: ReviewDoc, decision: "approved" | "rejected" | "checking", note?: string) =>
    start(async () => {
      const r = await reviewDocument({ id: caseId, documentType: doc.type, decision, note })
      setFlash(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) {
        setRejecting(null)
        // The demo saves nothing, so show the decision locally; real decisions come back from the server.
        if (demo) setLocal((l) => ({ ...l, [doc.type]: { state: decision, note: decision === "rejected" ? note ?? null : null } }))
        else router.refresh()
      }
    })

  const rows = docs.map((d) => ({ ...d, ...local[d.type] }) as ReviewDoc)
  const counts = { approved: rows.filter((d) => d.state === "approved").length, check: rows.filter((d) => d.state === "received" || d.state === "checking").length, back: rows.filter((d) => d.state === "rejected").length }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {counts.approved} approved · {counts.check} to check · {counts.back} sent back. A send-back note goes to the customer&rsquo;s dashboard.
      </p>
      {flash ? <div className={flash.ok ? "flash ok" : "flash err"} role="status"><span>{flash.text}</span></div> : null}
      <div className="card" style={{ overflow: "hidden" }}>
        {rows.map((d) => {
          const latest = d.files[0]
          const toCheck = d.state === "received" || d.state === "checking"
          return (
            <div key={d.type} className="doc-row">
              <span className="doc-ico" data-state={d.state} aria-hidden="true"><FileText size={16} /></span>
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontWeight: 500 }}>{d.title}</b>
                  <StatePill state={d.state} />
                </div>
                <span className="muted" style={{ fontSize: 12 }}>
                  {latest ? `${latest.name} · uploaded ${when(latest.at)}${d.files.length > 1 ? ` · ${d.files.length} uploads` : ""}` : d.state === "missing" ? "Not uploaded yet" : "Marked received (no file record)"}
                  {d.reviewedBy && !toCheck ? ` · ${d.reviewedBy}` : ""}
                </span>
                {d.state === "rejected" && d.note ? (
                  <div className="note-box"><b>Note sent to the customer</b> {d.note}</div>
                ) : null}
                {rejecting === d.type ? (
                  <RejectEditor busy={pending} onSend={(note) => decide(d, "rejected", note)} onCancel={() => setRejecting(null)} />
                ) : null}
              </div>
              <div className="doc-actions">
                {latest?.url ? (
                  <a className="btn ghost sm" href={latest.url} target="_blank" rel="noopener noreferrer">Preview <ExternalLink size={12} aria-hidden /></a>
                ) : null}
                {canDecide && toCheck && rejecting !== d.type ? (
                  <>
                    <button type="button" className="btn primary sm" disabled={pending} onClick={() => decide(d, "approved")}>Approve</button>
                    <button type="button" className="btn outline sm" disabled={pending} onClick={() => setRejecting(d.type)} style={{ color: "#b42318" }}>Send back</button>
                  </>
                ) : null}
                {canDecide && (d.state === "approved" || d.state === "rejected") ? (
                  <button type="button" className="btn ghost sm" disabled={pending} onClick={() => decide(d, "checking")}>Undo</button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>When every document is approved the case moves to Preparation automatically and the customer sees it.</p>
    </div>
  )
}

/** One document's checklist and decision (Document review split view and viewer). */
export function DocumentReviewPanel({
  caseId,
  doc,
  canDecide,
  onDecided,
  extraNote,
  highlights,
  compare,
}: {
  caseId: string
  doc: ReviewDoc
  canDecide: boolean
  onDecided?: (decision: "approved" | "rejected", message: string) => void
  /** Text appended to a send-back note (the viewer adds the highlighted areas). */
  extraNote?: string
  /** Areas marked in the viewer; stored with a send-back. */
  highlights?: Highlight[]
  compare?: React.ReactNode
}) {
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [rejecting, setRejecting] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const items = checklistFor(doc.type)
  const unticked = items.filter((i) => !ticks[`${doc.type}:${i}`]).length

  const decide = (decision: "approved" | "rejected", note?: string) =>
    start(async () => {
      setError(null)
      const full = decision === "rejected" && extraNote ? `${note}\n\n${extraNote}` : note
      const r = await reviewDocument({ id: caseId, documentType: doc.type, decision, note: full, uncheckedCount: decision === "approved" ? unticked : undefined, highlights: decision === "rejected" ? highlights : undefined })
      if (!r.ok) return setError(r.error)
      setRejecting(false)
      setTicks({})
      onDecided?.(decision, r.message)
    })

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div>
        <h3>What to verify: {doc.title}</h3>
        <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>Requirements for UAE residents applying for a Schengen visa</p>
      </div>
      <ul className="checklist">
        {items.map((item) => {
          const key = `${doc.type}:${item}`
          return (
            <li key={key}>
              <label>
                <input type="checkbox" checked={!!ticks[key]} onChange={() => setTicks((t) => ({ ...t, [key]: !t[key] }))} />
                <span>{item}</span>
              </label>
            </li>
          )
        })}
      </ul>
      {compare}
      {error ? <div className="flash err" role="alert"><span>{error}</span></div> : null}
      {canDecide ? (
        rejecting ? (
          <RejectEditor busy={pending} onSend={(note) => decide("rejected", note)} onCancel={() => setRejecting(false)} />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" data-review-action="approve" className="btn primary" disabled={pending} onClick={() => decide("approved")} style={{ justifyContent: "center" }}>
              <Check size={16} aria-hidden /> Approve and next <kbd className="ezc-kbd">A</kbd>
            </button>
            <button type="button" data-review-action="reject" className="btn outline" disabled={pending} onClick={() => setRejecting(true)} style={{ justifyContent: "center", color: "#b42318" }}>
              Send back to customer <kbd className="ezc-kbd">R</kbd>
            </button>
            {unticked > 0 ? <p className="muted" style={{ margin: 0, fontSize: 12 }}>{unticked} {unticked === 1 ? "check" : "checks"} still unticked. You can still approve; it will be logged.</p> : null}
          </div>
        )
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Documents: view only for your role.</p>
      )}
    </div>
  )
}
