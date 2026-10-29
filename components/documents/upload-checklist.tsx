"use client"

// The customer's document checklist, where every row is its own upload target: choose a file (or drop one on the
// row) and it uploads straight away. Used by the signed-in desk (/dashboard/upload) and the tracking-link desk
// (/track/[token]/upload); both send to POST /api/upload-document like the EZvisa app. Documents are only accepted
// here or in the app, never over WhatsApp or email.
import { useRef, useState } from "react"
import { Check, Loader2, Upload } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
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
      className={cn("flex flex-col gap-2 px-5 py-4 transition-colors sm:px-6", dragging && "bg-primary/5")}
    >
      <div className="flex items-center gap-4">
        {busy ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          </span>
        ) : done ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : (
          <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-border" aria-hidden="true" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {busy
              ? customerText(locale, "docs.uploading", { name: state.fileName ?? "" })
              : state.phase === "done"
                ? customerText(locale, "docs.uploaded", { name: state.fileName ?? "" })
                : done
                  ? customerText(locale, "docs.received")
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
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
            busy && "pointer-events-none opacity-50",
            done ? "text-muted-foreground hover:bg-secondary hover:text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {done ? customerText(locale, "docs.replace") : (
            <>
              <Upload className="size-4" aria-hidden="true" />
              {customerText(locale, "docs.upload")}
            </>
          )}
        </label>
      </div>
      {state.phase === "error" ? (
        <p className="ps-11 text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </li>
  )
}

export function UploadChecklist({
  rows,
  status,
  onUpload,
}: {
  rows: Requirement[]
  /** The application's has_* flags. */
  status: Record<string, unknown>
  onUpload: (file: File, documentType: string) => Promise<void>
}) {
  const locale = useSiteLocale()
  const received = rows.filter((r) => !!status[DOC_FLAG[r.document_type]]).length
  const percent = rows.length ? Math.round((received / rows.length) * 100) : 0

  return (
    <section aria-label={customerText(locale, "docs.yours")} className="ez-document-panel">
      <div className="flex flex-col gap-3 px-5 pb-2 pt-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="panel-title text-foreground">{customerText(locale, "docs.yours")}</h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {customerText(locale, "docs.count", { n: received, total: rows.length })}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={received} aria-valuemin={0} aria-valuemax={rows.length} aria-label={customerText(locale, "docs.progress")}>
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-border/60 pb-1">
        {rows.map((row) => (
          <ChecklistRow key={row.id} row={row} received={!!status[DOC_FLAG[row.document_type]]} onUpload={onUpload} />
        ))}
      </ul>
    </section>
  )
}
