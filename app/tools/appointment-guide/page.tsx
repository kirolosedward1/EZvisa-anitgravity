import { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { AppointmentGuideClient } from "@/components/tools/appointment-guide-client"

export const metadata: Metadata = {
  title: "UAE Schengen Visa Appointment Centers & Booking Guide | EZvisa",
  description: "Complete guide to Schengen visa appointments in Dubai & Abu Dhabi. Centers for VFS Global, TLScontact, and BLS International. Slot timing tips and biometrics rules.",
  alternates: {
    canonical: "https://www.ezvisa.net/tools/appointment-guide",
  },
  openGraph: {
    title: "UAE Schengen Visa Appointment Centers Guide | EZvisa",
    description: "Locations, slot release patterns, and rules for VFS Global, TLScontact, and BLS International in Dubai & Abu Dhabi.",
    url: "https://www.ezvisa.net/tools/appointment-guide",
    type: "website",
  },
}

export default function AppointmentGuidePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Guide",
    name: "UAE Schengen Visa Appointment & Centers Guide",
    url: "https://www.ezvisa.net/tools/appointment-guide",
    description: "Operational guide to Schengen visa application centers and booking protocols in the United Arab Emirates.",
    publisher: {
      "@type": "Organization",
      name: "EZvisa",
      url: "https://www.ezvisa.net/",
    },
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader forceBackground={true} />

      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              UAE Appointment Intelligence
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Schengen Visa Appointment Centers Guide
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
              Navigate appointment booking across VFS Global, TLScontact, and BLS International in Dubai and Abu Dhabi. Understand slot release patterns, biometrics rules, and center protocols.
            </p>
          </div>

          <AppointmentGuideClient />
        </div>
      </main>

      <Footer />
    </div>
  )
}
