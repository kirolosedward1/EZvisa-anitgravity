"use client"

import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { MotionConfig, motion, useInView } from "framer-motion"

import { cn } from "@/lib/utils"

/**
 * Honours the visitor's "reduce motion" setting for every motion component below it:
 * transforms are dropped and only the opacity fade remains.
 */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

type Phase = "static" | "hidden" | "shown"

const VIEW_MARGIN = "0px 0px -10% 0px"

/**
 * Gentle fade + slide-in the first time an element scrolls into view.
 *
 * Progressive enhancement: the server-rendered markup is fully visible, so the page
 * works without JavaScript and above-the-fold content never waits for hydration.
 * After mount, only elements that are outside the viewport are hidden and then
 * revealed when they scroll (vertically or horizontally) into view.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>("static")
  const inView = useInView(ref, { once: true, margin: VIEW_MARGIN })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const onScreen =
      rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0
    if (!onScreen) setPhase("hidden")
  }, [])

  useLayoutEffect(() => {
    if (inView) setPhase((current) => (current === "hidden" ? "shown" : current))
  }, [inView])

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={phase === "hidden" ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      transition={phase === "shown" ? { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
