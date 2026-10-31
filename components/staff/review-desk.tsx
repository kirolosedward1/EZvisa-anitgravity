"use client"

// Document review split view: queue, file, and the shared DocumentReview panel. A and R act on the open document,
// J and K move through the queue. A decided document leaves the queue and the next one opens.
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Maximize2, PenLine, RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { DocumentReviewPanel } from "@/components/staff/document-review"

export type DeskItem = {
  key: string
  caseId: string
  type: string
  title: string
  name: string
  ref: string
  country: string
  iso?: string
  at: string
  fileName: string | null
  tag: { text: string; tone: string }
  url: string | null
  compare: { name: string; passport: string | null; employer: string | null }
}

const isImage = (name: string | null) => !!name && /\.(jpe?g|png|webp|gif|heic)$/i.test(name)

export function FilePreview({ url, fileName, zoom, rot, demo = false }: { url: string | null; fileName: string | null; zoom: number; rot: number; demo?: boolean }) {
  if (!url) {
    return (
      <div className="preview-empty">
        <p style={{ margin: 0 }}>{demo ? "Demo cases have no real files." : fileName ? "The file link is not ready. Reload the page to sign it again." : "No file record for this document."}</p>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>{fileName ?? ""}</p>
      </div>
    )
  }
  if (isImage(fileName)) {
    return (
      <div className="preview-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName ?? "Uploaded document"} style={{ transform: `scale(${zoom / 100}) rotate(${rot}deg)` }} />
      </div>
    )
  }
  return <iframe className="preview-pdf" src={url} title={fileName ?? "Uploaded document"} />
}

export function ReviewDesk({ items: initial, canDecide, demo }: { items: DeskItem[]; canDecide: boolean; demo: boolean }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [rot, setRot] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const [stats, setStats] = useState({ approved: 0, back: 0 })
  const current = items[Math.min(i, items.length - 1)]
  const cases = useMemo(() => new Set(items.map((x) => x.caseId)).size, [items])

  useEffect(() => {
    setZoom(100)
    setRot(0)
  }, [current?.key])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "j") setI((x) => Math.min(items.length - 1, x + 1))
      else if (k === "k") setI((x) => Math.max(0, x - 1))
      else if (k === "a" || k === "r") {
        const button = document.querySelector<HTMLButtonElement>(`[data-review-action="${k === "a" ? "approve" : "reject"}"]`)
        if (button && !button.disabled) {
          e.preventDefault()
          button.click()
        }
      } else return
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items.length])

  const decided = (decision: "approved" | "rejected", message: string) => {
    setFlash(`${message} ${current.name} · ${current.ref}`)
    setStats((s) => (decision === "approved" ? { ...s, approved: s.approved + 1 } : { ...s, back: s.back + 1 }))
    setItems((list) => list.filter((x) => x.key !== current.key))
    setI((x) => Math.max(0, Math.min(x, items.length - 2)))
    if (!demo) router.refresh()
  }

  if (!current) {
    return (
      <section className="card" style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <h2>Queue clear</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>No uploaded document is waiting for a check. Reviewed today: {stats.approved + stats.back} · approved {stats.approved} · sent back {stats.back}</p>
        <a className="btn outline sm" href="/staff/cases?tab=customer">See cases waiting on customers</a>
      </section>
    )
  }

  return (
    <div className="desk">
      <section className="card desk-queue" aria-labelledby="q-h">
        <div style={{ padding: "14px 16px 8px" }}>
          <h2 id="q-h">Queue</h2>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>{items.length} to check across {cases} {cases === 1 ? "case" : "cases"}</p>
        </div>
        <ul>
          {items.map((x, n) => (
            <li key={x.key}>
              <button type="button" aria-current={x.key === current.key ? "true" : undefined} onClick={() => setI(n)}>
                <CountryFlag iso={x.iso} title={x.country} className="size-6" />
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, textAlign: "start" }}>
                  <b className="ellipsis">{x.title}</b>
                  <span className="muted ellipsis" style={{ fontSize: 12 }}>{x.name} · {x.ref}</span>
                </span>
                <span className={`pill xs ${x.tag.tone}`}>{x.tag.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card desk-file" aria-label="Document">
        <div className="desk-file-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="ellipsis">{current.title}</h2>
            <p className="muted ellipsis" style={{ margin: 0, fontSize: 12 }}>
              {current.fileName ?? "No file name"} · uploaded {new Date(current.at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · <a href={`/staff/cases/${current.caseId}?tab=documents`}>{current.name}, {current.ref}</a>
            </p>
          </div>
          <div className="toolbar" role="toolbar" aria-label="File tools">
            <button type="button" className="btn ghost" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 25))}><ZoomOut size={16} aria-hidden /></button>
            <span className="muted" style={{ fontSize: 12, minWidth: 38, textAlign: "center" }}>{zoom}%</span>
            <button type="button" className="btn ghost" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 25))}><ZoomIn size={16} aria-hidden /></button>
            <button type="button" className="btn ghost" aria-label="Rotate" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw size={16} aria-hidden /></button>
            {current.url ? <a className="btn ghost" aria-label="Download" href={current.url} target="_blank" rel="noopener noreferrer"><Download size={16} aria-hidden /></a> : null}
            <a className="btn ghost" href={`/staff/documents/${encodeURIComponent(current.key)}`}><PenLine size={16} aria-hidden /> Annotate</a>
            {current.url ? <a className="btn ghost" aria-label="Full screen" href={current.url} target="_blank" rel="noopener noreferrer"><Maximize2 size={16} aria-hidden /></a> : null}
          </div>
        </div>
        <FilePreview url={current.url} fileName={current.fileName} zoom={zoom} rot={rot} demo={demo} />
      </section>

      <section className="card desk-panel" aria-label="Checklist and decision">
        {flash ? <div className="flash ok" role="status"><span>{flash}</span></div> : null}
        <DocumentReviewPanel
          key={current.key}
          caseId={current.caseId}
          doc={{ type: current.type, title: current.title, state: "received", note: null, reviewedBy: null, files: [] }}
          canDecide={canDecide}
          onDecided={decided}
          compare={
            <div className="compare">
              Compare against the application: name <b>{current.compare.name}</b>
              {current.compare.passport ? <>, passport <b>{current.compare.passport}</b></> : null}
              {current.compare.employer ? <>, employer <b>{current.compare.employer}</b></> : null}
            </div>
          }
        />
        <button type="button" className="btn ghost sm" onClick={() => setI((x) => (x + 1) % items.length)}>Skip for now</button>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Reviewed here: {stats.approved + stats.back} · approved {stats.approved} · sent back {stats.back}</p>
      </section>
    </div>
  )
}
