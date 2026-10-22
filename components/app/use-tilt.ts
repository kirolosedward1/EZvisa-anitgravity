"use client"

import { type PointerEvent, useEffect, useRef, useState } from "react"
import { useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion"

/**
 * Pointer-driven 3D tilt for a device mockup. Enabled only for mouse-style pointers
 * (`hover: hover` and `pointer: fine`) and when the visitor has not asked for reduced motion.
 * The element's rect is read once per hover, never per move.
 */
export function useTilt(maxDegrees = 5) {
  const reduce = useReducedMotion()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setEnabled(query.matches && !reduce)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [reduce])

  const px = useMotionValue(0) // -0.5 .. 0.5 across the element
  const py = useMotionValue(0)
  const spring = { stiffness: 120, damping: 18, mass: 0.6 }
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxDegrees, maxDegrees]), spring)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxDegrees, -maxDegrees]), spring)
  const rect = useRef<DOMRect | null>(null)

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    rect.current = event.currentTarget.getBoundingClientRect()
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || !rect.current) return
    const r = rect.current
    px.set((event.clientX - r.left) / r.width - 0.5)
    py.set((event.clientY - r.top) / r.height - 0.5)
  }
  const onPointerLeave = () => {
    px.set(0)
    py.set(0)
    rect.current = null
  }

  return {
    enabled,
    style: { rotateX, rotateY, transformPerspective: 1200 },
    handlers: { onPointerEnter, onPointerMove, onPointerLeave },
  }
}
