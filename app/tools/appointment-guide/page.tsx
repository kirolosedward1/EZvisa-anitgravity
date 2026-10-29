import { InnerHero } from "@/components/inner-hero"
import { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { AppointmentGuideClient } from "@/components/tools/appointment-guide-client"
import { withArabicMeta } from "@/lib/page-meta"
import { requestLocale } from "@/lib/request-locale"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "UAE Schengen Visa Appointment Centers & Booking Guide",
      description: "Complete guide to Schengen visa appointments in Dubai & Abu Dhabi. Centers for VFS Global, TLScontact, and BLS International. Slot timing tips and biometrics rules.",
      alternates: {
        canonical: "https://www.ezvisa.net/tools/appointment-guide",
      },
      openGraph: {
        title: "UAE Schengen Visa Appointment Centers Guide | EZvisa",
        description: "Official booking routes and practical guidance on Schengen visa appointments in the UAE.",
        url: "https://www.ezvisa.net/tools/appointment-guide",
        type: "website",
      },
    },
    {
      title: "مراكز مواعيد تأشيرة شنغن في الإمارات",
      description: "عناوين VFS Global وTLScontact وBLS International في دبي وأبوظبي، مع نمط فتح المواعيد وقاعدة البصمة لـ59 شهرًا.",
      path: "/ar/tools/appointment-guide",
    },
  )
}

export default async function AppointmentGuidePage() {
  const arabic = (await requestLocale()) === "ar"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Guide",
    name: arabic ? "دليل مراكز مواعيد تأشيرة شنغن في الإمارات" : "UAE Schengen Visa Appointment & Centers Guide",
    url: arabic ? "https://www.ezvisa.net/ar/tools/appointment-guide" : "https://www.ezvisa.net/tools/appointment-guide",
    description: arabic
      ? "دليل مراكز تقديم تأشيرة شنغن وحجز المواعيد في الإمارات."
      : "Operational guide to Schengen visa application centers and booking protocols in the United Arab Emirates.",
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

      <main className="ez-tool-page flex-1">
        <InnerHero variant="plain" title={arabic ? "موعد التأشيرة، خطوة بخطوة" : "Your visa appointment, step by step"} description={arabic ? "اعثر على التعليمات الرسمية للحجز، وتعرّف على البصمات والمستندات المطلوبة قبل زيارتك." : "Find the official booking instructions and understand biometrics and document checks before your visit."} />
        <div className="container max-w-5xl mx-auto px-6"><AppointmentGuideClient /></div>
      </main>

      <Footer />
    </div>
  )
}
