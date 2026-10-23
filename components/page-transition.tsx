"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { canonicalPath } from "@/lib/route-path"

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [canAnimate, setCanAnimate] = useState(false)

  useEffect(() => {
    setCanAnimate(true)
  }, [])

  return (
    <MotionConfig reducedMotion="never">
      <AnimatePresence mode="wait">
        <motion.div
          key={canonicalPath(pathname)}
          initial={canAnimate ? { opacity: 0, y: 10 } : false}
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
