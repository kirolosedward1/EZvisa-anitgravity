"use client"

import { useMemo } from "react"
import { ShieldCheck, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react"
import type { FormData } from "@/lib/form-types"
import { readiness } from "@/lib/shared/wizard-contract"

interface DossierReadinessCardProps {
  formData: FormData
}

/** Same score and wording as the app's review step (lib/shared/wizard-contract.ts readiness). */
export function DossierReadinessCard({ formData }: DossierReadinessCardProps) {
  const result = useMemo(() => readiness(formData), [formData])

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
            {result.score}/100 Readiness
          </span>
        </div>
      </div>

      {/* Progress meter */}
      <div className="space-y-1.5">
        <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={result.score} aria-valuemin={0} aria-valuemax={100} aria-label="Readiness">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {result.checks.map((c, i) => (
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
