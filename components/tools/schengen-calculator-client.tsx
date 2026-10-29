"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { calculateSchengenStay, TripInterval, CalculationResult } from "@/lib/schengen-calculator"
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Clock,
  ShieldCheck,
  HelpCircle,
  Plane
} from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { useMessage } from "@/components/use-message"
import { PreparationLine } from "@/components/ready-line"

/** 1 يوم واحد، 2 يومان، 3–10 N أيام، 11+ N يومًا. */
function arabicDayCount(count: number) {
  const category = new Intl.PluralRules("ar").select(count)
  if (category === "one") return "يوم واحد"
  if (category === "two") return "يومان"
  if (category === "few") return `${count} أيام`
  return `${count} يومًا`
}

export function SchengenCalculatorClient() {
  const removeLabel = useMessage("calc.removeTrip")
  const [pastTrips, setPastTrips] = useState<TripInterval[]>([
    { id: "1", startDate: "", endDate: "" }
  ])
  const [plannedTrip, setPlannedTrip] = useState<TripInterval>({
    id: "planned",
    startDate: "",
    endDate: ""
  })

  const addPastTrip = () => {
    setPastTrips(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), startDate: "", endDate: "" }
    ])
  }

  const removePastTrip = (id: string) => {
    setPastTrips(prev => prev.filter(t => t.id !== id))
  }

  const updatePastTrip = (id: string, field: "startDate" | "endDate", value: string) => {
    setPastTrips(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const result: CalculationResult = calculateSchengenStay(
    pastTrips.filter(t => t.startDate && t.endDate),
    plannedTrip.startDate && plannedTrip.endDate ? plannedTrip : undefined
  )

  const applyUrl = plannedTrip.startDate && plannedTrip.endDate
    ? `/apply?travelStartDate=${plannedTrip.startDate}&travelEndDate=${plannedTrip.endDate}`
    : "/apply"

  return (
    <div className="ez-stay-tool space-y-10">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              <Msg id="calc.ruleTitle" />
            </h2>
            <p className="text-xs text-muted-foreground">
              <Msg id="calc.ruleBody" />
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
          <Msg id="calc.rolling" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-base text-foreground">
                  <Msg id="calc.plannedTitle" />
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                <Msg id="calc.evaluationTarget" />
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="planned-entry" className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  <Msg id="calc.entryDate" />
                </label>
                <Input
                  id="planned-entry" type="date"
                  value={plannedTrip.startDate}
                  onChange={(e) => setPlannedTrip(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background text-sm h-11"
                />
              </div>
              <div>
                <label htmlFor="planned-exit" className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  <Msg id="calc.exitDate" />
                </label>
                <Input
                  id="planned-exit" type="date"
                  value={plannedTrip.endDate}
                  onChange={(e) => setPlannedTrip(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-background text-sm h-11"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-foreground/70" />
                <h3 className="font-semibold text-base text-foreground">
                  <Msg id="calc.pastTitle" />
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPastTrip}
                className="h-8 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 me-1" /> <Msg id="calc.addStay" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              <Msg id="calc.pastHelp" />
            </p>

            <div className="space-y-3">
              {pastTrips.map((trip, idx) => (
                <div key={trip.id} className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl">
                  <span className="text-xs font-semibold text-muted-foreground w-6 text-center">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">
                        <Msg id="calc.entry" />
                      </span>
                      <Input
                        type="date"
                        value={trip.startDate}
                        onChange={(e) => updatePastTrip(trip.id, "startDate", e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">
                        <Msg id="calc.exit" />
                      </span>
                      <Input
                        type="date"
                        value={trip.endDate}
                        onChange={(e) => updatePastTrip(trip.id, "endDate", e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  </div>
                  {pastTrips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePastTrip(trip.id)}
                      className="p-2 text-muted-foreground hover:text-rose-500 rounded-lg transition-colors"
                      title={removeLabel}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
            <h3 className="font-semibold text-base text-foreground uppercase tracking-wider text-xs border-b border-border/40 pb-3">
              <Msg id="calc.assessment" />
            </h3>

            {result.isOverstay ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">
                    <Msg id="calc.overstayTitle" />
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    <Msg
                      id="calc.overstayBody"
                      values={{ n: result.overstayDays }}
                      valuesAr={{ days: arabicDayCount(result.overstayDays) }}
                    />
                  </p>
                </div>
              </div>
            ) : result.remainingDays <= 10 && (result.totalDaysInWindow > 0) ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">
                    <Msg id="calc.cautionTitle" />
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    <Msg id="calc.cautionBody" values={{ n: result.remainingDays }} />
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">
                    <Msg id="calc.okTitle" />
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    <Msg id="calc.okBody" />
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  <Msg id="calc.daysInWindow" />
                </span>
                <span className="text-3xl font-semibold text-foreground">
                  {result.totalDaysInWindow}
                  <span className="text-xs font-normal text-muted-foreground"> / 90</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  <Msg id="calc.daysRemaining" />
                </span>
                <span className={`text-3xl font-semibold ${result.isOverstay ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {result.remainingDays}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                asChild
                disabled={result.isOverstay}
                className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-blue-500/20"
              >
                <LocaleLink href={applyUrl} className="flex items-center justify-center gap-2">
                  <span><Msg id="calc.prepare" /></span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </LocaleLink>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                <PreparationLine />
              </p>
            </div>
          </div>

          <div className="bg-muted/10 border border-border/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span><Msg id="calc.essentials" /></span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li>• <Msg id="calc.tip1" /></li>
              <li>• <Msg id="calc.tip2" /></li>
              <li>• <Msg id="calc.tip3" /></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 pt-10 space-y-6">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <Msg id="calc.faqTitle" />
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-semibold text-foreground">
              <Msg id="calc.faq1q" />
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Msg id="calc.faq1a" />
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-semibold text-foreground">
              <Msg id="calc.faq2q" />
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Msg id="calc.faq2a" />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
