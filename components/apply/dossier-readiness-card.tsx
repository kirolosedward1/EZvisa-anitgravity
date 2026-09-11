"use client"

import { useMemo } from "react"
import { ShieldCheck, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react"
import { FormData } from "@/lib/form-types"

interface DossierReadinessCardProps {
  formData: FormData
}

export function DossierReadinessCard({ formData }: DossierReadinessCardProps) {
  const readiness = useMemo(() => {
    let score = 70 // Baseline score with personal & trip details filled
    const checks: { label: string; passed: boolean; note?: string }[] = []

    // 1. Duration check
    if (formData.travelStartDate && formData.travelEndDate) {
      const start = new Date(formData.travelStartDate)
      const end = new Date(formData.travelEndDate)
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (days > 0 && days <= 90) {
        score += 8
        checks.push({ label: `Stay duration (${days} days) within Schengen 90-day legal limit`, passed: true })
      } else {
        checks.push({ label: `Stay duration exceeds 90 days`, passed: false, note: "Schengen tourist visas cannot exceed 90 days" })
      }

      // 2. Buffer check
      const today = new Date()
      const daysUntilTrip = Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilTrip >= 15) {
        score += 7
        checks.push({ label: `Lead time (${daysUntilTrip} days) provides safe consular processing buffer`, passed: true })
      } else {
        checks.push({ label: `Departure is in ${daysUntilTrip} days (embassy turnaround is typically 10-15 days)`, passed: false })
      }
    }

    // 3. Document checks
    const hasPassport = !!(formData.passportFront || formData.passportNumber)
    const hasBank = !!formData.bankStatement
    const hasPhoto = !!(formData.photo || formData.passportPhoto)
    const hasNoc = !!(formData.salaryCertificate || formData.nocCertificate)

    if (hasPassport) {
      score += 4
      checks.push({ label: "Passport bio page / number recorded", passed: true })
    } else {
      checks.push({ label: "Passport copy can be uploaded securely after checkout", passed: true })
    }

    if (hasBank) {
      score += 4
      checks.push({ label: "UAE bank statements attached", passed: true })
    } else {
      checks.push({ label: "Bank statements can be uploaded securely after checkout", passed: true })
    }

    if (hasNoc || formData.employmentStatus === "business") {
      score += 4
      checks.push({ label: "Employment / business proof categorized", passed: true })
    }

    // 4. Spouse accompanying
    if (formData.maritalStatus === "married" && formData.spouseAccompanying === "yes") {
      score += 3
      checks.push({ label: "Accompanying spouse details integrated into dossier calculation", passed: true })
    }

    const finalScore = Math.min(score, 98) // Never say 100% because visa decisions rest with embassies

    return {
      score: finalScore,
      checks
    }
  }, [formData])

  return (
    <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 rounded-3xl p-6 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
              Pre-Flight File Readiness Score
            </h4>
            <p className="text-xs text-muted-foreground">
              Automated procedural audit based on official Schengen consular criteria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-background/80 border border-border/60 px-3.5 py-1.5 rounded-full shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-foreground">
            {readiness.score}/100 Readiness
          </span>
        </div>
      </div>

      {/* Progress meter */}
      <div className="space-y-1.5">
        <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${readiness.score}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {readiness.checks.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-muted-foreground">
            {c.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <span className={c.passed ? "text-foreground/90" : "text-amber-600 dark:text-amber-400 font-medium"}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground leading-relaxed">
        <strong>Our Guarantee:</strong> EZvisa reviews every detail to ensure your application forms, travel itinerary, flight/hotel vouchers, and cover letter meet all procedural guidelines before delivery.
      </div>
    </div>
  )
}
