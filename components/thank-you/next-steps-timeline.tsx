"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Mail, FileSearch, Phone, FileCheck, Plane } from "lucide-react"
import { motion } from "framer-motion"
import { useSiteLocale } from "@/components/locale-provider"
import { customerText, type CustomerKey } from "@/lib/translations/customer"

export function NextStepsTimeline() {
  const locale = useSiteLocale()
  const t = (key: CustomerKey) => customerText(locale, key)
  const steps = [
    {
      icon: CheckCircle2,
      title: t("thanks.s1"),
      description: t("thanks.s1Body"),
      time: t("thanks.s1Time"),
      status: "completed" as const,
    },
    {
      icon: Mail,
      title: t("thanks.s2"),
      description: t("thanks.s2Body"),
      time: t("thanks.s2Time"),
      status: "completed" as const,
    },
    {
      icon: FileSearch,
      title: t("thanks.s3"),
      description: t("thanks.s3Body"),
      time: t("thanks.s3Time"),
      status: "in-progress" as const,
    },
    {
      icon: Phone,
      title: t("thanks.s4"),
      description: t("thanks.s4Body"),
      time: t("thanks.s4Time"),
      status: "upcoming" as const,
    },
    {
      icon: FileCheck,
      title: t("thanks.s5"),
      description: t("thanks.s5Body"),
      time: t("thanks.s5Time"),
      status: "upcoming" as const,
    },
    {
      icon: Plane,
      title: t("thanks.s6"),
      description: t("thanks.s6Body"),
      time: t("thanks.s6Time"),
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
        <CardTitle className="text-xl font-semibold">{t("thanks.nextTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t("thanks.nextIntro")}
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-[#0436DC]" />

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
              <p className="text-sm font-semibold text-foreground">{t("thanks.estimate")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("thanks.estimateBody")}
              </p>
            </div>
            <div className="text-end">
              <p className="text-lg font-semibold text-primary">{t("thanks.estimateDays")}</p>
              <p className="text-xs text-muted-foreground">{t("thanks.businessDays")}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
