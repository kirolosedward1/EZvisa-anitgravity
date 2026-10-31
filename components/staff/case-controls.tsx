"use client"

// Case board controls: owner, WhatsApp, Change stage (explicit, with a required note), the More menu, and internal
// notes. Writes go through app/admin/cases/actions.ts and app/admin/cases/[id]/actions.ts.
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, MessageCircle, MoreHorizontal, Pin } from "lucide-react"
import { assignCases, cancelCase } from "@/app/admin/cases/actions"
import { addCaseNote, changeStage, deleteCaseNote, editCaseNote } from "@/app/admin/cases/[id]/actions"
import { STAGE_TARGETS, type StageTarget } from "@/lib/staff/stage-targets"

type Flash = { ok: boolean; text: string; undo?: () => void } | null

function useFlash() {
  const [flash, setFlash] = useState<Flash>(null)
  const node = flash ? (
    <div className={flash.ok ? "flash ok" : "flash err"} role="status">
      <span>{flash.text}</span>
      {flash.undo ? <button type="button" className="btn outline" style={{ height: 28, marginInlineStart: "auto" }} onClick={() => { const u = flash.undo!; setFlash(null); u() }}>Undo</button> : null}
      <button type="button" className="btn ghost" style={{ height: 28, marginInlineStart: flash.undo ? 0 : "auto" }} onClick={() => setFlash(null)}>Dismiss</button>
    </div>
  ) : null
  return [node, setFlash] as const
}

export function CaseControls({
  caseId,
  status,
  ownerId,
  owners,
  waLink,
  trackingUrl,
  perms,
  hasPreparedFile,
  me,
}: {
  caseId: string
  status: string
  ownerId: string | null
  owners: { id: string; name: string }[]
  waLink: string | null
  trackingUrl: string | null
  perms: { assign: boolean; stage: boolean; msg: boolean; selfAssign: boolean }
  hasPreparedFile: boolean
  me: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [bar, setBar] = useState(false)
  const [menu, setMenu] = useState(false)
  const [to, setTo] = useState<StageTarget | "">("")
  const [note, setNote] = useState("")
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [flashNode, setFlash] = useFlash()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false)
        setBar(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu-root]")) setMenu(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("click", onClick)
    }
  }, [])

  const run = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void, undo?: () => void) =>
    start(async () => {
      const r = await fn()
      setFlash(r.ok ? { ok: true, text: r.message, undo: r.message.startsWith("Demo") ? undefined : undo } : { ok: false, text: r.error })
      if (r.ok) {
        after?.()
        router.refresh()
      }
    })

  const targets = (Object.keys(STAGE_TARGETS) as StageTarget[]).filter((k) => k !== status)
  const ownerEditable = perms.assign || (perms.selfAssign && !ownerId && !!me)

  return (
    <>
      <div className="case-controls">
        {ownerEditable ? (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }} className="muted">
            Owner
            <select
              className="sel"
              value={ownerId ?? ""}
              disabled={pending}
              onChange={(e) => {
                const prev = ownerId
                run(() => assignCases({ ids: [caseId], staffId: e.target.value || null }), undefined, () => run(() => assignCases({ ids: [caseId], staffId: prev })))
              }}
            >
              {perms.assign ? <option value="">Unassigned</option> : <option value="" disabled>Unassigned</option>}
              {owners.filter((o) => perms.assign || o.id === me).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>Owner: {owners.find((o) => o.id === ownerId)?.name ?? "Unassigned"}</span>
        )}
        {perms.msg && waLink ? (
          <a className="btn outline" href={waLink} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} color="#1a7f37" aria-hidden /> WhatsApp</a>
        ) : null}
        {perms.stage ? (
          <button type="button" className="btn primary" aria-expanded={bar} onClick={() => { setBar((v) => !v); setMenu(false) }}>
            Change stage <ChevronDown size={14} aria-hidden />
          </button>
        ) : null}
        <div data-menu-root style={{ position: "relative" }}>
          <button type="button" className="btn outline" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)} style={{ width: 36, padding: 0, justifyContent: "center" }}>
            <MoreHorizontal size={16} aria-hidden />
          </button>
          {menu ? (
            <div className="menu" role="menu">
              <a role="menuitem" href="/staff/files">{hasPreparedFile ? "Prepared file (File preparation)" : "Start file preparation"}</a>
              <button role="menuitem" type="button" onClick={() => { setMenu(false); window.print() }}>Print case summary</button>
              {trackingUrl ? (
                <button
                  role="menuitem"
                  type="button"
                  onClick={async () => {
                    setMenu(false)
                    try {
                      await navigator.clipboard.writeText(trackingUrl)
                      setFlash({ ok: true, text: "Tracking link copied." })
                    } catch {
                      setFlash({ ok: false, text: "Copy is blocked in this browser." })
                    }
                  }}
                >
                  Copy tracking link
                </button>
              ) : null}
              <a role="menuitem" href={`/staff/customers?case=${caseId}`}>Open the customer profile</a>
              {perms.stage && !["cancelled", "completed"].includes(status) ? (
                <button role="menuitem" type="button" className="danger" onClick={() => { setMenu(false); setConfirmCancel(true); setNote("") }}>Cancel case…</button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {bar ? (
        <form
          className="stage-bar"
          onSubmit={(e) => {
            e.preventDefault()
            if (!to) return
            run(() => changeStage({ id: caseId, to, note }), () => { setBar(false); setNote(""); setTo("") })
          }}
        >
          <label>
            Move this case to
            <select className="sel" value={to} onChange={(e) => setTo(e.target.value as StageTarget)} required>
              <option value="">Choose a stage</option>
              {targets.map((k) => <option key={k} value={k} disabled={k === "ready" && !hasPreparedFile}>{STAGE_TARGETS[k]}{k === "ready" && !hasPreparedFile ? " (needs the prepared file)" : ""}</option>)}
            </select>
          </label>
          <label style={{ flex: "1 1 260px" }}>
            Note for the audit log (required)
            <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} required minLength={3} maxLength={500} style={{ width: "100%" }} />
          </label>
          <span style={{ fontSize: 12, opacity: 0.85, alignSelf: "center" }}>The customer sees the new stage on their dashboard.</span>
          <div style={{ display: "flex", gap: 6, alignSelf: "flex-end" }}>
            <button type="submit" className="btn primary" disabled={pending || !to || note.trim().length < 3}>Apply</button>
            <button type="button" className="btn ghost" style={{ color: "#fff" }} onClick={() => setBar(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      {flashNode}

      {confirmCancel ? (
        <div className="modal-scrim" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setConfirmCancel(false) }}>
          <form
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-title"
            onSubmit={(e) => {
              e.preventDefault()
              setConfirmCancel(false)
              run(() => cancelCase({ id: caseId, note }))
            }}
          >
            <h2 id="cc-title">Cancel this case?</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>The case closes and leaves the queue. A refund, if any, is a separate step on Payments.</p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              Note for the audit log (required)
              <textarea className="inp" autoFocus required minLength={3} rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={{ height: "auto", padding: 10 }} />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn outline" onClick={() => setConfirmCancel(false)}>Keep the case</button>
              <button type="submit" className="btn danger" disabled={note.trim().length < 3}>Cancel case</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}

export function CaseNotes({ caseId, notes, canWrite, me, admin = false }: { caseId: string; notes: { id: string; at: string; author: string; authorId?: string | null; body: string; pinned: boolean }[]; canWrite: boolean; me?: string | null; admin?: boolean }) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [pending, start] = useTransition()
  const [flashNode, setFlash] = useFlash()
  const [local, setLocal] = useState<typeof notes>([])
  const all = [...local, ...notes]
  return (
    <section className="card" aria-labelledby="notes-h" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <h2 id="notes-h">Internal notes</h2>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Never shown to the customer</p>
      </div>
      {canWrite ? (
        <form
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault()
            const text = body.trim()
            if (!text) return
            start(async () => {
              const r = await addCaseNote({ id: caseId, body: text, pinned })
              setFlash(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
              if (r.ok) {
                setBody("")
                setPinned(false)
                if (r.message.startsWith("Demo")) setLocal((l) => [{ id: `local-${Date.now()}`, at: new Date().toISOString(), author: "You", body: text, pinned }, ...l])
                else router.refresh()
              }
            })
          }}
        >
          <textarea className="inp" rows={3} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} placeholder="Add a note for the team…" aria-label="New internal note" style={{ height: "auto", padding: 10, minWidth: 0 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <label className="muted" style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
            </label>
            <button type="submit" className="btn primary sm" disabled={pending || !body.trim()}>Add note</button>
          </div>
        </form>
      ) : null}
      {flashNode}
      {all.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>No notes yet.</p> : null}
      {all.map((n) => (
        <NoteCard key={n.id} caseId={caseId} note={n} canChange={canWrite && !n.id.startsWith("local-") && (admin || (!!me && n.authorId === me))} onDone={(r) => { setFlash(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error }); if (r.ok && !r.message.startsWith("Demo")) router.refresh() }} />
      ))}
    </section>
  )
}

function NoteCard({ caseId, note, canChange, onDone }: { caseId: string; note: { id: string; at: string; author: string; body: string; pinned: boolean }; canChange: boolean; onDone: (r: { ok: true; message: string } | { ok: false; error: string }) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.body)
  const [pending, start] = useTransition()
  const act = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void) => start(async () => { const r = await fn(); onDone(r); if (r.ok) after?.() })
  return (
    <div className="note-card">
      {editing ? (
        <form style={{ display: "flex", flexDirection: "column", gap: 6 }} onSubmit={(e) => { e.preventDefault(); act(() => editCaseNote({ id: caseId, noteId: note.id, body: text }), () => setEditing(false)) }}>
          <textarea className="inp" rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit note" style={{ height: "auto", padding: 10, minWidth: 0 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="btn primary sm" disabled={pending || !text.trim() || text.trim() === note.body}>Save</button>
            <button type="button" className="btn ghost sm" onClick={() => { setText(note.body); setEditing(false) }}>Cancel</button>
          </div>
        </form>
      ) : (
        <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{note.pinned ? <Pin size={12} aria-label="Pinned" style={{ marginInlineEnd: 4 }} /> : null}{note.body}</p>
      )}
      <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 11 }}>{note.author} · {new Date(note.at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        {canChange && !editing ? (
          <span className="note-actions">
            <button type="button" disabled={pending} onClick={() => setEditing(true)}>Edit</button>
            <button type="button" disabled={pending} onClick={() => act(() => editCaseNote({ id: caseId, noteId: note.id, pinned: !note.pinned }))}>{note.pinned ? "Unpin" : "Pin"}</button>
            <button type="button" disabled={pending} className="danger" onClick={() => { if (confirm("Delete this note? Its text stays in the audit log.")) act(() => deleteCaseNote({ id: caseId, noteId: note.id })) }}>Delete</button>
          </span>
        ) : null}
      </span>
    </div>
  )
}
