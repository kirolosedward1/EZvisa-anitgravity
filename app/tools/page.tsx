import { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Wallet, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2 
} from "lucide-react"

export const metadata: Metadata = {
  title: "Free Schengen Travel Tools & Calculators | EZvisa UAE",
  description: "Free interactive Schengen visa tools for UAE residents. Calculate the 90/180-day rolling rule, estimate required consular bank balance in AED, and locate VFS/TLS/BLS visa centers in Dubai & Abu Dhabi.",
  alternates: {
    canonical: "https://www.ezvisa.net/tools",
  },
  openGraph: {
    title: "Free Schengen Travel Tools & Calculators | EZvisa UAE",
    description: "Official European Commission 90/180-day stay calculator, embassy bank balance estimator, and UAE appointment booking guide.",
    url: "https://www.ezvisa.net/tools",
    type: "website",
  },
}

export default function ToolsIndexPage() {
  const tools = [
    {
      id: "schengen-calculator",
      title: "Schengen 90/180-Day Rule Calculator",
      badge: "European Commission Rule",
      icon: Calendar,
      description: "Track previous trips, calculate remaining allowable days, and avoid unintentional overstay penalties across all 29 Schengen states.",
      href: "/tools/schengen-calculator",
      cta: "Calculate Stay Days",
      color: "from-blue-500/10 via-sky-500/5 to-transparent",
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
      features: [
        "Official rolling 180-day calculation algorithm",
        "Add unlimited past and future trip dates",
        "Direct export into visa application file",
      ]
    },
    {
      id: "bank-balance-calculator",
      title: "Consulate Bank Balance Calculator",
      badge: "Official Solvency Thresholds",
      icon: Wallet,
      description: "Determine the exact closing balance required in your UAE bank statement for Spain, France, Italy, Germany, and Switzerland.",
      href: "/tools/bank-balance-calculator",
      cta: "Check Required Funds",
      color: "from-emerald-500/10 via-teal-500/5 to-transparent",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
      features: [
        "Real-time AED conversions from EUR / CHF",
        "Multi-traveler & trip duration multipliers",
        "Guidance on salary credits and NOC alignment",
      ]
    },
    {
      id: "appointment-guide",
      title: "UAE Schengen Appointment & Biometrics Hub",
      badge: "VFS, TLS & BLS Directory",
      icon: MapPin,
      description: "Navigate visa application centers across Dubai (Wafi Mall, Sheikh Zayed Rd, Al Barsha) and Abu Dhabi with center procedures and biometrics rules.",
      href: "/tools/appointment-guide",
      cta: "Explore Visa Centers",
      color: "from-amber-500/10 via-orange-500/5 to-transparent",
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
      features: [
        "Country-to-center jurisdiction mapping",
        "59-month biometrics (VIS) exemption rules",
        "Center counter security and document guidelines",
      ]
    }
  ]

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "EZvisa Free Schengen Travel Tools",
    url: "https://www.ezvisa.net/tools",
    description: "Free interactive utility tools for Schengen visa applicants in the United Arab Emirates.",
    hasPart: tools.map(t => ({
      "@type": "WebApplication",
      name: t.title,
      url: "https://www.ezvisa.net" + t.href,
      description: t.description,
    }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader forceBackground={true} />

      <main className="flex-1 py-14 md:py-20">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>UAE Traveler Intelligence Suite</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              Free Schengen Visa Tools &amp; Calculators
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
              Plan your European itinerary with total confidence. Built specifically for UAE residents, Golden Visa holders, and frequent travelers to ensure flawless consular compliance.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <div 
                  key={tool.id} 
                  className="bg-card border border-border/80 rounded-3xl p-8 flex flex-col justify-between hover:shadow-xl hover:border-primary/40 transition-all duration-300 relative overflow-hidden group"
                >
                  <div className={"absolute inset-0 bg-gradient-to-br " + tool.color + " opacity-70 pointer-events-none group-hover:opacity-100 transition-opacity"} />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-background border border-border/80 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className={"text-[11px] font-bold px-2.5 py-1 rounded-full border " + tool.badgeColor}>
                        {tool.badge}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {tool.title}
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {tool.description}
                    </p>

                    <div className="space-y-2.5 mb-8 border-t border-border/60 pt-4">
                      {tool.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 pt-2">
                    <Button asChild className="w-full rounded-full shadow-sm text-sm font-semibold">
                      <Link href={tool.href} className="flex items-center justify-center gap-2">
                        {tool.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Value Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-primary-foreground/80 text-xs font-bold uppercase tracking-wider mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Consulate-Ready Document Preparation</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                Done calculating? Let our experts assemble your complete visa file.
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
                From embassy application forms and verifiable flight &amp; hotel reservations to customized cover letters and travel insurance, get your complete Schengen dossier ready in 24&ndash;48 hours.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold">
                  <Link href="/apply">
                    Start Your Application &bull; From 249 AED
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 rounded-full border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-white font-medium">
                  <Link href="/how-it-works">
                    How It Works
                  </Link>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
