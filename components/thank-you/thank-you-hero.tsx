"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Mail, Sparkles } from "lucide-react"

interface ApplicationData {
  firstName: string
  lastName: string
  email: string
  orderId?: string
}

interface ThankYouHeroProps {
  applicationData: ApplicationData
}

export function ThankYouHero({ applicationData }: ThankYouHeroProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    // Trigger confetti on mount
    setShowConfetti(true)
    
    // Simulate email check
    setTimeout(() => {
      setEmailSent(true)
    }, 1500)

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative">
        <div className="text-center">
          {/* Success Icon with Animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              duration: 0.6 
            }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-14 h-14 text-white stroke-[2.5]" />
              </div>
              {/* Animated ring */}
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ 
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut"
                }}
                className="absolute inset-0 rounded-full border-4 border-emerald-500"
              />
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-600 to-primary bg-clip-text text-transparent">
                Payment Successful!
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-6">
              Welcome aboard, {applicationData.firstName}!
            </p>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Your visa application has been received and our expert team is already reviewing it. 
              We'll have you travel-ready in no time.
            </p>
          </motion.div>

          {/* Order/Reference Number */}
          {applicationData.orderId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Reference: #{applicationData.orderId}
              </span>
            </motion.div>
          )}

          {/* Email Confirmation Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: emailSent ? 1 : 0, scale: emailSent ? 1 : 0.9 }}
            transition={{ delay: 0.7 }}
            className="mt-6 inline-flex items-center gap-2 text-emerald-600"
          >
            <Mail className="w-5 h-5" />
            <span className="text-sm font-medium">
              Confirmation email sent to {applicationData.email}
            </span>
          </motion.div>

          {/* Decorative Elements */}
          <div className="mt-8 flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1, 0] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-primary/40 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
