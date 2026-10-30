"use client"

// The customer's document checklist, where every row is its own upload target: choose a file (or drop one on the
// row) and it uploads straight away. Used by the dashboard case page (compact rows) and both upload desks
// (/dashboard/upload and /track/[token]/upload, full rows with drop zones, file and the specialist's note). All send
// to POST /api/upload-document like the EZvisa app. Documents are only accepted here or in the app, never over
// WhatsApp or email.
import { useRef, useState, type ReactNode } from "react"
import { format, parseISO } from "date-fns"
import { AlertCircle, BookUser, BriefcaseBusiness, Check, Clock, FileText, IdCard, Landmark, Loader2, Upload, UserRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
import { ArabicDate } from "@/components/arabic-date"
import { DashPill } from "@/components/dashboard/dash-pill"
import { DOC_TITLE_KEY } from "@/lib/dashboard-state"
import { isRowIn, latestUpload, rowState, type DocumentReviews, type RowState, type UploadRecord } from "@/lib/document-reviews"
import { DOC_FLAG, MAX_UPLOAD_BYTES, UPLOAD_MIME, type Requirement } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"

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
const STATE_PILL: Partial<Record<RowState, { tone: "success" | "info" | "warning"; key: CustomerKey }>> = {
  received: { tone: "success", key: "docs.received" },
  approved: { tone: "success", key: "docs.approved" },
  checking: { tone: "info", key: "docs.checking" },
  rejected: { tone: "warning", key: "docs.needsNew" },
}

type Variant = "compact" | "desk"
type Phase = { phase: "idle" | "uploading" | "done" | "error"; message?: string; fileName?: string }

function validate(file: File, arabic: boolean): string | null {
  const locale = arabic ? "ar" : "en"
  if (!(file.type in UPLOAD_MIME)) return customerText(locale, "docs.badType")
  if (file.size > MAX_UPLOAD_BYTES) return customerText(locale, "docs.tooBig")
  return null
}

function UploadTime({ at, arabic }: { at: string; arabic: boolean }) {
  return arabic ? <ArabicDate value={at} withTime /> : <>{format(parseISO(at), "d MMM, HH:mm")}</>
}

function ChecklistRow({
  row,
  state: serverState,
  upload,
  note,
  variant,
  onUpload,
}: {
  row: Requirement
  state: RowState
  upload?: UploadRecord
  note?: string | null
  variant: Variant
  onUpload: (file: File, documentType: string) => Promise<void>
}) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const input = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ phase: "idle" })
  const [dragging, setDragging] = useState(false)
  const busy = phase.phase === "uploading"
  const titleKey = DOC_TITLE_KEY[row.document_type]
  const hintKey = DOC_HINT[row.document_type]
  const title = arabic && titleKey ? t(titleKey) : row.title
  const hint = arabic && hintKey ? t(hintKey) : row.description || t("docs.fallback")
  const Icon = DOC_ICON[row.document_type] ?? FileText
  // A file sent in this visit puts the row back in the queue until the page reloads its state.
  const state: RowState = phase.phase === "done" ? "received" : serverState
  const isIn = isRowIn(state)
  const rejected = state === "rejected"
  const pill = STATE_PILL[state]
  const inputId = `upload-${row.id}`

  const send = async (file: File | undefined) => {
    if (!file || busy) return
    const problem = validate(file, arabic)
    if (problem) return setPhase({ phase: "error", message: problem })
    setPhase({ phase: "uploading", fileName: file.name })
    try {
      await onUpload(file, row.document_type)
      setPhase({ phase: "done", fileName: file.name })
    } catch (error) {
      setPhase({ phase: "error", message: arabic ? t("docs.failed") : error instanceof Error ? error.message : "The upload didn't go through. Try again." })
    } finally {
      if (input.current) input.current.value = ""
    }
  }

  const tile = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[10px]",
        variant === "desk" ? "size-11" : "size-10",
        busy ? "bg-primary/10 text-primary" : rejected ? "bg-[#fff4de] text-[#7a4b00]" : state === "checking" ? "bg-[#edf4ff] text-primary" : isIn ? "bg-[#e3f5e8] text-[#1a7f37]" : "bg-secondary text-muted-foreground",
      )}
    >
      {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        : rejected ? <AlertCircle className="size-5" aria-hidden="true" />
        : state === "checking" ? <Clock className="size-5" aria-hidden="true" />
        : isIn ? <Check className="size-5" strokeWidth={2.6} aria-hidden="true" />
        : <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />}
    </span>
  )

  // The visible button. It is a <label> for the hidden file input, so keyboard users reach the input itself.
  const action = (
    <label
      htmlFor={inputId}
      aria-label={`${t(isIn ? "docs.replace" : rejected ? "docs.uploadNew" : "docs.upload")} ${title}`}
      className={cn(
        "ez-upload-action inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
        variant === "desk" ? "h-[38px] px-4" : "h-9 px-3.5",
        busy && "pointer-events-none opacity-50",
        rejected ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : isIn ? "px-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          : "border border-border bg-background text-foreground hover:bg-secondary",
      )}
    >
      {isIn ? t("docs.replace") : rejected ? <><Upload className="size-[15px]" aria-hidden="true" />{t("docs.uploadNew")}</> : variant === "desk" ? t("docs.choose") : <><Upload className="size-[15px]" aria-hidden="true" />{t("docs.upload")}</>}
    </label>
  )

  const status = busy
    ? t("docs.uploading", { name: phase.fileName ?? "" })
    : phase.phase === "done"
      ? t("docs.uploaded", { name: phase.fileName ?? "" })
      : null

  const noteText = rejected && note ? (
    <p className="text-[13px] leading-relaxed text-[#7a4b00]">
      <span className="font-medium">{t("docs.noteLabel")}</span> <bdi dir="auto">{note}</bdi>
    </p>
  ) : null

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
      className={cn("ez-upload-row border-t border-[#eef1f6] transition-colors", dragging && "bg-primary/5", rejected && !dragging && "bg-[#fffaf0]")}
    >
      <input
        ref={input}
        id={inputId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        aria-label={title}
        className="sr-only"
        onChange={(e) => send(e.target.files?.[0])}
        disabled={busy}
      />
      {variant === "compact" ? (
        <div className="flex flex-col gap-2 px-5 py-3.5">
          <div className="flex items-center gap-3.5">
            {tile}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                {title}
                {pill && !busy ? <DashPill tone={pill.tone} className="h-[22px]">{t(pill.key)}</DashPill> : null}
              </span>
              <span className="truncate text-xs text-muted-foreground">{status ?? hint}</span>
            </div>
            {state !== "approved" ? action : null}
          </div>
          {noteText ? <div className="ps-[54px]">{noteText}</div> : null}
        </div>
      ) : (
        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-5 py-[18px] sm:grid-cols-[44px_minmax(0,1fr)_auto]">
          {tile}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2.5 text-[15px] font-medium text-foreground">
              {title}
              {pill && !busy ? <DashPill tone={pill.tone}>{t(pill.key)}</DashPill> : null}
            </span>
            {noteText}
            {!isIn && !rejected && !status ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
            {status ? <p className="text-[13px] text-muted-foreground">{status}</p> : null}
            {isIn && upload && !status ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#edf4ff] text-primary">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground ltr-isolate">{upload.name || title}</span>
                <span className="shrink-0 text-muted-foreground"><UploadTime at={upload.at} arabic={arabic} /></span>
              </div>
            ) : null}
            {!isIn && !busy ? (
              <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-[#c9d4e5] bg-[#fafbfe] px-3.5 py-2.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                <Upload className="size-4" aria-hidden="true" />
                {t(rejected ? "docs.dropNew" : "docs.drop")}
              </label>
            ) : null}
          </div>
          <div className="col-start-2 flex sm:col-start-auto">{state !== "approved" ? action : null}</div>
        </div>
      )}
      {phase.phase === "error" ? (
        <p className="px-5 pb-3 ps-[74px] text-xs text-destructive" role="alert">
          {phase.message}
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

export function checklistRows(rows: Requirement[], status: Record<string, unknown>, reviews?: DocumentReviews, uploads?: UploadRecord[]) {
  return rows.map((row) => ({ row, state: rowState(row.document_type, !!status[DOC_FLAG[row.document_type]], reviews, uploads) }))
}

export function UploadChecklist({
  rows,
  status,
  onUpload,
  footer,
  intro,
  variant = "compact",
  reviews,
  uploads,
}: {
  rows: Requirement[]
  /** The application's has_* flags. */
  status: Record<string, unknown>
  onUpload: (file: File, documentType: string) => Promise<void>
  /** Shown under the rows, e.g. what EZvisa prepares or the privacy note. */
  footer?: ReactNode
  /** Desk only: replaces the heading with a short instruction. */
  intro?: ReactNode
  variant?: Variant
  reviews?: DocumentReviews
  uploads?: UploadRecord[]
}) {
  const locale = useSiteLocale()
  const states = checklistRows(rows, status, reviews, uploads)
  const received = states.filter((s) => isRowIn(s.state)).length

  return (
    <section aria-label={customerText(locale, "docs.yours")} className="ez-dash-card overflow-hidden">
      {intro ?? (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-5">
          <div className="flex flex-col gap-1">
            <h2 className="ez-dash-section text-foreground">{customerText(locale, "docs.yours")}</h2>
            <p className="text-[13px] text-muted-foreground">{customerText(locale, "dash.docsHint", { n: received, total: rows.length })}</p>
          </div>
          <DocumentSegments received={received} total={rows.length} label={customerText(locale, "docs.progress")} />
        </div>
      )}
      <ul>
        {states.map(({ row, state }) => (
          <ChecklistRow
            key={row.id}
            row={row}
            state={state}
            upload={latestUpload(uploads, row.document_type)}
            note={reviews?.[row.document_type]?.note}
            variant={variant}
            onUpload={onUpload}
          />
        ))}
      </ul>
      {footer}
    </section>
  )
}
