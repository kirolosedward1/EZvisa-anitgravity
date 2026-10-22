"use client"

import { useCallback, useEffect, useState } from "react"

interface AutoCycleOptions {
  /** Milliseconds between screens. */
  interval?: number
  /** False under reduced motion. */
  enabled: boolean
  /** Only cycle while the device is actually on screen. */
  inView: boolean
}

/**
 * Rotates through `count` items. Pauses while hovered or focused, while the tab is hidden,
 * while off-screen, and permanently once the visitor picks an item or presses pause.
 */
export function useAutoCycle(count: number, { interval = 4500, enabled, inView }: AutoCycleOptions) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === "visible")
    onVisibility() // the page may have mounted in a background tab
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  // Hover and keyboard focus are tracked separately so ending one never resumes the cycle while the other is active.
  const running = enabled && inView && tabVisible && !paused && !hovered && !focused

  useEffect(() => {
    if (!running || count < 2) return
    const id = window.setInterval(() => setIndex((current) => (current + 1) % count), interval)
    return () => window.clearInterval(id)
  }, [running, count, interval])

  const select = useCallback((next: number) => {
    setIndex(next)
    setPaused(true)
  }, [])

  const togglePause = useCallback(() => setPaused((current) => !current), [])

  return { index, select, running, paused, togglePause, setHovered, setFocused }
}
