"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import type { InsurancePreference } from "@/lib/insurance"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"

/**
 * Travel insurance as one quiet row. Change (or Get a quote) opens the two choices in place; saving still goes through
 * POST /api/insurance, which only records a preference and never buys a policy.
 */
export function InsuranceCard({ applicationId, initialValue, arabic }: {
  applicationId: string
  initialValue?: InsurancePreference
  arabic: boolean
}) {
  const router = useRouter()
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey) => customerText(locale, key)
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(initialValue)
  const [saved, setSaved] = useState(initialValue)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [failed, setFailed] = useState(false)
  const panelId = `insurance-choices-${applicationId}`

  async function save() {
    if (!choice || pending) return
    setPending(true)
    setFeedback("")
    setFailed(false)
    try {
      // The public sandbox must never write a real application or imply a submitted quote.
      if (applicationId.startsWith("demo-")) {
        setFeedback(t("ins.demo"))
        return
      }
      const response = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, preference: choice }),
      })
      if (!response.ok) throw new Error("save_failed")
      setSaved(choice)
      setFeedback(t("ins.savedMsg"))
      setOpen(false)
      router.refresh()
    } catch {
      setFailed(true)
      setFeedback(t("ins.failed"))
    } finally { setPending(false) }
  }

  const openWith = (value?: InsurancePreference) => {
    if (value) setChoice(value)
    setFeedback("")
    setOpen(true)
  }

  return (
    <section id="insurance" className="ez-dash-card px-5 py-[18px]" aria-label={t("step.insurance")}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#edf4ff] text-primary">
          <ShieldCheck className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
          <h2 className="ez-dash-row-title text-foreground">{t(saved === "own" ? "ins.titleOwn" : saved === "quote" ? "ins.titleQuote" : "ins.titleNone")}</h2>
          <p className="text-[13px] text-muted-foreground">{t(saved === "own" ? "ins.bodyOwn" : saved === "quote" ? "ins.bodyQuote" : "ins.bodyNone")}</p>
        </div>
        {!open && (
          <div className="flex flex-wrap items-center gap-1.5">
            {saved !== "quote" && (
              <button type="button" onClick={() => openWith("quote")} aria-controls={panelId} aria-expanded={false} className="inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                {t("ins.getQuote")}
              </button>
            )}
            <button type="button" onClick={() => openWith()} aria-controls={panelId} aria-expanded={false} className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              {t(saved ? "ins.change" : "ins.choose")}
            </button>
          </div>
        )}
      </div>

      {open && (
        <div id={panelId} className="mt-4 flex flex-col gap-3 border-t border-[#eef1f6] pt-4">
          <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-3 text-sm text-muted-foreground">{t("ins.question")}</legend>
            {([
              { value: "quote", title: t("ins.quoteTitle"), description: t("ins.quoteBody") },
              { value: "own", title: t("ins.ownTitle"), description: t("ins.ownBody") },
            ] as const).map((option) => (
              <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary", choice === option.value ? "border-primary bg-[#edf4ff]" : "border-border")}>
                <input type="radio" name={`insurance-${applicationId}`} value={option.value} checked={choice === option.value} onChange={() => { setChoice(option.value); setFeedback("") }} className="mt-1 size-4 shrink-0 accent-primary" />
                <span><span className="block text-sm font-medium">{option.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{option.description}</span></span>
              </label>
            ))}
          </fieldset>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("ins.note")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={!choice || pending || choice === saved} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-default disabled:opacity-50">
              {pending ? t("ins.saving") : choice && choice === saved ? t("ins.saved") : t("ins.save")}
            </button>
            <button type="button" onClick={() => { setOpen(false); setChoice(saved); setFeedback("") }} className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              {t("ins.close")}
            </button>
          </div>
        </div>
      )}
      {feedback && <p role={failed ? "alert" : "status"} className={cn("mt-3 text-sm", failed ? "text-destructive" : "text-muted-foreground")}>{feedback}</p>}
    </section>
  )
}
