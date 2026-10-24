"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { canonicalPath } from "@/lib/route-path"

interface PageTransitionProps {
  children: React.ReactNode
}

/**
 * The streamed page slot is a Suspense boundary. Wrapping it in motion.div
 * makes the first client render a styled div where the server HTML still has
 * that boundary, which React reports as hydration error #418
 * (dev diff: client div.w-full.flex-1 vs server Suspense, inside PageTransition).
 * The first paint is a plain div on both sides. The entrance animation starts
 * on the next navigation, after this effect, without a mount-time setState.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()?.replace(/^\/ar(?=\/|$)/, "") || "/"
  const canAnimate = useRef(false)

  useEffect(() => {
    canAnimate.current = true
  }, [])

  if (!canAnimate.current) {
    return <div className="w-full flex-1 flex flex-col">{children}</div>
  }

  return (
    <MotionConfig reducedMotion="never">
      <AnimatePresence mode="wait">
        <motion.div
          key={canonicalPath(pathname)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-full flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}
