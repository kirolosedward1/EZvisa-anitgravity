import { destinations } from "@/lib/destinations"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { InnerHero } from "@/components/inner-hero"
import { CountryFacts } from "@/components/documents/country-facts"
import { DocumentSplit } from "@/components/documents/document-split"
import { AfterPaymentTimeline } from "@/components/after-payment-timeline"
import { LatestGuides } from "@/components/latest-guides"
import { getProviderForDestination } from "@/lib/visa-rules"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { countryNameAr } from "@/lib/countries"
import { formatAedLabel } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { requestLocale } from "@/lib/request-locale"
import { Button } from "@/components/ui/button"
import { DigitRanges } from "@/components/digit-ranges"
import { ArrowRight } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { message } from "@/messages"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export async function generateStaticParams() {
  return destinations.map((dest) => ({
    slug: dest.slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const destination = destinations.find((d) => d.slug === slug)

  if (!destination) {
    return {
      title: "Visa Destination",
    }
  }

  const arabic = (await requestLocale()) === "ar"
  const nameAr = countryNameAr(destination.name)
  const title = arabic
    ? `قدّم لطلب تأشيرة شنغن إلى ${nameAr} من الإمارات`
    : `Apply for ${destination.name} Schengen Visa from UAE`
  const description = arabic
    ? `نجهّز ملف تأشيرة ${nameAr} من دبي وأبوظبي خلال ${ltr("1–2")} يوم. قرار السفارة يستغرق وقتًا أطول.`
    : `Get your ${destination.name} visa file prepared from Dubai and Abu Dhabi. We prepare your application in 1–2 days. The embassy's decision takes longer.`
  const path = arabic ? `/ar/destinations/${slug}` : `/destinations/${slug}`

  return {
    title,
    description,
    keywords: arabic
      ? undefined
      : [
          `apply ${destination.name} visa UAE`,
          `${destination.name} Schengen visa Dubai`,
          `${destination.name} visa requirements Dubai`,
          `Schengen visa documents ${destination.name}`,
          `VFS ${destination.name} appointment Dubai`,
          `EZvisa ${destination.name}`,
        ],
    alternates: {
      canonical: `https://www.ezvisa.net${path}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.ezvisa.net${path}`,
      type: "website",
      locale: arabic ? "ar" : "en_US",
      images: [
        {
          url: destination.image,
          width: 1200,
          height: 630,
          alt: arabic ? `تأشيرة شنغن إلى ${nameAr} من الإمارات` : `${destination.name} Schengen Visa UAE`,
        },
      ],
    },
  }
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const destination = destinations.find((d) => d.slug === slug)

  if (!destination) {
    notFound()
  }

  const arabic = (await requestLocale()) === "ar"
  const name = destination.name
  const nameAr = countryNameAr(name)
  const centre = getProviderForDestination(slug).replace(/ Center$/, "")
  const centreAr = ltr(centre)
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  const applyHref = `/apply?to=${encodeURIComponent(name)}`
  const place = arabic ? nameAr : name

  const faqs = arabic
    ? [
        {
          question: `هل أحتاج إلى تأشيرة لـ${place} إذا كنت أعيش في الإمارات؟`,
          answer: `الأمر يعتمد على جوازك لا على إقامتك. يحتاج حاملو الجوازات الهندية والباكستانية والمصرية والأردنية والفلبينية وكثير من الجوازات الأخرى إلى تأشيرة شنغن لـ${place}، حتى مع إقامة إماراتية أو إقامة ذهبية. مواطنو الإمارات لا يحتاجون إليها للإقامة حتى 90 يومًا.`,
        },
        {
          question: `أين أقدّم لطلب تأشيرة ${place} في الإمارات؟`,
          answer: `تتولى ${centreAr} طلبات تأشيرة ${place}، ولها مراكز في دبي وأبوظبي. تحجز موعدك على موقعهم، وفي الموعد تقدّم ملفك وتدفع رسوم السفارة وتسجّل بصماتك.`,
        },
        {
          question: `هل أستطيع زيارة دول أخرى بتأشيرة ${place}؟`,
          answer: `نعم. تأشيرة شنغن من ${place} تتيح السفر إلى 29 دولة شنغن كلها. يجب أن تكون ${place} وجهتك الرئيسية (حيث تقضي أكثر الليالي)، أو أول دخول إذا تساوت الليالي.`,
        },
        {
          question: `متى أقدّم لطلب تأشيرة ${place}؟`,
          answer: "يمكنك التقديم قبل السفر بمدة تصل إلى 6 أشهر، ولا يقل عن 15 يومًا. تمتلئ المواعيد بسرعة قبل عطلتي الصيف والشتاء، لذا ننصح بالبدء قبل السفر بـ6 إلى 8 أسابيع.",
        },
        {
          question: "كم تتقاضى إيزي فيزا، ومتى يُسترد الرسم؟",
          answer: `${price} عن كل طلب، تُدفع عند البدء. يُعاد الرسم إذا ألغيت قبل أن نبدأ مراجعة مستنداتك، أو إذا تعذّر التسليم بسبب خطأ من جانبنا، أو إذا دُفع المبلغ مرتين. رفض سفارة ${place} لا يُسترد، ورسوم السفارة ومركز التأشيرات تُدفع لهم لا لنا.`,
        },
        {
          question: "هل تُضاف ضريبة القيمة المضافة عند الدفع؟",
          answer: "لا. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية. قرار التأشيرة للسفارة دائمًا، ولا يستطيع أحد ضمان القبول.",
        },
      ]
    : [
        {
          question: `Do I need a visa for ${name} if I live in the UAE?`,
          answer: `It depends on your passport, not your residence. Holders of Indian, Pakistani, Egyptian, Jordanian, Filipino and many other passports need a Schengen visa for ${name}, even with a UAE residence visa or Golden Visa. UAE citizens don't need one for stays of up to 90 days.`,
        },
        {
          question: `Where do I apply for a ${name} visa in the UAE?`,
          answer: `${name} visa applications are handled by ${centre}, which has centres in Dubai and Abu Dhabi. You book your appointment on their website. At the appointment, you submit your file, pay the embassy fee and give your fingerprints.`,
        },
        {
          question: `Can I visit other countries on a ${name} visa?`,
          answer: `Yes. A Schengen visa from ${name} lets you travel across all 29 Schengen countries. ${name} has to be your main destination (where you spend the most nights), or your first entry if the nights are split evenly.`,
        },
        {
          question: `When should I apply for my ${name} visa?`,
          answer: "You can apply up to 6 months before you travel and no later than 15 days before. Appointments fill up quickly before the summer and winter holidays, so we recommend starting 6 to 8 weeks before you travel.",
        },
        {
          question: "What does EZvisa cost, and when is it refunded?",
          answer: `${PRICE_AED} AED per application, paid when you start. You get it back if you cancel before we start reviewing your documents, if we can't deliver because of an error on our side, or if you paid twice. A refusal by the ${name} embassy isn't refunded, and embassy and visa centre fees are paid to them, not us.`,
        },
        {
          question: "Is VAT added at checkout?",
          answer: "No. EZvisa is not VAT-registered; prices shown are final. The visa decision is always made by the embassy, so no one can guarantee approval.",
        },
      ]

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={place}
          title={arabic ? `تأشيرة شنغن إلى ${place} من الإمارات` : `${name} Schengen visa from the UAE`}
          description={
            arabic ? (
              <>
                نجهّز طلب تأشيرة {place} كاملًا: نموذج الطلب وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق. جاهز خلال{" "}
                <bdi dir="ltr">1–2</bdi> يوم مقابل <bdi dir="ltr">{price}</bdi>.
              </>
            ) : (
              `We prepare your complete ${name} visa application: the application form, cover letter, itinerary, and flight and hotel reservations. Ready in 1–2 days for ${PRICE_AED} AED.`
            )
          }
          backgroundImage={destination.image}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <LocaleLink
              href={applyHref}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {arabic ? `قدّم على تأشيرة ${place}` : `Apply for ${name}`}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
            </LocaleLink>
            <LocaleLink
              href={destination.documentPath}
              className="inline-flex h-12 items-center rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {arabic ? "المستندات" : "See the documents"}
            </LocaleLink>
          </div>
        </InnerHero>

        <CountryFacts slug={slug} />

        <section className="py-20 md:py-24">
          <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2 className="text-balance text-foreground">{arabic ? `مستندات طلب ${place}` : `Documents for your ${name} application`}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {arabic
                  ? "تقدّم أنت مستنداتك الشخصية، ونجهّز الباقي. ونتأكد أيضًا من تطابق كل المستندات قبل أن تقدّم طلبك."
                  : "You provide your personal documents, and we prepare the rest. We also check that all of them are consistent before you submit your application."}
              </p>
            </div>
            <DocumentSplit country={name} />
          </div>
        </section>

        <AfterPaymentTimeline />

        <section className="py-20 md:py-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">{arabic ? "الأسئلة الشائعة" : "Frequently asked questions"}</h2>
            </div>
            <Accordion type="single" collapsible className="w-full border-t border-border/70">
              {faqs.map((faq, idx) => (
                <AccordionItem key={faq.question} value={`faq-${idx}`} className="border-b border-border/70">
                  <AccordionTrigger className="py-5 text-start text-base font-medium text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <LatestGuides />

        <section className="pb-16 md:pb-20">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 rounded-lg border border-[#E5E7EB] bg-card p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[20px] font-semibold leading-snug text-foreground">
                  {message(arabic ? "ar" : "en", "dest.closeTitle", { name: place })}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <DigitRanges text={message(arabic ? "ar" : "en", "dest.closeBody", { price })} />
                </p>
              </div>
              <Button asChild className="w-full shrink-0 md:w-auto">
                <LocaleLink href={applyHref}>
                  <span>{message(arabic ? "ar" : "en", "services.start")}</span>
                  <ArrowRight aria-hidden="true" />
                </LocaleLink>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
