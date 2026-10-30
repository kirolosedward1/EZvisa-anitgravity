"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Progress card below 1024px: a compact step rail by default, the full timeline when expanded. Both are rendered on
 * the server and passed in; this only toggles between them.
 */
export function ProgressCollapsible({ title, position, rail, timeline }: { title: string; position: string; rail: ReactNode; timeline: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className="ez-dash-card">
      <h2 id={`${id}-title`} className="ez-dash-panel">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 pb-3 pt-3.5 text-start text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
        >
          <span>{title}</span>
          <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
            {position}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </span>
        </button>
      </h2>
      <div id={`${id}-body`} className="px-4 pb-4">
        {open ? timeline : rail}
      </div>
    </section>
  )
}
