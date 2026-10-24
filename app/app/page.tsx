import type { Metadata } from "next"
import { Check, MessageCircle, Smartphone } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { LangText } from "@/components/lang-text"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { AppFaq } from "@/components/app/app-faq"
import { PRICE_LABEL } from "@/components/app/content"
import { appCopy } from "@/components/app/localized"
import { DetailsList } from "@/components/app/details-list"
import { DownloadSection } from "@/components/app/download-section"
import { HandoffSection } from "@/components/app/handoff-section"
import { HeroDevice } from "@/components/app/hero-device"
import { MotionPreferences, Reveal } from "@/components/app/reveal"
import { SectionHeading } from "@/components/app/section-heading"
import { StatusTimeline } from "@/components/app/status-timeline"
import { StoreBadges } from "@/components/app/store-badges"
import { Walkthrough } from "@/components/app/walkthrough"
import { requestLocale } from "@/lib/request-locale"
import { generateBreadcrumbSchema, generateFAQSchema, generateStructuredData } from "@/lib/seo"
import { getWhatsAppUrl } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"
import hero from "@/components/app/app-hero.module.css"

const PAGE_URL = "https://www.ezvisa.net/app"
const TITLE = "EZvisa App – Schengen visa from your phone"
const DESCRIPTION = `Apply for your Schengen visa, pay ${PRICE_LABEL} when it's ready, upload your documents and follow the real status from the EZvisa iPhone app. Same account as ezvisa.net. Android coming soon.`
const TITLE_AR = "تطبيق إيزي فيزا لتأشيرة شنغن"
const DESCRIPTION_AR =
  "قدّم لطلب تأشيرة شنغن، وادفع 249 درهم عندما يكون الملف جاهزًا، وارفع مستنداتك وتابع الحالة من تطبيق إيزي فيزا لآيفون. الحساب نفسه على ezvisa.net. أندرويد قريبًا."

export async function generateMetadata(): Promise<Metadata> {
  const english: Metadata = {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    keywords: ["EZvisa app", "Schengen visa app", "visa application app UAE", "track visa application", "iPhone visa app"],
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: PAGE_URL,
      siteName: "EZvisa",
      type: "website",
      locale: "en_US",
      images: [{ url: "/app/og.png", width: 1200, height: 630, alt: "The EZvisa app shown on an iPhone" }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: ["/app/og.png"],
    },
  }
  if ((await requestLocale()) !== "ar") return english
  return {
    ...english,
    title: TITLE_AR,
    description: DESCRIPTION_AR,
    alternates: { canonical: "https://www.ezvisa.net/ar/app" },
    openGraph: {
      title: TITLE_AR,
      description: DESCRIPTION_AR,
      url: "https://www.ezvisa.net/ar/app",
      siteName: "EZvisa",
      type: "website",
      locale: "ar",
      images: [{ url: "/app/og.png", width: 1200, height: 630, alt: "تطبيق إيزي فيزا على آيفون" }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE_AR,
      description: DESCRIPTION_AR,
      images: ["/app/og.png"],
    },
  }
}

const WHATSAPP_URL = getWhatsAppUrl("Hi EZvisa, I have a question about the app.")

export default async function AppPage() {
  const arabic = (await requestLocale()) === "ar"
  const copy = appCopy(arabic ? "ar" : "en")
  const description = arabic ? DESCRIPTION_AR : DESCRIPTION
  const structuredData = generateStructuredData(
    {
      "@type": "SoftwareApplication",
      "@id": `${PAGE_URL}#app`,
      name: "EZvisa",
      url: arabic ? "https://www.ezvisa.net/ar/app" : PAGE_URL,
      description,
      operatingSystem: "iOS",
      applicationCategory: "TravelApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
      publisher: { "@id": "https://www.ezvisa.net/#organization" },
    },
    generateBreadcrumbSchema([
      { name: arabic ? "الرئيسية" : "Home", url: arabic ? "/ar" : "/" },
      { name: arabic ? "التطبيق" : "App", url: arabic ? "/ar/app" : "/app" },
    ]),
    generateFAQSchema(copy.faqs.map(({ question, answer }) => ({ question, answer }))),
  )

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <MotionPreferences>
        <div id="main-content" className="bg-background">
          {/* Hero */}
          <section className="pb-16 pt-32 md:pb-24 md:pt-40" aria-labelledby="app-hero-heading">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className="flex flex-col items-start gap-6 text-start">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary",
                      hero.enter,
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                    {arabic ? "متاح لآيفون" : "Available for iPhone"}
                  </span>
                  <h1
                    id="app-hero-heading"
                    className={cn(
                      "text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl",
                      hero.enter,
                      hero.delay1,
                    )}
                  >
                    <LangText en="Your Schengen visa application, on your phone." ar="طلب تأشيرة شنغن، على هاتفك." />
                  </h1>
                  <p className={cn("max-w-md text-lg leading-relaxed text-muted-foreground", hero.enter, hero.delay2)}>
                    {arabic ? (
                      <>
                        ابدأ الطلب، وادفع <bdi dir="ltr">{copy.priceLabel}</bdi> عندما يكون الملف جاهزًا، وأضف مستنداتك وتابع حالته، من الحساب نفسه الذي تستخدمه على ezvisa.net.
                      </>
                    ) : (
                      <>
                        Start an application, pay {PRICE_LABEL} when it&apos;s ready, add your documents and follow its
                        status, from the same account you use on ezvisa.net.
                      </>
                    )}
                  </p>
                  <div className={cn(hero.enter, hero.delay3)}>
                    <StoreBadges />
                  </div>
                  <p className={cn("text-sm leading-relaxed text-muted-foreground", hero.enter, hero.delay4)}>
                    {arabic ? "التنزيل مجاني. آيفون الآن، وأندرويد قريبًا." : "Free to download. iPhone now, Android soon."}
                  </p>
                </div>

                <div className={cn("flex justify-center lg:justify-end", hero.enter, hero.delay2)}>
                  <HeroDevice
                    screens={copy.heroScreens}
                    frameClassName="w-64 sm:w-72 lg:w-80 xl:w-88"
                    sizes="(min-width: 1280px) 352px, (min-width: 1024px) 320px, (min-width: 640px) 288px, 256px"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Walkthrough */}
          <section className="border-t border-border bg-secondary py-20 md:py-28" aria-labelledby="app-walkthrough-heading">
            <div className="container mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:gap-16">
              <Reveal>
                <SectionHeading
                  id="app-walkthrough-heading"
                  chip={arabic ? "كيف يعمل التطبيق" : "How the app works"}
                  title={<LangText en="Apply, pay, upload, track." ar="قدّم، ادفع، ارفع، وتابع." />}
                  lede={arabic ? "سؤال واحد في كل شاشة، بالترتيب الذي يحتاجه المختصون، ويُحفظ وأنت تتقدّم." : "One question per screen, in the order our experts need the answers, saved as you go."}
                />
              </Reveal>
              <Walkthrough steps={copy.walkthrough} />
            </div>
          </section>

          {/* Status */}
          <section className="py-20 md:py-28" aria-labelledby="app-status-heading">
            <div className="container mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-16">
              <div className="flex flex-col gap-8 lg:col-span-6">
                <Reveal>
                  <SectionHeading
                    id="app-status-heading"
                    chip={arabic ? "متابعة الحالة" : "Status tracking"}
                    title={<LangText en="The same status our team sees." ar="نفس الحالة التي يراها فريقنا." />}
                    lede={
                      arabic
                        ? "يمر طلبك بمراحل ثابتة. كل مرحلة مختومة بوقت حدوثها، وتظهر تفاصيل الموعد فور إدخال الفريق لها."
                        : "Your application moves through fixed stages. Each one is stamped with the time it happened, and appointment details appear as soon as our staff enter them."
                    }
                  />
                </Reveal>
                <Reveal delay={0.05} className="flex flex-col gap-6">
                  <ul className="flex flex-col gap-3">
                    {copy.statusPoints.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-base leading-relaxed text-muted-foreground">
                        <Check className="mt-1.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 font-medium text-primary hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {arabic ? "راسلنا على واتساب" : "Message us on WhatsApp"}
                  </a>
                </Reveal>
              </div>
              <div className="lg:col-span-6">
                <StatusTimeline steps={copy.statusSteps} caption={arabic ? "مثال لطلب" : "Example application"} />
              </div>
            </div>
          </section>

          {/* Website and app */}
          <section className="border-t border-border bg-secondary py-20 md:py-28" aria-labelledby="app-handoff-heading">
            <div className="container mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:gap-16">
              <Reveal>
                <SectionHeading
                  id="app-handoff-heading"
                  chip={arabic ? "الموقع والتطبيق" : "Website and app"}
                  title={<LangText en="Start on ezvisa.net. Finish on your phone." ar="ابدأ على ezvisa.net. وأكمل على هاتفك." />}
                  lede={
                    arabic
                      ? "الموقع والتطبيق يشتركان في حساب واحد ونظام واحد. الطلب الذي تبدأه في المتصفح ينتظرك في التطبيق عند السؤال نفسه، والعكس صحيح."
                      : "The website and the app share one account and one backend. An application you start in a browser is waiting in the app at the same question, and the other way round."
                  }
                  align="center"
                />
              </Reveal>
              <HandoffSection />
              <p className="text-center text-sm text-muted-foreground">
                {arabic ? "سجّل الدخول بالبريد نفسه الذي استخدمته على الموقع." : "Sign in with the same email you used on the website."}
              </p>
            </div>
          </section>

          {/* Details */}
          <section className="py-20 md:py-28" aria-labelledby="app-details-heading">
            <div className="container mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-4">
                <Reveal>
                  <SectionHeading
                    id="app-details-heading"
                    chip={arabic ? "أيضًا في التطبيق" : "Also in the app"}
                    title={<LangText en="Things you'd only notice if they were missing." ar="تفاصيل لن تلاحظها إلا إذا غابت." />}
                  />
                </Reveal>
              </div>
              <div className="lg:col-span-8">
                <Reveal delay={0.05}>
                  <DetailsList items={copy.details} />
                </Reveal>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="border-t border-border bg-secondary py-20 md:py-28" aria-labelledby="app-faq-heading">
            <div className="container mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
              <Reveal>
                <SectionHeading id="app-faq-heading" title={<LangText en="Common questions" ar="أسئلة شائعة" />} align="center" />
              </Reveal>
              <Reveal delay={0.05}>
                <AppFaq faqs={copy.faqs} />
              </Reveal>
            </div>
          </section>

          {/* Download */}
          <section className="py-20 md:py-28" aria-labelledby="app-download-heading">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal>
                <DownloadSection />
              </Reveal>
            </div>
          </section>
        </div>
      </MotionPreferences>

      <Footer />
    </>
  )
}
