"use client"

import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  // Reset scroll to top instantly on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return <div className="w-full flex-1">{children}</div>
}
