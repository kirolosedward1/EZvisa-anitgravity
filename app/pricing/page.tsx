import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { LangText } from "@/components/lang-text"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight, Check, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
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
  { en: "Completed Schengen visa application form", ar: "نموذج طلب تأشيرة شنغن معبّأ" },
  { en: "Cover letter for your trip", ar: "خطاب تغطية لرحلتك" },
  { en: "Day-by-day travel itinerary", ar: "برنامج رحلة يومي" },
  { en: "Flight reservation (no ticket purchase needed)", ar: "حجز طيران (من دون شراء تذكرة)" },
  { en: "Hotel reservations for your full stay", ar: "حجوزات فندق لكامل إقامتك" },
  { en: "Document check by a visa specialist", ar: "مراجعة المستندات من مختص تأشيرات" },
  { whatsapp: true, en: "Support on WhatsApp and email until your appointment", ar: `دعم عبر ${ltr("WhatsApp")} والبريد حتى موعدك` },
]

const SEPARATE = [
  {
    title: { en: "Embassy visa fee", ar: "رسوم تأشيرة السفارة" },
    body: {
      en: "Standard fee: €90 for adults, €45 for children aged 6–11, and no visa fee for children under 6. Exemptions may apply. Follow the centre’s payment instructions.",
      ar: `${ltr("€90")} للبالغين و${ltr("€45")} للأطفال من 6 إلى 11 عامًا، ودون رسوم تأشيرة لمن هم دون 6. قد تنطبق إعفاءات. اتبع تعليمات الدفع الخاصة بالمركز.`,
    },
  },
  {
    title: { en: "Visa centre service charge", ar: "رسوم خدمة مركز التأشيرات" },
    body: {
      en: "Set by VFS Global, BLS or TLScontact, depending on the country. Payment timing and amounts depend on the centre.",
      ar: `تحددها ${ltr("VFS Global")} أو ${ltr("BLS")} أو ${ltr("TLScontact")} حسب الدولة. ويختلف موعد الدفع والمبلغ حسب المركز.`,
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
      en: "Only needed for some documents. We'll let you know if any apply to you.",
      ar: "مطلوبة لبعض المستندات فقط. سنخبرك إن كان أي منها ينطبق عليك.",
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
      <div className="ez-pricing-page min-h-screen bg-background">
        <InnerHero
          badge={pick("Pricing", "الأسعار")}
          title={pick("A clear price. A carefully prepared file.", "سعر واضح. وملف يُجهّز بعناية.")}
          description={pick(
            `One fixed fee of ${price} per application, or ${spouse} when your spouse travels with you. Embassy fees and travel insurance are paid separately.`,
            `رسم ثابت قدره ${price} لكل طلب، أو ${spouse} عندما يسافر معك الزوج أو الزوجة. رسوم السفارة وتأمين السفر تُدفع بشكل منفصل.`,
          )}
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* What the fee covers */}
            <div className="ez-price-included flex flex-col gap-8 p-6 sm:p-10">
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
                    {item.whatsapp ? <WhatsAppIcon className="mt-1 size-4 shrink-0 text-primary" /> : <Check className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />}
                    {pick(item.en, item.ar)}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Button asChild className="shrink-0">
                  <LocaleLink href="/apply">
                    <span>{pick("Start your application", "ابدأ طلبك")}</span>
                    <ArrowRight aria-hidden="true" />
                  </LocaleLink>
                </Button>
                <p className="text-sm text-muted-foreground">{pick("Prepared in 1–2 days after we receive your complete details and documents.", <>يصبح ملفك جاهزًا خلال <bdi dir="ltr">1–2</bdi> يوم بعد استلام بياناتك ومستنداتك كاملة.</>)}</p>
              </div>
            </div>

            {/* What is paid elsewhere */}
            <div className="ez-price-separate flex flex-col gap-6 p-6 sm:p-10">
              <div className="flex flex-col gap-2">
                <h2 className="panel-title text-foreground">{pick("Paid separately", "يُدفع بشكل منفصل")}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{pick("These costs are paid to the embassy, the visa centre or the insurer. EZvisa is not VAT-registered, so the prices shown are final.", "تُدفع هذه التكاليف للسفارة أو مركز التأشيرات أو شركة التأمين. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة، لذا فالأسعار المعروضة نهائية.")}</p>
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
              <h2 className="text-balance text-foreground">{pick("Refunds", "الاسترداد")}</h2>
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
                    {pick("The embassy refuses your visa application.", "رفض السفارة لطلب تأشيرتك.")}
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

      </div>
      <Footer />
    </>
  )
}
