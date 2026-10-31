"use client"

// Opens the user guide at the section in the address (#cases, #files…), after the page has rendered: the browser's own
// jump can be undone by the app's scroll handling on arrival.
import { useEffect } from "react"

export function GuideScroll() {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      const el = document.querySelector(`.guide [id="${CSS.escape(id)}"]`)
      if (el) el.scrollIntoView({ block: "start" })
    }
    const t = window.setTimeout(go, 60)
    window.addEventListener("hashchange", go)
    return () => { window.clearTimeout(t); window.removeEventListener("hashchange", go) }
  }, [])
  return null
}
