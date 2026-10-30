"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"

export type ChecklistItem = { id: string; label: CustomerKey; hint?: CustomerKey; link?: { href: string; label: CustomerKey }; done?: boolean }

/**
 * "Before your appointment". Items the case already proves (file downloaded, appointment saved) are ticked and fixed;
 * the rest are the customer's own ticks, kept in this browser only.
 */
export function AppointmentChecklist({ caseId, items }: { caseId: string; items: ChecklistItem[] }) {
  const locale = useSiteLocale()
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const storageKey = `ez-appointment-checklist:${caseId}`
  const [ticked, setTicked] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]")
      if (Array.isArray(saved)) setTicked(saved.filter((v) => typeof v === "string"))
    } catch {
      // Private mode or blocked storage: ticks just don't persist.
    }
  }, [storageKey])

  const toggle = (id: string) => {
    setTicked((current) => {
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id]
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const isDone = (item: ChecklistItem) => item.done || ticked.includes(item.id)
  const done = items.filter(isDone).length

  return (
    <section aria-labelledby="appt-check-title" className="ez-dash-card overflow-hidden">
      <div className="flex flex-col gap-1 px-5 pb-3 pt-[18px]">
        <h2 id="appt-check-title" className="ez-dash-section text-foreground">{t("apptc.checkTitle")}</h2>
        <p className="text-sm text-muted-foreground" aria-live="polite">{t("apptc.checkCount", { done, total: items.length })}</p>
      </div>
      <ul>
        {items.map((item) => {
          const checked = isDone(item)
          return (
            <li key={item.id} className="flex items-start gap-3 border-t border-[#eef1f6] px-5 py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-labelledby={`appt-item-${item.id}`}
                disabled={item.done}
                onClick={() => toggle(item.id)}
                className={cn(
                  "mt-px flex size-[22px] shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  checked ? "border-primary bg-primary text-white" : "border-[#c9d4e5] bg-white hover:border-primary",
                  item.done && "cursor-default",
                )}
              >
                {checked ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : null}
              </button>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id={`appt-item-${item.id}`} className={cn("text-sm", checked ? "text-muted-foreground line-through decoration-[#c9d4e5]" : "font-medium text-foreground")}>
                  {t(item.label)}
                </span>
                {item.hint ? <span className="text-xs text-muted-foreground">{t(item.hint)}</span> : null}
              </span>
              {item.link && !checked ? (
                <LocaleLink href={item.link.href} className="shrink-0 text-[13px] font-medium text-primary hover:underline">
                  {t(item.link.label)}
                </LocaleLink>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
