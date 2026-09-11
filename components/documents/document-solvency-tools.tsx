"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Coins, Calendar, MapPin, CheckCircle2, ArrowRight, ShieldCheck, Layers, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateRequiredFunds } from "@/lib/bank-requirements"

interface DocumentSolvencyToolsProps {
  country: string
  provider?: string
}

export function DocumentSolvencyTools({ country, provider = "VFS Global / TLScontact" }: DocumentSolvencyToolsProps) {
  const [showStackingOrder, setShowStackingOrder] = useState(false)

  // Calculate 10-day trip baseline for single applicant with hotel bookings
  const funds = calculateRequiredFunds(country, 10, 1, true)

  const stackingSteps = [
    { num: 1, title: "Original Passport & Copies", desc: "Valid for min. 3 months beyond travel, with copies of bio and previous Schengen visas" },
    { num: 2, title: "UAE Residence Visa & Emirates ID", desc: "Valid for min. 3 months after departure from Schengen area" },
    { num: 3, title: "Official Application Form", desc: "Fully completed, dated, and physically signed by applicant" },
    { num: 4, title: "Two Passport Photos", desc: "35x45mm, recent, light grey/white background, 80% face coverage" },
    { num: 5, title: "Appointment Confirmation Voucher", desc: "Official VFS/TLS booking letter with barcoded receipt" },
    { num: 6, title: "Personalized Consular Cover Letter", desc: "Outlining travel motive, dates, sponsor, and intent to return to UAE" },
    { num: 7, title: "Round-Trip Flight Reservation", desc: "Verifiable flight itinerary matching entry/exit ports" },
    { num: 8, title: "Confirmed Hotel Vouchers", desc: "Covering entire duration with guest name and contact details" },
    { num: 9, title: "Schengen Travel Medical Insurance", desc: "Min. €30,000 / $50,000 coverage, zero deductible, repatriation" },
    { num: 10, title: "Employment NOC / Trade License", desc: "Original salary certificate, leave dates, or trade license + MOA for partners" },
    { num: 11, title: "Bank Statements (Last 3-6 Months)", desc: "Original bank-stamped showing steady salary credits and ending balance" }
  ]

  return (
    <div className="mt-12 space-y-8">
      {/* Solvency Intelligence Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 md:p-8 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-blue-300 text-xs font-semibold border border-primary/30">
              <Coins className="w-3.5 h-3.5 text-blue-400" />
              <span>Consular Solvency Protocol</span>
            </div>
            <span className="text-xs text-slate-400">
              Official Consular Requirement Benchmark
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
            Bank Balance &amp; Financial Proof for {country}
          </h3>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed mb-6">
            Embassies require proof of sufficient daily funds to cover meals, transit, and lodging. For {country}, consular guidelines establish specific daily subsistence thresholds:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <span className="text-xs text-slate-300 block mb-1">Daily Subsistence Rate</span>
              <span className="text-xl font-bold text-white">
                {funds.currency === "CHF" ? `${funds.dailyRate} CHF` : `€${funds.dailyRate}`}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">per person / day</span>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <span className="text-xs text-slate-300 block mb-1">10-Day Trip Minimum</span>
              <span className="text-xl font-bold text-emerald-400">
                ~{funds.totalAed.toLocaleString()} AED
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                ({funds.currency === "CHF" ? `${funds.totalForeign} CHF` : `€${funds.totalForeign}`})
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <span className="text-xs text-slate-300 block mb-1">Recommended Ending Buffer</span>
              <span className="text-xl font-bold text-blue-400">
                ~{funds.recommendedBufferAed.toLocaleString()} AED
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">+30% expert safety cushion</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-700/60">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Statements must be stamped by your UAE bank with clear monthly salary credits.</span>
            </p>

            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl shadow-xs">
              <Link href={`/tools/bank-balance-calculator?country=${encodeURIComponent(country)}`}>
                Calculate Your Exact Trip Balance
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Free Planning Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 90/180-Day Rule */}
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Stay Duration Rules</span>
            </div>
            <h4 className="font-bold text-base mb-1.5">Schengen 90/180-Day Rule Calculator</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Short-stay Schengen visas limit your stay to 90 days in any rolling 180-day window. Verify your planned dates to avoid unintended overstay violations.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full text-xs font-medium justify-between">
            <Link href="/tools/schengen-calculator">
              <span>Check 90/180-Day Days</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        {/* UAE Appointment Center Directory */}
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Submission Centers</span>
            </div>
            <h4 className="font-bold text-base mb-1.5">{country} Appointment Centers in UAE</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Applications for {country} in the UAE are submitted via {provider} in Dubai and Abu Dhabi. Biometrics (VIS) remain valid for 59 months.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full text-xs font-medium justify-between">
            <Link href={`/tools/appointment-guide?country=${encodeURIComponent(country)}`}>
              <span>View Booking Guide &amp; Centers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 11-Step Consular Submission Stacking Order */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base">Consular Dossier Stacking Order</h4>
              <p className="text-xs text-muted-foreground">Standard 11-step arrangement expected by VFS, BLS, and TLS submission counters</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStackingOrder(!showStackingOrder)}
            className="text-xs font-semibold text-primary hover:text-primary/90"
          >
            {showStackingOrder ? (
              <>
                Hide Sequence <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                View 11 Steps <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {showStackingOrder && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stackingSteps.map((step) => (
                <div key={step.num} className="bg-white dark:bg-slate-900 border rounded-lg p-3 text-xs flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {step.num}
                  </span>
                  <div>
                    <h5 className="font-bold text-foreground text-xs">{step.title}</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-400 flex items-center gap-2 mt-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Counter Rule:</strong> Do not staple documents together unless explicitly instructed by intake officers. Use paper clips where necessary.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
