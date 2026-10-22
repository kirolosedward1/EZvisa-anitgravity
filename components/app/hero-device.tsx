"use client"

import { useRef } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { Pause, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Screen } from "./content"
import { IphoneFrame } from "./iphone-frame"
import { ScreenStack } from "./screen-stack"
import { useAutoCycle } from "./use-auto-cycle"
import { useMounted } from "./use-mounted"
import { useTilt } from "./use-tilt"

interface HeroDeviceProps {
  screens: Screen[]
  /** Width classes for the phone. */
  frameClassName: string
  sizes: string
  className?: string
}

/** The hero iPhone: auto-cycling screens with dots and a pause control, pointer tilt on desktop. */
export function HeroDevice({ screens, frameClassName, sizes, className }: HeroDeviceProps) {
  const reduce = useReducedMotion()
  const mounted = useMounted()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const cycle = useAutoCycle(screens.length, { enabled: !reduce, inView })
  const tilt = useTilt(5)
  const count = screens.length
  // Rendered on the server; only removed after mount so hydration markup matches.
  const showPause = !mounted || !reduce

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="carousel"
      aria-label="EZvisa app screens"
      className={cn("flex flex-col items-center gap-6", className)}
      onPointerEnter={() => cycle.setHovered(true)}
      onPointerLeave={() => cycle.setHovered(false)}
      onFocus={() => cycle.setHovered(true)}
      onBlur={() => cycle.setHovered(false)}
    >
      <motion.div
        className={frameClassName}
        style={tilt.enabled ? tilt.style : undefined}
        {...(tilt.enabled ? tilt.handlers : {})}
      >
        <IphoneFrame className="w-full">
          <ScreenStack screens={screens} active={cycle.index} mode="fade" sizes={sizes} priorityIndex={0} />
        </IphoneFrame>
      </motion.div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2" role="group" aria-label="Choose a screen">
          {screens.map((screen, index) => {
            const on = index === cycle.index
            return (
              <button
                key={screen.id}
                type="button"
                aria-label={`Show screen ${index + 1} of ${count}: ${screen.label}`}
                aria-current={on ? "true" : undefined}
                onClick={() => cycle.select(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  on ? "w-6 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/45",
                )}
              />
            )
          })}
        </div>
        {showPause && (
          <button
            type="button"
            aria-label={cycle.paused ? "Resume screen rotation" : "Pause screen rotation"}
            aria-pressed={cycle.paused}
            onClick={cycle.togglePause}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {cycle.paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  )
}
