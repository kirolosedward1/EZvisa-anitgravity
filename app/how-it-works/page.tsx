import type { Metadata } from "next"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { AfterPaymentTimeline } from "@/components/after-payment-timeline"
import { ServicesSection } from "@/components/services-section"
import { formatAedLabel } from "@/lib/currency"
import { requestLocale } from "@/lib/request-locale"
import { OG_LOCALE, defaultOgImage, localeAlternates } from "@/lib/seo"
import { ltr } from "@/lib/bidi"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  if (arabic) {
    return {
      title: "كيف تعمل: من أول إجابة حتى موعد التأشيرة",
      description: `كيف تجهّز ${ltr("EZvisa")} ملف تأشيرة شنغن: أجب عن بضعة أسئلة، وادفع ${price}، وارفع مستنداتك، واستلم نموذج الطلب وخطاب التغطية وبرنامج الرحلة والحجوزات خلال ${ltr("1–2")} يوم.`,
      alternates: localeAlternates("/how-it-works", true),
      openGraph: {
        title: "كيف تعمل إيزي فيزا",
        description: `أجب عن بضعة أسئلة، وادفع، وارفع مستنداتك. ملفك جاهز خلال ${ltr("1–2")} يوم.`,
        url: "https://www.ezvisa.net/ar/how-it-works",
        siteName: "EZvisa",
        type: "website",
        locale: OG_LOCALE.ar,
        alternateLocale: OG_LOCALE.en,
        images: [defaultOgImage(true)],
      },
    }
  }
  return {
    title: "How It Works: From Your First Answer to Your Visa Appointment",
    description:
      "How EZvisa prepares your Schengen visa file: answer a few questions, pay 249 AED, upload your documents, and get your application form, cover letter, itinerary and reservations in 1–2 days.",
    keywords: ["visa application process", "how to apply Schengen visa UAE", "Schengen visa steps", "Schengen visa appointment Dubai"],
    alternates: localeAlternates("/how-it-works", false),
    openGraph: {
      title: "How EZvisa Works",
      description: "Answer a few questions, pay, upload your documents. Your file is ready in 1–2 days.",
      url: "https://www.ezvisa.net/how-it-works",
      siteName: "EZvisa",
      type: "website",
      locale: OG_LOCALE.en,
      alternateLocale: OG_LOCALE.ar,
      images: [defaultOgImage()],
    },
  }
}

export default async function HowItWorksPage() {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={arabic ? "كيف تعمل" : "How it works"}
          title={arabic ? "كيف تعمل إيزي فيزا" : "How EZvisa works"}
          description={
            arabic
              ? `أجب عن بعض الأسئلة عن رحلتك وادفع ${price}. ارفع مستنداتك عندما تكون جاهزًا. نجهّز مستندات طلبك الخمسة خلال يوم إلى يومين بعد استلام بياناتك ومستنداتك كاملة.`
              : `Answer a few questions about your trip and pay ${price}. Upload your documents when you’re ready. We prepare your five application documents within 1–2 days of receiving complete details and uploads.`
          }
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <LocaleLink
              href="/apply"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {arabic ? "ابدأ طلبك" : "Start your application"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
            </LocaleLink>
            <LocaleLink
              href="/pricing"
              className="inline-flex h-12 items-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {arabic ? "الأسعار" : "View pricing"}
            </LocaleLink>
          </div>
        </InnerHero>

        <AfterPaymentTimeline />
        <ServicesSection />
      </div>
      <Footer />
    </>
  )
}
