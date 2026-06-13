"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Mail, FileSearch, Phone, FileCheck, Plane } from "lucide-react"
import { motion } from "framer-motion"

export function NextStepsTimeline() {
  const steps = [
    {
      icon: CheckCircle2,
      title: "Payment Confirmed",
      description: "Your payment has been successfully processed",
      time: "Just now",
      status: "completed" as const,
    },
    {
      icon: Mail,
      title: "Confirmation Email Sent",
      description: "Check your inbox for application details and next steps",
      time: "Within 5 minutes",
      status: "completed" as const,
    },
    {
      icon: FileSearch,
      title: "Document Review",
      description: "Our experts will review your documents and requirements",
      time: "Within 24 hours",
      status: "in-progress" as const,
    },
    {
      icon: Phone,
      title: "Expert Contact",
      description: "Our team will reach out via WhatsApp or email if needed",
      time: "1-2 business days",
      status: "upcoming" as const,
    },
    {
      icon: FileCheck,
      title: "Documents Prepared",
      description: "Complete visa application package ready for submission",
      time: "3-5 business days",
      status: "upcoming" as const,
    },
    {
      icon: Plane,
      title: "Application Submitted",
      description: "Your application submitted to the embassy/consulate",
      time: "Within 1 week",
      status: "upcoming" as const,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500 text-white"
      case "in-progress":
        return "bg-primary text-white animate-pulse"
      case "upcoming":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted"
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl font-bold">What Happens Next</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Your visa application journey - step by step
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-primary to-muted" />

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex gap-4"
              >
                {/* Icon */}
                <div className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${getStatusColor(step.status)}`}>
                  <step.icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {step.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Estimated Completion */}
        <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Estimated Completion</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your complete visa package ready for submission
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">5-7 Days</p>
              <p className="text-xs text-muted-foreground">Business days</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
