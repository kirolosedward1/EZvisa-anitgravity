"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Building2, 
  MapPin, 
  Clock, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Fingerprint,
  CalendarDays,
  ShieldAlert
} from "lucide-react"
import Link from "next/link"

interface CenterInfo {
  provider: "VFS Global" | "TLScontact" | "BLS International"
  countries: string[]
  dubaiAddress: string
  abuDhabiAddress: string
  bookingUrl: string
  timingTips: string
  vipAvailable: boolean
}

const APPOINTMENT_CENTERS: Record<string, CenterInfo> = {
  vfs: {
    provider: "VFS Global",
    countries: [
      "Germany", "Italy", "Switzerland", "Austria", "Netherlands", 
      "Greece", "Portugal", "Sweden", "Norway", "Denmark", "Czech Republic", 
      "Poland", "Hungary", "Croatia", "Finland", "Belgium", "Lithuania"
    ],
    dubaiAddress: "Level 2 & 3, WAFI Mall, Umm Hurair 2, Dubai",
    abuDhabiAddress: "Level B2, The Mall, World Trade Center, Abu Dhabi",
    bookingUrl: "https://visa.vfsglobal.com/are/en/",
    timingTips: "New appointment slots typically drop mid-week in the mornings (9:00 AM - 11:30 AM). Peak season runs May through August.",
    vipAvailable: true
  },
  tls: {
    provider: "TLScontact",
    countries: ["France"],
    dubaiAddress: "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai",
    abuDhabiAddress: "Level 25, Shining Towers, Mubarak Bin Mohammed St, Abu Dhabi",
    bookingUrl: "https://visas-fr.tlscontact.com/visa/ae/",
    timingTips: "TLScontact releases French visa appointments in monthly cohorts. Slots fill rapidly within 10-15 minutes of release.",
    vipAvailable: true
  },
  bls: {
    provider: "BLS International",
    countries: ["Spain"],
    dubaiAddress: "Al Barsha 1, Business Point Building, Dubai",
    abuDhabiAddress: "Office 1002, Al Muhairi Center, Al Khalidiya, Abu Dhabi",
    bookingUrl: "https://uae.blsspainvisa.com/",
    timingTips: "Spain slots open in staggered windows. Ensure passport details on the BLS account match your travel document perfectly.",
    vipAvailable: true
  }
}

export function AppointmentGuideClient() {
  const [selectedProvider, setSelectedProvider] = useState<string>("vfs")
  const [countryFilter, setCountryFilter] = useState<string>("")

  const active = APPOINTMENT_CENTERS[selectedProvider]

  return (
    <div className="space-y-10">
      {/* Top Value Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">UAE Appointment Center Map & Rules</h2>
            <p className="text-xs text-muted-foreground">
              Official operating locations, slot release habits, and biometrics rules for Dubai and Abu Dhabi centers.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
          Dubai & Abu Dhabi Hubs
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(APPOINTMENT_CENTERS).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setSelectedProvider(key)}
            className={`flex-1 min-w-[200px] p-4 rounded-2xl border text-left transition-all ${
              selectedProvider === key
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border/80 text-foreground hover:bg-muted/30"
            }`}
          >
            <div className="font-bold text-base">{item.provider}</div>
            <div className={`text-xs mt-1 ${selectedProvider === key ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {item.countries.slice(0, 3).join(", ")}
              {item.countries.length > 3 && ` +${item.countries.length - 3} more`}
            </div>
          </button>
        ))}
      </div>

      {/* Main Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Center Specifics */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">{active.provider} UAE Overview</h3>
              </div>
              <a
                href={active.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Official Portal <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Locations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  Dubai Application Center
                </span>
                <p className="text-xs text-foreground font-medium flex items-start gap-1.5 mt-1">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{active.dubaiAddress}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  Abu Dhabi Application Center
                </span>
                <p className="text-xs text-foreground font-medium flex items-start gap-1.5 mt-1">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{active.abuDhabiAddress}</span>
                </p>
              </div>
            </div>

            {/* Timing & Slot Pattern */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-primary" />
                <span>Slot Pattern & Lead Time</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {active.timingTips}
              </p>
            </div>

            {/* Handled Countries */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Schengen Countries Processed at this Center:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {active.countries.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border/50 text-xs font-medium text-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 59-Month Biometrics Rule Card */}
          <div className="bg-muted/10 border border-border/50 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <Fingerprint className="w-5 h-5 text-primary" />
              <span>The 59-Month Biometrics Exemption Rule</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you have already provided biometric fingerprints and a digital photograph for a previous Schengen visa within the last <strong>59 months (4 years and 11 months)</strong>, your biometric data is legally stored in the central Visa Information System (VIS). In many instances, the consulate can reuse your prior biometric enrollment.
            </p>
          </div>
        </div>

        {/* Right Column: Appointment Day Protocol */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
            <h3 className="font-bold text-base text-foreground uppercase tracking-wider text-xs border-b border-border/40 pb-3">
              Appointment Day Survival Protocol
            </h3>

            <div className="space-y-3.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                  1
                </div>
                <div>
                  <strong className="text-foreground block">Arrive 15 Minutes Early</strong>
                  <span>Do not arrive an hour early; centers operate strict security entry windows based on your printed appointment confirmation time.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                  2
                </div>
                <div>
                  <strong className="text-foreground block">Physical Stamped Bank Statements</strong>
                  <span>Ensure your 3-6 month UAE bank statements have original physical teller stamps or a verifiable authentication QR code.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                  3
                </div>
                <div>
                  <strong className="text-foreground block">Carry Card for Embassy Fee</strong>
                  <span>The standard 90 EUR adult visa fee is charged in AED at the counter by card or cash, along with the center&apos;s nominal service fee (~100-140 AED).</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                  4
                </div>
                <div>
                  <strong className="text-foreground block">Organized File Dossier</strong>
                  <span>Having your completed form, cover letter, itinerary, and hotel vouchers neatly organized avoids counter delays.</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-2 border-t border-border/40 space-y-3">
              <Button
                asChild
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20"
              >
                <Link href="/apply" className="flex items-center justify-center gap-2">
                  <span>Prepare My Complete Visa Dossier</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                EZvisa organizes your full file ready for submission at VFS, TLS, or BLS.
              </p>
            </div>
          </div>

          {/* Premium Lounge Note */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>VIP / Premium Lounge Warning</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Opting for a Premium Lounge appointment at VFS or TLS provides a private waiting area and refreshments, but <strong>does not influence or accelerate the embassy&apos;s consular decision</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
