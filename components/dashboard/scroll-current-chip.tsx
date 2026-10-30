"use client"

import { useEffect, useRef } from "react"

/** Below 1024px the switcher scrolls sideways: bring the open application's chip into view on load. */
export function ScrollCurrentChip() {
  const marker = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const nav = marker.current?.closest("nav")
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return
    const navBox = nav.getBoundingClientRect()
    const box = current.getBoundingClientRect()
    nav.scrollLeft += box.left + box.width / 2 - (navBox.left + navBox.width / 2)
  }, [])
  return <span ref={marker} hidden />
}
