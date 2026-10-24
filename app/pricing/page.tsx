import { LangText } from "@/components/lang-text"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight, Check, Minus } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { ContactSection } from "@/components/contact-section"
import { formatAedLabel } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { requestLocale } from "@/lib/request-locale"
import { PRICE_AED, priceAed } from "@/lib/shared/wizard-contract"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  const spouse = formatAedLabel(priceAed("yes"), arabic ? "ar" : "en")
  if (arabic) {
    return {
      title: `الأسعار: ${price} لكل طلب تأشيرة شنغن`,
      description: `تتقاضى ${ltr("EZvisa")} ${price} عن كل طلب (${spouse} مع الزوج أو الزوجة) مقابل نموذج الطلب وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق. رسوم السفارة وتأمين السفر منفصلة.`,
      alternates: { canonical: "https://www.ezvisa.net/ar/pricing" },
      openGraph: {
        title: `أسعار ${ltr("EZvisa")}: ${price} لكل طلب`,
        description: "رسم واحد لكل ما نجهّزه. رسوم السفارة وتأمين السفر تُدفع منفصلة.",
        url: "https://www.ezvisa.net/ar/pricing",
        type: "website",
      },
    }
  }
  return {
    title: "Pricing: 249 AED per Schengen Visa Application",
    description:
      "EZvisa charges 249 AED per application (498 AED with your spouse) for the application form, cover letter, itinerary, and flight and hotel reservations. Embassy fees and travel insurance are separate.",
    keywords: ["Schengen visa cost UAE", "Schengen visa fee Dubai", "visa application service price", "Europe visa cost UAE"],
    alternates: { canonical: "https://www.ezvisa.net/pricing" },
    openGraph: {
      title: "EZvisa Pricing: 249 AED per Application",
      description: "One fee for everything we prepare. Embassy fees and travel insurance are paid separately.",
      url: "https://www.ezvisa.net/pricing",
      type: "website",
    },
  }
}

const INCLUDED = [
  { en: "Schengen application form, filled in and checked", ar: "نموذج طلب شنغن، معبّأ ومراجع" },
  { en: "Cover letter written for your trip", ar: "خطاب تغطية مكتوب لرحلتك" },
  { en: "Day-by-day itinerary that matches your bookings", ar: "برنامج يومي يطابق حجوزاتك" },
  { en: "Flight reservation for the visa, no ticket to buy", ar: "حجز طيران للتأشيرة، من دون شراء تذكرة" },
  { en: "Hotel reservation for every night of the trip", ar: "حجز فندق لكل ليلة من الرحلة" },
  { en: "Every document you upload checked by a visa specialist", ar: "كل مستند ترفعه يراجعه مختص تأشيرات" },
  { en: "Answers on WhatsApp and email until your appointment", ar: `إجابات عبر ${ltr("WhatsApp")} والبريد حتى موعدك` },
]

const SEPARATE = [
  {
    title: { en: "Embassy visa fee", ar: "رسوم تأشيرة السفارة" },
    body: {
      en: "€90 for adults and €45 for children aged 6 to 12, paid in dirhams at the visa centre on the day.",
      ar: `${ltr("€90")} للبالغين و${ltr("€45")} للأطفال من 6 إلى 12 عامًا، تُدفع بالدرهم في مركز التأشيرات يوم الموعد.`,
    },
  },
  {
    title: { en: "Visa centre service charge", ar: "رسوم خدمة مركز التأشيرات" },
    body: {
      en: "Set by VFS Global, BLS or TLScontact, depending on the country. Also paid at your appointment.",
      ar: `تحددها ${ltr("VFS Global")} أو ${ltr("BLS")} أو ${ltr("TLScontact")} حسب الدولة. وتُدفع أيضًا في موعدك.`,
    },
  },
  {
    title: { en: "Travel insurance", ar: "تأمين السفر" },
    body: {
      en: "Every embassy asks for medical cover of at least €30,000. Add a policy through us as an extra, or bring your own.",
      ar: `كل سفارة تطلب تغطية طبية لا تقل عن ${ltr("€30,000")}. أضف وثيقة عبرنا كإضافة، أو أحضر وثيقتك.`,
    },
  },
  {
    title: { en: "Translation, attestation and courier", ar: "الترجمة والتصديق والتوصيل" },
    body: {
      en: "Only if a document needs it. We tell you when that's the case.",
      ar: "فقط إذا احتاج مستند إلى ذلك. نخبرك عندما يكون الأمر كذلك.",
    },
  },
]

export default async function PricingPage() {
  const arabic = (await requestLocale()) === "ar"
  const pick = (en: ReactNode, ar: ReactNode) => (arabic ? ar : en)
  const withSpouse = priceAed("yes")
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  const spouse = formatAedLabel(withSpouse, arabic ? "ar" : "en")

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={pick("Pricing", "الأسعار")}
          title={pick(`${price} for your whole visa file.`, `${price} مقابل ملف التأشيرة كاملًا.`)}
          description={pick(
            `One fee, paid when you start. Travelling with your spouse? We prepare both applications together for ${spouse}.`,
            `رسم واحد يُدفع عند البدء. تسافر مع الزوج أو الزوجة؟ نجهّز الطلبين معًا مقابل ${spouse}.`,
          )}
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* What the fee covers */}
            <div className="flex flex-col gap-8 rounded-3xl border border-border/70 bg-card p-6 sm:p-10">
              <div className="flex flex-col gap-2">
                <h2 className="panel-title text-muted-foreground">{pick("EZvisa service fee", <>رسوم خدمة <bdi dir="ltr">EZvisa</bdi></>)}</h2>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span dir="ltr" className="text-5xl font-semibold tracking-tight tabular-nums text-foreground">
                    {price}
                  </span>
                  <span className="text-sm text-muted-foreground">{pick("per application", "لكل طلب")}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {pick(`${spouse} for you and your spouse when you travel together.`, `${spouse} لك ولزوجك أو زوجتك عند السفر معًا.`)}
                </p>
              </div>

              <ul className="flex flex-col gap-3.5 border-t border-border/70 pt-8">
                {INCLUDED.map((item) => (
                  <li key={item.en} className="flex items-start gap-3 text-base text-foreground">
                    <Check className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    {pick(item.en, item.ar)}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <LocaleLink
                  href="/apply"
                  className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {pick("Start your application", "ابدأ طلبك")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
                </LocaleLink>
                <p className="text-sm text-muted-foreground">{pick("Ready in 1–2 days after your documents are in.", <>جاهز خلال {ltr("1–2")} يوم بعد وصول مستنداتك.</>)}</p>
              </div>
            </div>

            {/* What is paid elsewhere */}
            <div className="flex flex-col gap-6 rounded-3xl bg-secondary/60 p-6 sm:p-10">
              <div className="flex flex-col gap-2">
                <h2 className="panel-title text-foreground">{pick("Paid separately", "يُدفع بشكل منفصل")}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{pick("These go to the embassy, the visa centre or the insurer, not to us. EZvisa is not VAT-registered; prices shown are final.", "هذه تذهب إلى السفارة أو مركز التأشيرات أو شركة التأمين، لا إلينا. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية.")}</p>
              </div>
              <ul className="flex flex-col">
                {SEPARATE.map((item) => (
                  <li key={item.title.en} className="flex items-start gap-3 border-t border-border/70 py-4 first:border-0 first:pt-0">
                    <Minus className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">{pick(item.title.en, item.title.ar)}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{pick(item.body.en, item.body.ar)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Refunds: exactly what the refund policy covers */}
        <section className="border-t border-border/70 py-20 md:py-24">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{pick("Refunds", "الاسترداد")}</span>
              <h2 className="text-balance text-foreground">{pick("When you get the fee back.", "متى يُعاد الرسم.")}</h2>
              <LocaleLink href="/refund-policy" className="text-sm font-medium text-primary hover:underline">
                {pick("Read the full refund policy", "اقرأ سياسة الاسترداد كاملة")}
              </LocaleLink>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h3 className="panel-title text-foreground">{pick("Full refund", "استرداد كامل")}</h3>
                <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    {pick("You cancel before we start reviewing your documents.", "تلغي قبل أن نبدأ مراجعة مستنداتك.")}
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    {pick("We can't deliver your file because of an error on our side.", "نعجز عن تسليم ملفك بسبب خطأ من جانبنا.")}
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                    {pick("You were charged twice for the same application.", "دُفعت الرسوم مرتين عن الطلب نفسه.")}
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="panel-title text-foreground">{pick("No refund", "لا استرداد")}</h3>
                <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    {pick("The embassy refuses the visa. The decision is theirs, and our work on the file is done.", "ترفض السفارة التأشيرة. القرار لها، وعملنا على الملف قد اكتمل.")}
                  </li>
                  <li className="flex items-start gap-3">
                    <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                    {pick("You change your mind after we've reviewed your documents.", "تغيّر رأيك بعد أن نراجع مستنداتك.")}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <ContactSection />
      </div>
      <Footer />
    </>
  )
}
