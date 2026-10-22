"use client"

import { AlertCircle, Check, CloudOff, Loader2 } from "lucide-react"
import type { DraftConflict, DraftSyncStatus } from "@/lib/draft-sync"

/** Autosave status. "Saved" only after the server confirmed the answers on screen. */
export function DraftStatus({ status, signedIn, savedLocally, onRetry }: { status: DraftSyncStatus; signedIn: boolean; savedLocally: boolean; onRetry: () => void }) {
  if (!signedIn || status === "local") {
    return savedLocally ? (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Check className="size-3" aria-hidden />
        Saved in this browser
      </span>
    ) : null
  }
  if (status === "conflict") return null
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground" role="status">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Saving…
      </span>
    )
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground" role="status">
        <Check className="size-3 text-primary" aria-hidden />
        Saved
      </span>
    )
  const text = status === "offline" ? "Not saved · Offline" : status === "retrying" ? "Not saved · Retrying" : "Not saved · Retry"
  return (
    <button type="button" onClick={onRetry} disabled={status === "offline"} className="inline-flex items-center gap-1 font-medium text-destructive disabled:cursor-default" role="status">
      {status === "offline" ? <CloudOff className="size-3" aria-hidden /> : <AlertCircle className="size-3" aria-hidden />}
      {text}
    </button>
  )
}

/** Asks which copy to keep when the draft changed in the app or another browser. Nothing is overwritten without a choice. */
export function DraftConflictDialog({ conflict, onChoose }: { conflict: DraftConflict | null; onChoose: (choice: "server" | "mine" | "discard") => void }) {
  if (!conflict) return null
  const s = conflict.server
  const where = s?.editedOn === "app" ? "in the EZvisa app" : "on another device"
  const when = s?.updatedAt ? new Date(s.updatedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""
  const copy =
    conflict.reason === "newer"
      ? { title: "Newer version found", body: `This application was changed ${where}${when ? ` (${when})` : ""}.`, main: "Load newer version", alt: "Keep this version" }
      : conflict.reason === "existing"
        ? { title: "Application in progress", body: `You already have a ${String(s?.wizard.destination ?? "")} application saved to your account.`, main: "Continue it", alt: "Start a separate one" }
        : conflict.reason === "closed"
          ? { title: "Already submitted", body: `This application was submitted ${where}.`, main: "Open dashboard", alt: null }
          : { title: "Draft removed", body: `This draft was discarded ${where}.`, main: "Save as new", alt: "Discard" }
  const main = () => onChoose(conflict.reason === "gone" ? "mine" : "server")
  const alt = () => onChoose(conflict.reason === "gone" ? "discard" : "mine")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-labelledby="draft-conflict-title">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex flex-col gap-2">
          <h3 id="draft-conflict-title" className="text-xl font-semibold leading-tight tracking-tight text-foreground">
            {copy.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>
        <div className={`flex flex-col-reverse gap-3 sm:grid ${copy.alt ? "sm:grid-cols-2" : ""}`}>
          {copy.alt && (
            <button type="button" onClick={alt} className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-secondary text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              {copy.alt}
            </button>
          )}
          <button type="button" onClick={main} className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            {copy.main}
          </button>
        </div>
      </div>
    </div>
  )
}
