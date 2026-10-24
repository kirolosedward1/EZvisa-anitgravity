import type { Metadata } from "next"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { HowItWorksSimple } from "@/components/how-it-works-simple"
import { AfterPaymentTimeline } from "@/components/after-payment-timeline"
import { ServicesSection } from "@/components/services-section"
import { ContactSection } from "@/components/contact-section"
import { formatAedLabel } from "@/lib/currency"
import { requestLocale } from "@/lib/request-locale"
import { ltr } from "@/lib/bidi"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  if (arabic) {
    return {
      title: "كيف تعمل: من أول إجابة حتى موعد التأشيرة",
      description: `كيف تجهّز ${ltr("EZvisa")} ملف تأشيرة شنغن: أجب عن بضعة أسئلة، وادفع ${price}، وارفع مستنداتك، واستلم نموذج الطلب وخطاب التغطية وبرنامج الرحلة والحجوزات خلال ${ltr("1–2")} يوم.`,
      alternates: { canonical: "https://www.ezvisa.net/ar/how-it-works" },
      openGraph: {
        title: "كيف تعمل إيزي فيزا",
        description: `أجب عن بضعة أسئلة، وادفع، وارفع مستنداتك. ملفك جاهز خلال ${ltr("1–2")} يوم.`,
        url: "https://www.ezvisa.net/ar/how-it-works",
        type: "website",
      },
    }
  }
  return {
    title: "How It Works: From Your First Answer to Your Visa Appointment",
    description:
      "How EZvisa prepares your Schengen visa file: answer a few questions, pay 249 AED, upload your documents, and get your application form, cover letter, itinerary and reservations in 1–2 days.",
    keywords: ["visa application process", "how to apply Schengen visa UAE", "Schengen visa steps", "Schengen visa appointment Dubai"],
    alternates: { canonical: "https://www.ezvisa.net/how-it-works" },
    openGraph: {
      title: "How EZvisa Works",
      description: "Answer a few questions, pay, upload your documents. Your file is ready in 1–2 days.",
      url: "https://www.ezvisa.net/how-it-works",
      type: "website",
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
          title={arabic ? "أنت تجيب عن الأسئلة. ونحن نجهّز الملف." : "You answer the questions. We prepare the file."}
          description={
            arabic
              ? `يبدأ الأمر في نحو خمس دقائق مقابل ${price}. ثم يجهّز مختص التأشيرات كل ما يطلبه مركز التأشيرات، وتأخذه معك إلى موعدك.`
              : `Starting takes about five minutes and ${price}. A visa specialist then prepares everything the visa centre asks for, and you take it to your appointment.`
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <LocaleLink
              href="/apply"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {arabic ? "ابدأ طلبك" : "Start your application"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
            </LocaleLink>
            <LocaleLink
              href="/pricing"
              className="inline-flex h-12 items-center rounded-full border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {arabic ? "اطّلع على التكلفة" : "See what it costs"}
            </LocaleLink>
          </div>
        </InnerHero>

        <HowItWorksSimple standalone />
        <AfterPaymentTimeline />
        <ServicesSection />
        <ContactSection />
      </div>
      <Footer />
    </>
  )
}
