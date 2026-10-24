"use client"

import { Image } from "@/components/image"
import { motion } from "framer-motion"

import { useTranslation } from "@/lib/translations/use-translation"
import type { Screen } from "./content"
import { REVEAL_EASE } from "./reveal"

interface ScreenStackProps {
  screens: Screen[]
  active: number
  /** "fade" crossfades; "slide" also parks inactive screens 6% to the side they logically sit on. */
  mode?: "fade" | "slide"
  /** `sizes` hint matching the rendered frame width. */
  sizes: string
  /** Index of the screen to preload eagerly (the hero's first screen). */
  priorityIndex?: number
}

/**
 * Every screen stays mounted (no re-decode flashes when switching); only the
 * active one is visible. Slide direction follows the reading direction.
 */
export function ScreenStack({ screens, active, mode = "fade", sizes, priorityIndex }: ScreenStackProps) {
  const { isRtl } = useTranslation()
  const sign = isRtl ? -1 : 1

  return (
    <div className="absolute inset-0">
      {screens.map((screen, index) => {
        const on = index === active
        const parked = index < active ? -6 : 6
        return (
          <motion.div
            key={screen.id}
            className="absolute inset-0"
            initial={false}
            animate={
              mode === "fade"
                ? { opacity: on ? 1 : 0 }
                : { opacity: on ? 1 : 0, x: on ? "0%" : `${sign * parked}%` }
            }
            transition={{ duration: 0.45, ease: REVEAL_EASE }}
            style={{ zIndex: on ? 1 : 0 }}
            aria-hidden={!on}
          >
            <Image
              src={screen.src}
              alt={screen.alt}
              fill
              sizes={sizes}
              priority={index === priorityIndex}
              className="object-cover"
            />
          </motion.div>
        )
      })}
    </div>
  )
}
