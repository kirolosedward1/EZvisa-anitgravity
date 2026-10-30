"use client"

// The customer's document checklist, where every row is its own upload target: choose a file (or drop one on the
// row) and it uploads straight away. Used by the dashboard case page, the signed-in desk (/dashboard/upload) and the
// tracking-link desk (/track/[token]/upload); all send to POST /api/upload-document like the EZvisa app. Documents
// are only accepted here or in the app, never over WhatsApp or email.
import { useRef, useState, type ReactNode } from "react"
import { BookUser, BriefcaseBusiness, Check, FileText, IdCard, Landmark, Loader2, Upload, UserRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
import { DashPill } from "@/components/dashboard/dash-pill"
import { DOC_FLAG, MAX_UPLOAD_BYTES, UPLOAD_MIME, type Requirement } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"

const DOC_TITLE: Record<string, CustomerKey> = {
  passportCopy: "docs.passportBio",
  residencyCopy: "docs.residency",
  photo: "docs.photo",
  bankStatement: "docs.bank",
  nocCertificate: "docs.noc",
}
const DOC_HINT: Record<string, CustomerKey> = {
  passportCopy: "docs.passportBioHint",
  photo: "docs.photoShort",
  bankStatement: "docs.bankStamped",
}
const DOC_ICON: Record<string, LucideIcon> = {
  passportCopy: BookUser,
  residencyCopy: IdCard,
  photo: UserRound,
  bankStatement: Landmark,
  nocCertificate: BriefcaseBusiness,
}

type RowState = { phase: "idle" | "uploading" | "done" | "error"; message?: string; fileName?: string }

function validate(file: File, arabic: boolean): string | null {
  const locale = arabic ? "ar" : "en"
  if (!(file.type in UPLOAD_MIME)) return customerText(locale, "docs.badType")
  if (file.size > MAX_UPLOAD_BYTES) return customerText(locale, "docs.tooBig")
  return null
}

function ChecklistRow({
  row,
  received,
  onUpload,
}: {
  row: Requirement
  received: boolean
  onUpload: (file: File, documentType: string) => Promise<void>
}) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<RowState>({ phase: "idle" })
  const [dragging, setDragging] = useState(false)
  const busy = state.phase === "uploading"
  const titleKey = DOC_TITLE[row.document_type]
  const hintKey = DOC_HINT[row.document_type]
  const title = arabic && titleKey ? customerText("ar", titleKey) : row.title
  const hint = arabic && hintKey ? customerText("ar", hintKey) : row.description || customerText(locale, "docs.fallback")
  const Icon = DOC_ICON[row.document_type] ?? FileText

  const send = async (file: File | undefined) => {
    if (!file || busy) return
    const problem = validate(file, arabic)
    if (problem) return setState({ phase: "error", message: problem })
    setState({ phase: "uploading", fileName: file.name })
    try {
      await onUpload(file, row.document_type)
      setState({ phase: "done", fileName: file.name })
    } catch (error) {
      setState({ phase: "error", message: arabic ? customerText("ar", "docs.failed") : error instanceof Error ? error.message : "The upload didn't go through. Try again." })
    } finally {
      if (input.current) input.current.value = ""
    }
  }

  const done = received || state.phase === "done"
  const inputId = `upload-${row.id}`

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        send(e.dataTransfer.files?.[0])
      }}
      className={cn("flex flex-col gap-2 border-t border-[#eef1f6] px-5 py-3.5 transition-colors", dragging && "bg-primary/5")}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
            busy ? "bg-primary/10 text-primary" : done ? "bg-[#e3f5e8] text-[#1a7f37]" : "bg-secondary text-muted-foreground",
          )}
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : done ? <Check className="size-5" strokeWidth={2.6} aria-hidden="true" /> : <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            {title}
            {done && !busy ? <DashPill tone="success" className="h-[22px]">{customerText(locale, "docs.received")}</DashPill> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {busy
              ? customerText(locale, "docs.uploading", { name: state.fileName ?? "" })
              : state.phase === "done"
                ? customerText(locale, "docs.uploaded", { name: state.fileName ?? "" })
                : hint}
          </span>
        </div>

        <input
          ref={input}
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => send(e.target.files?.[0])}
          disabled={busy}
        />
        <label
          htmlFor={inputId}
          aria-label={`${customerText(locale, done ? "docs.replace" : "docs.upload")} ${title}`}
          className={cn(
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary",
            busy && "pointer-events-none opacity-50",
            done ? "px-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground" : "border border-border bg-background text-foreground hover:bg-secondary",
          )}
        >
          {done ? customerText(locale, "docs.replace") : (
            <>
              <Upload className="size-[15px]" aria-hidden="true" />
              {customerText(locale, "docs.upload")}
            </>
          )}
        </label>
      </div>
      {state.phase === "error" ? (
        <p className="ps-[54px] text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </li>
  )
}

/** Segmented bar: one segment per required document. */
export function DocumentSegments({ received, total, label }: { received: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-[5px]" role="progressbar" aria-valuenow={received} aria-valuemin={0} aria-valuemax={total} aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 w-[34px] rounded-[3px]", i < received ? "bg-primary" : "bg-border")} />
      ))}
    </div>
  )
}

export function UploadChecklist({
  rows,
  status,
  onUpload,
  footer,
}: {
  rows: Requirement[]
  /** The application's has_* flags. */
  status: Record<string, unknown>
  onUpload: (file: File, documentType: string) => Promise<void>
  /** Shown under the rows, e.g. what EZvisa prepares. */
  footer?: ReactNode
}) {
  const locale = useSiteLocale()
  const received = rows.filter((r) => !!status[DOC_FLAG[r.document_type]]).length

  return (
    <section aria-label={customerText(locale, "docs.yours")} className="ez-dash-card">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-5">
        <div className="flex flex-col gap-1">
          <h2 className="ez-dash-section text-foreground">{customerText(locale, "docs.yours")}</h2>
          <p className="text-[13px] text-muted-foreground">{customerText(locale, "dash.docsHint", { n: received, total: rows.length })}</p>
        </div>
        <DocumentSegments received={received} total={rows.length} label={customerText(locale, "docs.progress")} />
      </div>
      <ul>
        {rows.map((row) => (
          <ChecklistRow key={row.id} row={row} received={!!status[DOC_FLAG[row.document_type]]} onUpload={onUpload} />
        ))}
      </ul>
      {footer}
    </section>
  )
}
