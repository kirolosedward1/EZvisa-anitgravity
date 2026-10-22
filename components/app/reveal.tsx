"use client"

import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react"
import { MotionConfig, motion, useInView } from "framer-motion"

import { cn } from "@/lib/utils"

/** Shared easing for every reveal on the page. */
export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const

/**
 * Honours the visitor's "reduce motion" setting for every motion component below it:
 * transforms are dropped and only the opacity fade remains.
 */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

export type RevealPhase = "static" | "hidden" | "shown"

const VIEW_MARGIN = "0px 0px -10% 0px"

/**
 * Progressive-enhancement reveal state for an element.
 *
 * "static": server render and on-screen-at-mount elements; render the final state, never animate.
 * "hidden": the element was off-screen when the page mounted; render its initial state.
 * "shown":  it has since scrolled into view; animate to the final state.
 *
 * The page therefore works without JavaScript and above-the-fold content never waits for hydration.
 */
export function useRevealPhase(ref: RefObject<HTMLElement | null>, margin: string = VIEW_MARGIN): RevealPhase {
  const [phase, setPhase] = useState<RevealPhase>("static")
  const inView = useInView(ref, { once: true, margin: margin as `${number}px ${number}px ${number}% ${number}px` })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const onScreen =
      rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0
    if (!onScreen) setPhase("hidden")
  }, [ref])

  useLayoutEffect(() => {
    if (inView) setPhase((current) => (current === "hidden" ? "shown" : current))
  }, [inView])

  return phase
}

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

/** Gentle fade + slide-in the first time an element scrolls into view. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const phase = useRevealPhase(ref)

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={phase === "hidden" ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      transition={phase === "shown" ? { duration: 0.5, delay, ease: REVEAL_EASE } : { duration: 0 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
