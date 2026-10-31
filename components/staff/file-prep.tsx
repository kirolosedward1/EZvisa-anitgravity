"use client"

// File preparation parts for one case: generate or upload each part, edit generated text, mark done, then assemble
// the prepared file and move the case to Ready.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText, Upload } from "lucide-react"
import { assembleAndReady, finishUpload, generatePart, savePart, startUpload } from "@/app/admin/files/actions"
import { uploadWithToken } from "@/lib/staff/direct-upload"
import { PARTS, type Part } from "@/lib/staff/file-prep"

const STATE = { todo: { label: "Not started", tone: "grey" }, draft: { label: "Draft, review", tone: "amber" }, done: { label: "Done", tone: "green" } } as const

export function FileParts({ caseId, parts: initial, canWrite, canReady, demo }: { caseId: string; parts: Part[]; canWrite: boolean; canReady: boolean; demo: boolean }) {
  const router = useRouter()
  const [parts, setParts] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const doneCount = parts.filter((p) => p.state === "done").length

  const update = (key: string, patch: Partial<Part>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  const run = (fn: () => Promise<{ ok: true; message: string; body?: string } | { ok: false; error: string }>, after?: (r: { body?: string }) => void) =>
    start(async () => {
      const r = await fn()
      setFlash(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) {
        after?.(r)
        if (!demo) router.refresh()
      }
    })

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`pill ${doneCount === parts.length ? "green" : "amber"}`}>{doneCount} of {parts.length} parts done</span>
        <div className="bar" style={{ flex: 1 }}><span style={{ width: `${(doneCount / parts.length) * 100}%` }} /></div>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        {parts.map((p) => {
          const def = PARTS.find((d) => d.key === p.key)!
          const s = STATE[p.state]
          return (
            <div key={p.key} className="doc-row" style={{ flexWrap: "wrap" }}>
              <span className="doc-ico" data-state={p.state === "done" ? "approved" : p.state === "draft" ? "rejected" : "missing"} aria-hidden="true">{def.kind === "gen" ? <FileText size={16} /> : <Upload size={16} />}</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontWeight: 500 }}>{def.name}</b>
                  <span className={`pill ${s.tone}`}><span className="dot" />{s.label}</span>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{p.fileName ? `${p.fileName}${p.updatedBy ? ` · ${p.updatedBy}` : ""}` : def.hint}</span>
                {editing === p.key ? (
                  <div className="stack" style={{ gap: 8, marginTop: 6 }}>
                    <textarea className="inp" rows={12} value={text} onChange={(e) => setText(e.target.value)} style={{ height: "auto", padding: 10, minWidth: 0, width: "100%", fontSize: 13, lineHeight: 1.5 }} aria-label={`${def.name} text`} />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn primary sm" disabled={pending} onClick={() => run(() => savePart({ caseId, part: p.key, body: text, markDone: true }), () => { update(p.key, { state: "done", body: text }); setEditing(null) })}>Save and mark done</button>
                      <button type="button" className="btn outline sm" disabled={pending} onClick={() => run(() => savePart({ caseId, part: p.key, body: text, markDone: false }), () => update(p.key, { state: "draft", body: text }))}>Save draft</button>
                      {def.kind === "gen" ? <button type="button" className="btn ghost sm" disabled={pending} onClick={() => run(() => generatePart({ caseId, part: p.key }), (r) => r.body && setText(r.body))}>Regenerate from the application</button> : null}
                      <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>
              {canWrite && editing !== p.key ? (
                <div className="doc-actions">
                  {def.kind === "gen" && p.state === "todo" ? (
                    <button type="button" className="btn outline sm" disabled={pending} onClick={() => run(() => generatePart({ caseId, part: p.key }), (r) => { update(p.key, { state: "draft", body: r.body ?? "" }); setText(r.body ?? ""); setEditing(p.key) })}>Generate</button>
                  ) : null}
                  {def.kind === "gen" && p.state !== "todo" ? (
                    <button type="button" className="btn outline sm" onClick={() => { setText(p.body ?? ""); setEditing(p.key) }}>Edit</button>
                  ) : null}
                  {def.kind === "upload" ? (
                    <>
                      <label className="btn outline sm" style={{ cursor: "pointer" }}>
                        {p.fileName ? "Replace file" : "Upload"}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            run(async () => {
                              const s = await startUpload({ caseId, part: p.key, fileName: file.name, size: file.size })
                              if (!s.ok) return s
                              if (!s.demo) {
                                const err = await uploadWithToken(s.path, s.token, file)
                                if (err) return { ok: false as const, error: err }
                              }
                              return finishUpload({ caseId, part: p.key, fileName: file.name })
                            }, () => update(p.key, { state: "done", fileName: file.name }))
                            e.target.value = ""
                          }}
                        />
                      </label>
                      {p.state !== "done" ? <button type="button" className="btn ghost sm" onClick={() => { setText(p.body ?? ""); setEditing(p.key) }}>Booking reference</button> : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Assembling merges everything in embassy order: form, cover letter, bookings, itinerary, checklist, then the customer&rsquo;s documents.</p>
      {flash ? <div className={flash.ok ? "flash ok" : "flash err"} role="status"><span>{flash.text}</span></div> : null}
      {canReady ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn primary" disabled={pending} style={{ opacity: doneCount === parts.length ? 1 : 0.6 }} onClick={() => {
            const left = parts.filter((p) => p.state !== "done").map((p) => PARTS.find((d) => d.key === p.key)!.name)
            if (left.length) return setFlash({ ok: false, text: `Finish the remaining parts first: ${left.join(", ")}.` })
            run(() => assembleAndReady({ caseId }))
          }}>{pending ? "Working…" : "Assemble and mark Ready"}</button>
        </div>
      ) : null}
    </div>
  )
}
