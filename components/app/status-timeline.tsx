"use client"

import { useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import type { StatusStep } from "./content"
import { type RevealPhase, useRevealPhase } from "./reveal"
import { useMounted } from "./use-mounted"

interface StatusTimelineProps {
  steps: StatusStep[]
  caption?: string
  className?: string
}

const list = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.35, delayChildren: 0.15 } },
}
const item = { hidden: {}, shown: {} }
const dot = {
  hidden: { scale: 0 },
  shown: { scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 22 } },
}
const tick = {
  hidden: { pathLength: 0 },
  shown: { pathLength: 1, transition: { duration: 0.35, delay: 0.12, ease: "easeOut" as const } },
}
const line = {
  hidden: { scaleY: 0 },
  shown: { scaleY: 1, transition: { duration: 0.3, delay: 0.1, ease: "easeOut" as const } },
}
const text = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } },
}

/**
 * A status card in the app's own style. Steps check off in sequence the first time it
 * scrolls into view; the server renders it complete, so it reads fine without JavaScript.
 */
export function StatusTimeline({ steps, caption, className }: StatusTimelineProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const mounted = useMounted()
  const base = useRevealPhase(ref)
  const [override, setOverride] = useState<RevealPhase | null>(null)
  // Under reduced motion the card always renders complete: opacity fades and the tick drawing are
  // not transforms, so MotionConfig alone would still sequence them.
  const phase: RevealPhase = reduce ? "static" : (override ?? base)
  // Rendered on the server; only removed after mount so hydration markup matches.
  const showReplay = !mounted || !reduce

  const replay = () => {
    setOverride("hidden")
    requestAnimationFrame(() => requestAnimationFrame(() => setOverride("shown")))
  }

  return (
    <div ref={ref} className={cn("rounded-3xl bg-muted p-6 sm:p-8", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Status</span>
        {showReplay && (
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Replay
          </button>
        )}
      </div>

      <motion.ol
        initial={false}
        animate={phase === "hidden" ? "hidden" : "shown"}
        variants={list}
        className="mt-4 flex flex-col"
        aria-label="Example status timeline"
      >
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <motion.li key={step.label} variants={item} className="relative flex items-center gap-4 py-3">
              {!last && (
                <span className="absolute start-3 top-9 h-full w-px bg-border" aria-hidden="true">
                  <motion.span variants={line} className="absolute inset-0 origin-top bg-primary" />
                </span>
              )}
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background">
                <motion.span variants={dot} className="absolute inset-0 rounded-full bg-primary" />
                <svg
                  viewBox="0 0 24 24"
                  className="relative h-3.5 w-3.5 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <motion.path variants={tick} d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <span className="flex-1 font-medium text-foreground">{step.label}</span>
              <motion.span variants={text} className="text-end text-sm tabular-nums text-muted-foreground">
                {step.detail}
              </motion.span>
            </motion.li>
          )
        })}
      </motion.ol>

      {caption && <p className="mt-4 text-xs text-muted-foreground">{caption}</p>}
    </div>
  )
}
