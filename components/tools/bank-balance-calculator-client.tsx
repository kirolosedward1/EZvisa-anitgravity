"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  SCHENGEN_FUNDS_RULES, 
  calculateRequiredFunds 
} from "@/lib/bank-requirements"
import { 
  Wallet, 
  ShieldAlert, 
  CheckCircle2, 
  Building, 
  ArrowRight, 
  FileText, 
  HelpCircle,
  Users
} from "lucide-react"
import Link from "next/link"

export function BankBalanceCalculatorClient() {
  const [selectedCountry, setSelectedCountry] = useState("france")
  const [days, setDays] = useState(14)
  const [travelers, setTravelers] = useState(1)
  const [hasHotel, setHasHotel] = useState(true)

  const funds = calculateRequiredFunds(selectedCountry, days, travelers, hasHotel)

  return (
    <div className="space-y-10">
      {/* Top Advisory Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Official Consular Subsistence Guidelines</h2>
            <p className="text-xs text-muted-foreground">
              Schengen consulates in Dubai & Abu Dhabi require verifiable proof of financial stability covering daily living costs.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          UAE Bank Verified
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-foreground border-b border-border/40 pb-3">
              Trip Financial Parameters
            </h3>

            {/* Country Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                Select Destination Country
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(SCHENGEN_FUNDS_RULES).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCountry(key)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      selectedCountry === key
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/20 border-border/60 text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {item.country}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider & Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Stay Duration (Days)
                </label>
                <span className="text-sm font-bold text-foreground">{days} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1 day</span>
                <span>30 days</span>
                <span>60 days</span>
                <span>90 days (Max short-stay)</span>
              </div>
            </div>

            {/* Travelers Count */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                Number of Applicants
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTravelers(num)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                      travelers === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/20 border-border/60 text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                    {num} {num === 1 ? "Person" : "People"}
                  </button>
                ))}
              </div>
            </div>

            {/* Accommodation Toggle */}
            <div className="pt-2 border-t border-border/40">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHotel}
                  onChange={(e) => setHasHotel(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                />
                <span className="text-xs text-foreground font-medium">
                  Confirmed hotel reservations / accommodation will be provided in file (Lowers daily requirement for France & Germany)
                </span>
              </label>
            </div>
          </div>

          {/* Consular Warning Note */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Critical UAE Bank Statement Rule</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Never deposit a sudden large cash lump sum</strong> right before submitting your bank statement. Consulates scrutinize bank statements for irregular deposits. The funds should show consistent salary deposits matching your employer&apos;s NOC.
            </p>
          </div>
        </div>

        {/* Right Column: Output Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
            <div className="border-b border-border/40 pb-3 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Required Closing Balance
              </h3>
              <span className="text-xs font-semibold text-primary">{funds.country} Consulate</span>
            </div>

            {/* Balance Highlight */}
            <div className="space-y-1 text-center py-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Minimum Statutory Balance
              </span>
              <div className="text-4xl font-black tracking-tight text-foreground">
                {funds.totalAed.toLocaleString()} <span className="text-xl font-bold text-muted-foreground">AED</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Approx. {funds.totalForeign.toLocaleString()} {funds.currency} ({funds.dailyRate} {funds.currency}/day)
              </div>
            </div>

            {/* Recommended Safety Buffer */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Recommended Safety Buffer (+30%)</span>
                <span className="font-bold text-primary">{funds.recommendedBufferAed.toLocaleString()} AED</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Visa officers favor applicants whose closing balance comfortably exceeds the bare statutory minimum.
              </p>
            </div>

            {/* Document Requirements Checklist */}
            <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border/40 pt-4">
              <span className="font-bold uppercase text-[10px] tracking-wider text-foreground block">
                What UAE Consulates Require:
              </span>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>3 to 6 months original bank statements printed on official bank stationery with stamp.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Consistent monthly salary credits matching the salary stated on your NOC.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Statements issued no more than 7 to 14 days before your appointment date.</span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              asChild
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20"
            >
              <Link href={`/apply?to=${encodeURIComponent(funds.country)}`} className="flex items-center justify-center gap-2">
                <span>Start {funds.country} Application File</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* UAE Bank Info */}
          <div className="bg-muted/10 border border-border/50 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Building className="w-4 h-4 text-primary" />
              <span>Accepted UAE Financial Institutions</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Consulates accept certified statements from all Central Bank licensed banks in the UAE (Emirates NBD, Abu Dhabi Commercial Bank, First Abu Dhabi Bank, Dubai Islamic Bank, Mashreq, HSBC UAE, etc.). E-statements are accepted only if they contain the bank&apos;s digital authentication QR code.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="border-t border-border/60 pt-10 space-y-6">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Bank Statement & Financial FAQs
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-bold text-foreground">Can I use my credit card limit instead of bank balance?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No. Schengen embassies require liquid checking or savings accounts. Credit card limits may be submitted as supplementary evidence of financial capability, but they never replace the 3-6 months current account statement.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-2">
            <h4 className="font-bold text-foreground">What if my salary is paid in cash?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your salary is paid in cash without corresponding monthly bank deposits, approval chances drop significantly. Consulates require an auditable trail connecting your employment contract to regular bank balance accumulation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
