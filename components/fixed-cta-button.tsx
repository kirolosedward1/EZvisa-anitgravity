"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface FixedCTAButtonProps {
  country: string
}

export function FixedCTAButton({ country }: FixedCTAButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show button after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-3 left-3 right-3 z-50 lg:hidden"
    >
      <Link
        href={`/apply?to=${encodeURIComponent(country)}`}
        className="block w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl shadow-2xl hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-primary/20"
      >
        <div className="flex items-center justify-center py-3 px-5">
          <div className="text-base font-semibold text-center">Start Your Application</div>
          <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}
