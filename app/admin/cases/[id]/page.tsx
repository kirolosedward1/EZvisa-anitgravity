"use client"

// Staff review of one case: each customer document with its files (signed links), a status and, when it needs a new
// file, the note the customer will read. Also assigns the specialist shown on the customer's dashboard.
// Staff only (app/admin/layout.tsx); the signed-in session also authorises GET/POST /api/admin/reviews.
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ReviewStatus = "received" | "checking" | "approved" | "rejected"
type DocumentRow = {
  documentType: string
  title: string
  state: "missing" | ReviewStatus
  review: { status: ReviewStatus; note: string | null; reviewedAt: string } | null
  files: { name: string; at: string; url: string | null }[]
}
type CaseData = {
  case: { id: string; trackingToken: string | null; name: string; email: string; destination: string; status: string; payment: string }
  documents: DocumentRow[]
  specialist: string
  events: { kind: string; payload: Record<string, unknown>; created_at: string }[]
}

const STATUS_OPTIONS: { value: ReviewStatus; label: string; tone: string }[] = [
  { value: "received", label: "Received", tone: "border-slate-600 text-slate-200" },
  { value: "checking", label: "Being checked", tone: "border-sky-500/60 text-sky-300" },
  { value: "approved", label: "Approved", tone: "border-emerald-500/60 text-emerald-300" },
  { value: "rejected", label: "Needs a new file", tone: "border-amber-500/60 text-amber-300" },
]
const STATE_LABEL: Record<DocumentRow["state"], string> = {
  missing: "Not uploaded",
  received: "Received",
  checking: "Being checked",
  approved: "Approved",
  rejected: "Needs a new file",
}
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso))

function DocumentReview({ row, onSave }: { row: DocumentRow; onSave: (status: ReviewStatus, note: string) => Promise<string | null> }) {
  const [status, setStatus] = useState<ReviewStatus>(row.review?.status ?? (row.state === "missing" ? "received" : (row.state as ReviewStatus)))
  const [note, setNote] = useState(row.review?.note ?? "")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const noteId = `note-${row.documentType}`

  const save = async () => {
    setBusy(true)
    setMessage(null)
    const error = await onSave(status, note)
    setBusy(false)
    setMessage(error ? { ok: false, text: error } : { ok: true, text: "Saved. The customer sees this on their dashboard." })
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5" aria-labelledby={`doc-${row.documentType}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`doc-${row.documentType}`} className="ez-dash-panel text-white">{row.title}</h2>
          <p className="text-xs text-slate-400">
            Now: {STATE_LABEL[row.state]}
            {row.review ? ` · reviewed ${when(row.review.reviewedAt)}` : ""}
          </p>
        </div>
      </div>

      {row.files.length ? (
        <ul className="mb-4 flex flex-col gap-1.5">
          {row.files.map((file, index) => (
            <li key={`${file.name}-${file.at}`} className="flex items-center gap-2 text-sm">
              <FileText className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
              {file.url ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate text-sky-300 hover:underline">
                  {file.name}
                </a>
              ) : (
                <span className="truncate text-slate-300">{file.name}</span>
              )}
              <span className="shrink-0 text-xs text-slate-500">{when(file.at)}{index === 0 ? " · latest" : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-slate-500">No file uploaded yet.</p>
      )}

      {row.files.length === 0 && !row.review ? null : (
        <>
          <fieldset className="mb-3">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Review</legend>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-400",
                    status === option.value ? `${option.tone} bg-slate-800` : "border-slate-800 text-slate-400 hover:border-slate-600",
                  )}
                >
                  <input type="radio" name={`status-${row.documentType}`} value={option.value} checked={status === option.value} onChange={() => setStatus(option.value)} className="sr-only" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {status === "rejected" ? (
            <div className="mb-3 flex flex-col gap-1.5">
              <label htmlFor={noteId} className="text-xs font-semibold uppercase tracking-wider text-slate-400">Note for the customer (required)</label>
              <textarea
                id={noteId}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What to change in the new file, e.g. plain white background, face centred, no glasses."
                className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500">{note.length}/1000 · shown on the customer's dashboard and upload page</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Save review
            </Button>
            {message ? (
              <p role="status" className={cn("text-sm", message.ok ? "text-emerald-300" : "text-rose-300")}>{message.text}</p>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}

export default function AdminCasePage() {
  const id = String(useParams().id ?? "")
  const [data, setData] = useState<CaseData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [specialist, setSpecialist] = useState("")
  const [specialistMessage, setSpecialistMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [reviewer, setReviewer] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) throw new Error("Your session has ended. Sign in again with your staff account.")
      if (!res.ok) throw new Error(json.error || "Could not load the case")
      setData(json)
      setSpecialist(json.specialist || "")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the case")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setReviewer(sessionStorage.getItem("ez_admin_reviewer") || "")
    load()
  }, [load])

  const post = async (body: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || "Could not save"
      await load()
      return null
    } catch {
      return "You seem to be offline. Try again."
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/staff" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden="true" /> All cases
          </Link>
          <Button variant="outline" size="xs" onClick={() => load()} disabled={loading} className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" /> Refresh
          </Button>
        </div>

        {error ? <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}

        {data ? (
          <>
            <header className="flex flex-col gap-1 border-b border-slate-800 pb-5">
              <h1 className="ez-dash-h1 text-white">{data.case.name} · {data.case.destination}</h1>
              <p className="text-sm text-slate-400">
                {data.case.email} · case {data.case.status} · payment {data.case.payment}
              </p>
              {data.case.trackingToken ? (
                <a href={`/track/${data.case.trackingToken}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex w-max items-center gap-1.5 text-sm text-sky-300 hover:underline">
                  What the customer sees <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </header>

            <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:grid-cols-2" aria-label="Specialist">
              <form
                className="flex flex-col gap-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSpecialistMessage(null)
                  const err = await post({ action: "specialist", name: specialist })
                  setSpecialistMessage(err ? { ok: false, text: err } : { ok: true, text: "Assigned. The customer sees this name." })
                }}
              >
                <label htmlFor="specialist" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Specialist on this case (first name)</label>
                <div className="flex gap-2">
                  <Input id="specialist" value={specialist} onChange={(e) => setSpecialist(e.target.value)} maxLength={40} className="border-slate-800 bg-slate-950 text-white" />
                  <Button type="submit" size="sm">Assign</Button>
                </div>
                {specialistMessage ? <p role="status" className={cn("text-sm", specialistMessage.ok ? "text-emerald-300" : "text-rose-300")}>{specialistMessage.text}</p> : null}
              </form>
              <div className="flex flex-col gap-2">
                <label htmlFor="reviewer" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your name (internal, saved with reviews; your email if empty)</label>
                <Input
                  id="reviewer"
                  value={reviewer}
                  onChange={(e) => {
                    setReviewer(e.target.value)
                    sessionStorage.setItem("ez_admin_reviewer", e.target.value)
                  }}
                  maxLength={60}
                  className="border-slate-800 bg-slate-950 text-white"
                />
              </div>
            </section>

            {data.documents.map((row) => (
              <DocumentReview
                key={row.documentType}
                row={row}
                onSave={(status, note) => post({ action: "review", documentType: row.documentType, status, note, reviewer })}
              />
            ))}

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5" aria-labelledby="events-title">
              <h2 id="events-title" className="ez-dash-panel mb-3 text-white">Logged activity</h2>
              {data.events.length ? (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {data.events.map((e, i) => (
                    <li key={`${e.kind}-${e.created_at}-${i}`} className="flex flex-wrap gap-x-3 text-slate-300">
                      <span className="text-slate-500">{when(e.created_at)}</span>
                      <span>{e.kind.replace(/_/g, " ")}</span>
                      <span className="text-slate-500">{Object.entries(e.payload).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Nothing logged yet. Logging started when the activity table was added.</p>
              )}
            </section>
          </>
        ) : loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-slate-400" aria-label="Loading" /></div>
        ) : null}
      </div>
    </div>
  )
}
