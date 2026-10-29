"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** Opt-in motion, without a client wrapper around streamed page content. */
export function SiteMotion() {
  const pathname = usePathname()

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (preference.matches || !("IntersectionObserver" in window) || !("animate" in HTMLElement.prototype)) return

    const seen = new WeakSet<HTMLElement>()
    const running = new Map<HTMLElement, Animation>()
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const element = entry.target as HTMLElement
        observer.unobserve(element)
        // Anchor navigation and keyboard focus should never wait for an entrance.
        if (entry.boundingClientRect.bottom <= 0 || element.matches(":focus-within")) continue
        const group = element.parentElement?.hasAttribute("data-site-stagger") ? element.parentElement : null
        const index = group ? [...group.children].indexOf(element) : 0
        const delay = Math.min(index % 4 * 60 + Number(element.dataset.siteDelay || 0), 180)
        const kind = element.dataset.siteReveal
        const frames: Keyframe[] = kind === "media"
          ? [{ opacity: .65, clipPath: "inset(0 0 8% 0)" }, { opacity: 1, clipPath: "inset(0)" }]
          : kind === "fade"
            ? [{ opacity: .5 }, { opacity: 1 }]
            : [{ opacity: .4, translate: "0 16px" }, { opacity: 1, translate: "0 0" }]
        const animation = element.animate(frames, {
          duration: kind === "media" ? 700 : kind === "fade" ? 420 : 560,
          delay,
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "backwards",
        })
        running.set(element, animation)
        animation.onfinish = () => running.delete(element)
      }
    }, { threshold: .08 })

    const register = (root: ParentNode) => {
      const targets = [...root.querySelectorAll<HTMLElement>("[data-site-reveal]")]
      if (root instanceof HTMLElement && root.hasAttribute("data-site-reveal")) targets.unshift(root)
      for (const element of targets) {
        if (seen.has(element)) continue
        seen.add(element)
        observer.observe(element)
      }
    }
    register(document)
    // Also cover streamed sections and newly filtered catalogue/journal results.
    const mutations = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof HTMLElement) register(node)
      }
      running.forEach((animation, element) => {
        if (!element.isConnected) { animation.cancel(); running.delete(element) }
      })
    })
    mutations.observe(document.body, { childList: true, subtree: true })
    const stop = () => {
      observer.disconnect()
      mutations.disconnect()
      running.forEach(animation => animation.cancel())
      running.clear()
    }
    const onPreference = () => { if (preference.matches) stop() }
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return
      running.forEach((animation, element) => {
        if (element.contains(event.target as Node)) { animation.cancel(); running.delete(element) }
      })
    }
    preference.addEventListener("change", onPreference)
    document.addEventListener("focusin", onFocus)
    return () => {
      stop()
      preference.removeEventListener("change", onPreference)
      document.removeEventListener("focusin", onFocus)
    }
  }, [pathname])

  return null
}
