"use client"

import { useState } from "react"
import { useSiteLocale } from "@/components/locale-provider"
import { customerText } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"
import type { ActivityTone } from "@/lib/application-events"

export type ActivityLine = { id: string; tone: ActivityTone; title: string; meta: string; titleAuto?: boolean }

const DOT: Record<ActivityTone, string> = { blue: "bg-primary", amber: "bg-[#d98a00]", green: "bg-[#1a7f37]", neutral: "bg-[#c9d4e5]" }
const FIRST = 5

/** The activity timeline: newest first, five lines until "Show all activity". */
export function ActivityList({ lines }: { lines: ActivityLine[] }) {
  const locale = useSiteLocale()
  const [all, setAll] = useState(false)
  const shown = all ? lines : lines.slice(0, FIRST)
  return (
    <>
      <ol id="activity-list">
        {shown.map((line, index) => (
          <li key={line.id} className="relative grid grid-cols-[10px_minmax(0,1fr)] gap-x-3 pb-3.5">
            {index < shown.length - 1 ? <span className="absolute start-1 top-4 bottom-0 w-0.5 bg-[#eef1f6]" aria-hidden="true" /> : null}
            <span className={cn("relative z-[1] mt-[5px] size-2.5 rounded-full", DOT[line.tone])} aria-hidden="true" />
            <span className="flex min-w-0 flex-col gap-0.5 text-[13px]">
              <span className="font-medium text-foreground">{line.title}</span>
              <span className="text-muted-foreground">{line.meta}</span>
            </span>
          </li>
        ))}
      </ol>
      {lines.length > FIRST ? (
        <button
          type="button"
          aria-expanded={all}
          aria-controls="activity-list"
          onClick={() => setAll((v) => !v)}
          className="mb-2.5 self-start rounded text-[13px] font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {customerText(locale, all ? "act.showLess" : "act.showAll")}
        </button>
      ) : null}
    </>
  )
}
