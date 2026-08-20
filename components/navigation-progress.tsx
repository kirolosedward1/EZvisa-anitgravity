"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

function NavigationProgressBarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null)

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current)

    setLoading(true)
    setProgress(15)

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 85
        }
        return prev + Math.max(1, Math.floor((90 - prev) * 0.1))
      })
    }, 120)
  }

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)

    finishTimerRef.current = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 100)
  }

  // Intercept all internal anchor clicks for immediate feedback on user click
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return

      const href = target.getAttribute("href")
      if (!href) return

      // Skip external links, hash-only links, or same-page targets
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank"
      ) {
        return
      }

      // Check if navigating to a different pathname/search
      const currentUrl = window.location.pathname + window.location.search
      if (href !== currentUrl) {
        startProgress()
      }
    }

    document.addEventListener("click", handleAnchorClick, { capture: true })
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true })
    }
  }, [])

  // When pathname or searchParams finish updating in Next.js, complete the progress bar
  useEffect(() => {
    completeProgress()
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
          transition: progress === 100 ? "width 150ms ease-out, opacity 250ms ease-in" : "width 200ms ease-out",
        }}
      />
    </div>
  )
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarContent />
    </Suspense>
  )
}
