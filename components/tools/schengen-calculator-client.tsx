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
import Link from "next/link"

export function SchengenCalculatorClient() {
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
    <div className="space-y-10">
      {/* Top Value Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Official 90/180-Day Schengen Rule</h2>
            <p className="text-xs text-muted-foreground">
              Non-EU short-stay visitors may spend up to 90 days in any rolling 180-day window across the 29 Schengen member states.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
          Rolling Window Logic
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Planned Trip Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground">Planned Trip to Europe</h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Evaluation Target</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  Entry Date (Arrival)
                </label>
                <Input
                  type="date"
                  value={plannedTrip.startDate}
                  onChange={(e) => setPlannedTrip(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background text-sm h-11"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  Exit Date (Departure)
                </label>
                <Input
                  type="date"
                  value={plannedTrip.endDate}
                  onChange={(e) => setPlannedTrip(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-background text-sm h-11"
                />
              </div>
            </div>
          </div>

          {/* Past Trips Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-foreground/70" />
                <h3 className="font-bold text-base text-foreground">Past Schengen Stays (Last 180 Days)</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPastTrip}
                className="h-8 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Stay
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Add any dates you spent inside the Schengen area within the 180 days prior to your planned departure. If you haven&apos;t visited Europe recently, leave this blank.
            </p>

            <div className="space-y-3">
              {pastTrips.map((trip, idx) => (
                <div key={trip.id} className="flex flex-col sm:flex-row items-center gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl">
                  <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">Entry</span>
                      <Input
                        type="date"
                        value={trip.startDate}
                        onChange={(e) => updatePastTrip(trip.id, "startDate", e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block mb-0.5">Exit</span>
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
                      title="Remove trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Calculation Result Box */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
            <h3 className="font-bold text-base text-foreground uppercase tracking-wider text-xs border-b border-border/40 pb-3">
              Compliance Assessment
            </h3>

            {/* Status Indicator */}
            {result.isOverstay ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Overstay Alert</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    This itinerary exceeds the 90-day limit by <strong>{result.overstayDays} day(s)</strong> within the 180-day window. Consulates will reject this duration without an extension or long-stay visa.
                  </p>
                </div>
              </div>
            ) : result.remainingDays <= 10 && (result.totalDaysInWindow > 0) ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Caution: Approaching Limit</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    You have only <strong>{result.remainingDays} days</strong> remaining. Make sure your flight dates leave a safety buffer in case of travel delays.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Itinerary Compliant</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    Your planned trip is fully authorized under the 90/180 Schengen rule. You have ample allowable days.
                  </p>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Days in Window
                </span>
                <span className="text-3xl font-black text-foreground">
                  {result.totalDaysInWindow}
                  <span className="text-xs font-normal text-muted-foreground"> / 90</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Days Remaining
                </span>
                <span className={`text-3xl font-black ${result.isOverstay ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {result.remainingDays}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="space-y-3 pt-2">
              <Button
                asChild
                disabled={result.isOverstay}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20"
              >
                <Link href={applyUrl} className="flex items-center justify-center gap-2">
                  <span>Prepare Visa File for These Dates</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                EZvisa prepares your complete file (forms, cover letter, itinerary, hotel/flight reservations) within 24-48 hours.
              </p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-muted/10 border border-border/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Schengen Rule Essentials</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li>• Both the day of entry and day of exit count as full days of stay.</li>
              <li>• The 180-day window looks backward from every single day of your stay.</li>
              <li>• Travel across all 29 Schengen member nations counts toward the same 90-day pool.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="border-t border-border/60 pt-10 space-y-6">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Frequently Asked Questions About the 90/180 Rule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-bold text-foreground">Does the 180-day window reset when my visa expires?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No. The 180-day period is a rolling calendar window, not linked to individual visa validity dates. Even if you receive a new visa, any days spent in the Schengen area within the preceding 180 days count toward your 90-day limit.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-bold text-foreground">Can I leave for 1 day and re-enter?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A brief exit does not reset the 90-day counter. You can only stay for the number of days that ensures you have not spent more than 90 days in the 180-day period looking backward from each day of your stay.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
