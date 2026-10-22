"use client"

import { useEffect, useState } from "react"

/**
 * False during server rendering and hydration, true afterwards. Use it to keep markup that
 * depends on browser-only state (reduced motion, pointer type) identical on both sides of
 * hydration and only branch once the component is on screen.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
