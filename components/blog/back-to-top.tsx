"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    const updateScrollProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight <= 0) return

      const scrolled = window.scrollY
      const progress = (scrolled / scrollHeight) * 100
      const progressDecimal = scrolled / scrollHeight
      document.documentElement.style.setProperty("--scroll-progress", `${progress}%`)
      document.documentElement.style.setProperty("--scroll-progress-decimal", `${progressDecimal}`)
    }

    const handleScroll = () => {
      toggleVisibility()
      updateScrollProgress()
    }

    window.addEventListener("scroll", handleScroll)
    // Initial update
    toggleVisibility()
    updateScrollProgress()

    return () => {
      window.removeEventListener("scroll", handleScroll)
      // Clean up CSS variables
      document.documentElement.style.removeProperty("--scroll-progress")
      document.documentElement.style.removeProperty("--scroll-progress-decimal")
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-8 left-8 z-50"
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary text-primary-foreground"
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
