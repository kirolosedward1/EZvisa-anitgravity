"use client"

// Document viewer: zoom, rotate and highlight boxes. Boxes are numbered and labelled; on a send-back they are listed in
// the note the customer reads (and stored with the review when migration 006 is applied). Boxes work on image files;
// PDFs open in the browser's viewer, where the area is described in the note instead.
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MousePointer2, RotateCw, Square, Trash2, ZoomIn, ZoomOut } from "lucide-react"
import type { Highlight } from "@/app/admin/cases/[id]/actions"
import { DocumentReviewPanel, type ReviewDoc } from "@/components/staff/document-review"
import { FilePreview } from "@/components/staff/review-desk"

const LABELS = ["stamp", "signature", "date", "name", "blurry area", "missing page", "other"]

export function DocViewer({
  caseId,
  doc,
  file,
  customerFirst,
  reviewer,
  caseRef,
  siblings,
  canDecide,
  demo,
}: {
  caseId: string
  doc: ReviewDoc
  file: { url: string | null; name: string | null }
  customerFirst: string
  reviewer: string
  caseRef: string
  siblings: { key: string; title: string; current: boolean }[]
  canDecide: boolean
  demo: boolean
}) {
  const router = useRouter()
  const [zoom, setZoom] = useState(100)
  const [rot, setRot] = useState(0)
  const [mode, setMode] = useState<"select" | "box">("select")
  const [boxes, setBoxes] = useState<Highlight[]>([])
  const [label, setLabel] = useState(LABELS[0])
  const [flash, setFlash] = useState<string | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const image = !!file.name && /\.(jpe?g|png|webp|gif|heic)$/i.test(file.name)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || e.metaKey || e.ctrlKey) return
      const k = e.key.toLowerCase()
      const at = siblings.findIndex((s) => s.current)
      if (k === "a" || k === "r") {
        const button = document.querySelector<HTMLButtonElement>(`[data-review-action="${k === "a" ? "approve" : "reject"}"]`)
        if (button && !button.disabled) {
          e.preventDefault()
          button.click()
        }
      } else if (k === "b" && image) setMode((m) => (m === "box" ? "select" : "box"))
      else if (k === "j" && siblings[at + 1]) router.push(`/staff/documents/${encodeURIComponent(siblings[at + 1].key)}`)
      else if (k === "k" && at > 0) router.push(`/staff/documents/${encodeURIComponent(siblings[at - 1].key)}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [image, router, siblings])

  const addBox = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "box" || !stage.current) return
    const r = stage.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const w = 0.22
    const h = 0.1
    setBoxes((b) => [...b, { n: b.length + 1, label, page: 1, x: Math.max(0, Math.min(1 - w, x - w / 2)), y: Math.max(0, Math.min(1 - h, y - h / 2)), w, h }].slice(0, 20))
  }
  const remove = (n: number) => setBoxes((b) => b.filter((x) => x.n !== n).map((x, i) => ({ ...x, n: i + 1 })))
  const extraNote = boxes.length ? `What to fix:\n${boxes.map((b) => `${b.n}. ${b.label} (page ${b.page})`).join("\n")}` : undefined

  return (
    <div className="viewer">
      <div className="viewer-head">
        <a href={`/staff/documents?case=${caseId}`} className="btn ghost"><ArrowLeft size={16} aria-hidden /> Back to review</a>
        <div style={{ minWidth: 0 }}>
          <h1 className="ellipsis">{doc.title} · {file.name ?? "no file"}</h1>
          <p className="muted ellipsis" style={{ margin: 0, fontSize: 13 }}><a href={`/staff/cases/${caseId}?tab=documents`}>{customerFirst} · {caseRef}</a></p>
        </div>
      </div>

      <div className="viewer-grid">
        <aside className="card viewer-thumbs" aria-label="Documents on this case">
          {siblings.map((s) => (
            <a key={s.key} href={`/staff/documents/${encodeURIComponent(s.key)}`} aria-current={s.current ? "page" : undefined}>{s.title}</a>
          ))}
        </aside>

        <section className="card" style={{ display: "flex", flexDirection: "column", minWidth: 0 }} aria-label="File">
          <div className="toolbar" role="toolbar" aria-label="Viewer tools" style={{ padding: "8px 10px", borderBottom: "1px solid #eef1f6", flexWrap: "wrap" }}>
            <button type="button" className="btn ghost" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 25))}><ZoomOut size={16} aria-hidden /></button>
            <span className="muted" style={{ fontSize: 12, minWidth: 38, textAlign: "center" }}>{zoom}%</span>
            <button type="button" className="btn ghost" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 25))}><ZoomIn size={16} aria-hidden /></button>
            <button type="button" className="btn ghost" aria-label="Rotate" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={16} aria-hidden /></button>
            <span style={{ width: 1, height: 20, background: "#dee5f0" }} />
            <button type="button" className="tab" aria-pressed={mode === "select"} onClick={() => setMode("select")}><MousePointer2 size={14} aria-hidden /> Select</button>
            <button type="button" className="tab" aria-pressed={mode === "box"} disabled={!image} onClick={() => setMode("box")} title={image ? "Click on the page to mark a problem area" : "Boxes work on image files"}><Square size={14} aria-hidden /> Box</button>
            {mode === "box" ? (
              <label className="muted" style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                Label
                <select className="sel" value={label} onChange={(e) => setLabel(e.target.value)} style={{ height: 30 }}>{LABELS.map((l) => <option key={l}>{l}</option>)}</select>
              </label>
            ) : null}
            {boxes.length ? <button type="button" className="btn ghost sm" onClick={() => setBoxes([])}>Clear boxes</button> : null}
          </div>
          <p className="muted" style={{ margin: 0, padding: "6px 12px", fontSize: 12 }}>
            {image ? (mode === "box" ? "Box tool: click anywhere on the page to mark a problem area" : "Select tool: scroll and zoom") : "PDF: use the browser's viewer to page through; describe any problem area in the note."}
          </p>
          <div className="viewer-stage">
            <div ref={stage} className="viewer-page" data-mode={mode} onClick={addBox} style={{ transform: image ? `scale(${zoom / 100}) rotate(${rot}deg)` : undefined }}>
              <FilePreview url={file.url} fileName={file.name} zoom={100} rot={0} demo={demo} />
              {boxes.map((b) => (
                <span key={b.n} className="hl" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}>
                  <i>{b.n}</i>
                </span>
              ))}
            </div>
          </div>
        </section>

        <aside className="card desk-panel" aria-label="Decision">
          {flash ? <div className="flash ok" role="status"><span>{flash}</span></div> : null}
          <div className="stack" style={{ gap: 8 }}>
            <h3>Highlights on this document · {boxes.length}</h3>
            {boxes.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>{image ? "Pick the box tool and click on the page to mark a problem." : "Not available for PDF files."}</p>
            ) : (
              boxes.map((b) => (
                <div key={b.n} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span className="av" style={{ width: 22, height: 22, background: "#fdeaea", color: "#8a1c1c" }}>{b.n}</span>
                  <span style={{ flex: 1 }}>{b.label} · page {b.page}</span>
                  <button type="button" className="btn ghost sm" aria-label={`Remove highlight ${b.n}`} onClick={() => remove(b.n)}><Trash2 size={14} aria-hidden /></button>
                </div>
              ))
            )}
          </div>
          <DocumentReviewPanel
            caseId={caseId}
            doc={doc}
            canDecide={canDecide}
            extraNote={extraNote}
            highlights={boxes}
            onDecided={(decision, message) => {
              setFlash(message)
              setBoxes([])
              if (!demo) router.refresh()
              if (decision) {
                const at = siblings.findIndex((s) => s.current)
                const next = siblings[at + 1]
                if (next && !demo) router.push(`/staff/documents/${encodeURIComponent(next.key)}`)
              }
            }}
          />
          <details>
            <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>Preview of what {customerFirst} reads</summary>
            <pre className="note-preview">{`Hi ${customerFirst}, ${reviewer} checked your ${doc.title.toLowerCase()} for ${caseRef} and needs a new file.\n\n[your note]${extraNote ? `\n\n${extraNote}` : ""}\n\nUpload it from your dashboard: ezvisa.net/dashboard`}</pre>
          </details>
          <p className="muted" style={{ margin: 0, fontSize: 11 }}>Keyboard: A approve, R send back, B box tool, J and K next and previous document.</p>
        </aside>
      </div>
    </div>
  )
}
