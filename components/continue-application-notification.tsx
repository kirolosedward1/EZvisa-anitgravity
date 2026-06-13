"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function ContinueApplicationNotification() {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't show on the wizard pages themselves
    if (pathname?.startsWith("/apply")) {
      return
    }

    // Check if user has incomplete application
    const checkIncompleteApplication = () => {
      try {
        const wizardData = localStorage.getItem("visa-wizard-form")
        const dismissedUntil = localStorage.getItem("notification-dismissed-until")
        
        if (!wizardData) {
          return false
        }

        const data = JSON.parse(wizardData)
        
        // Check if dismissed recently (within 24 hours)
        if (dismissedUntil) {
          const dismissTime = parseInt(dismissedUntil)
          const now = Date.now()
          if (now < dismissTime) {
            return false
          }
        }

        // Check if application has any data but no payment success
        const hasData = data.firstName || data.nationality || data.destination
        const paymentSuccess = localStorage.getItem("payment-success")
        
        return hasData && !paymentSuccess
      } catch (error) {
        console.error("Error checking incomplete application:", error)
        return false
      }
    }

    // Show notification after 5 seconds delay
    const timer = setTimeout(() => {
      if (checkIncompleteApplication()) {
        setIsVisible(true)
        setTimeout(() => setIsAnimating(true), 50)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [pathname])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      // Dismiss for 24 hours
      const dismissUntil = Date.now() + 24 * 60 * 60 * 1000
      localStorage.setItem("notification-dismissed-until", dismissUntil.toString())
    }, 300)
  }

  const handleContinue = () => {
    router.push("/apply")
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 max-w-sm transition-all duration-300 ease-out",
        isAnimating ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 pr-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Continue your application
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You have an unfinished visa application. Pick up where you left off!
            </p>
            
            <Button
              onClick={handleContinue}
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Continue Application
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
