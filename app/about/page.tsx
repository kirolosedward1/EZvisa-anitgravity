import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Minus } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { CompanyLegalNotice } from "@/components/legal/company-details"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { LatestGuides } from "@/components/latest-guides"
import { formatAedLabel } from "@/lib/currency"
import { requestLocale } from "@/lib/request-locale"
import { withArabicMeta } from "@/lib/page-meta"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export async function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "About EZvisa | Schengen Visa Specialists for UAE Residents",
      description:
        "EZvisa prepares Schengen visa applications for people living in the UAE: the application form, cover letter, itinerary and reservations, checked by a visa specialist.",
      keywords: ["about EZvisa", "Schengen visa specialists UAE", "visa application service Dubai"],
      alternates: {
        canonical: "https://www.ezvisa.net/about",
      },
      openGraph: {
        title: "About EZvisa",
        description: "Schengen visa applications prepared by specialists for UAE residents.",
        url: "https://www.ezvisa.net/about",
        type: "website",
      },
    },
    {
      title: "عن إيزي فيزا",
      description:
        "تجهّز إيزي فيزا طلبات تأشيرة شنغن للمقيمين في الإمارات: نموذج الطلب وخطاب التغطية وبرنامج الرحلة والحجوزات، ويراجعها مختص تأشيرات.",
      path: "/ar/about",
    },
  )
}

export default async function AboutPage() {
  const arabic = (await requestLocale()) === "ar"
  const pick = (en: ReactNode, ar: ReactNode) => (arabic ? ar : en)
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")

  const facts = [
    { value: price, label: pick("One fee per application", "رسم واحد لكل طلب") },
    { value: "29", label: pick("Schengen countries", "دولة شنغن") },
    { value: arabic ? <><bdi dir="ltr">1–2</bdi> يوم</> : "1–2 days", label: pick("To prepare your file", "لتجهيز ملفك") },
    { value: "5", label: pick("Documents we prepare", "مستندات نجهّزها") },
  ]

  const weDont = arabic
    ? [
        "لسنا سفارة ولا مركز تأشيرات، ولسنا تابعين لأي منهما. قرارات التأشيرة تتخذها السفارة.",
        "لا نستطيع ضمان الموافقة على تأشيرتك.",
        "لا نحجز مواعيد مراكز التأشيرات ولا نحضرها معك.",
        "لا نبيع تذاكر طيران. حجوزات الطيران والفندق التي نوفرها مخصصة لطلب التأشيرة.",
      ]
    : [
        "We are not an embassy or a visa centre, and we are not affiliated with one. Visa decisions are made by the embassy.",
        "We can't guarantee that your visa will be approved.",
        "We don't book visa centre appointments or attend them with you.",
        "We don't sell flight tickets. The flight and hotel reservations we provide are for your visa application.",
      ]

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={pick("About EZvisa", "عن إيزي فيزا")}
          title={pick(
            "About EZvisa",
            "عن إيزي فيزا",
          )}
          description={pick(
            "EZvisa prepares Schengen visa applications for UAE residents. We complete your forms, prepare your supporting documents and check everything before you submit it.",
            "تجهّز إيزي فيزا طلبات تأشيرة شنغن للمقيمين في الإمارات. نعبّئ نماذجك ونجهّز مستنداتك الداعمة ونراجع كل شيء قبل أن تقدّمه.",
          )}
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <h2 className="text-balance text-foreground">{pick("What we do", "ماذا نفعل")}</h2>
            <div className="flex flex-col gap-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {arabic ? (
                <>
                  <p>
                    تخبرنا عن رحلتك وترفع مستنداتك. ثم يعبّئ مختص التأشيرات نموذج طلب شنغن، ويكتب خطاب التغطية، ويضع برنامجًا يوميًا للرحلة، ويرتّب حجوزات الطيران والفندق لتواريخ سفرك.
                  </p>
                  <p>
                    قبل أن نرسل إليك الملف، نتأكد من تطابق التواريخ والوجهات وبيانات العمل وكشوف الحساب في كل المستندات. فالاختلاف بين المستندات سبب شائع لطلب السفارة معلومات إضافية أو لرفض الطلب.
                  </p>
                  <p>
                    يقيم أغلب عملائنا في الإمارات بتأشيرة إقامة ويحملون جوازات تحتاج إلى تأشيرة شنغن، مثل الجوازات الهندية والمصرية والأردنية والباكستانية.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You tell us about your trip and upload your documents. A visa specialist then completes your Schengen
                    application form, writes your cover letter, plans a day-by-day itinerary, and arranges flight and hotel
                    reservations for your travel dates.
                  </p>
                  <p>
                    Before we send you the file, we check that your dates, destinations, employment details and bank statements
                    match across every document. Inconsistencies between documents are a common reason for an embassy to ask for
                    more information or to refuse an application.
                  </p>
                  <p>
                    Most of our customers live in the UAE on a residence visa and hold a passport that needs a Schengen visa, such as
                    an Indian, Egyptian, Jordanian or Pakistani passport.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-secondary/40">
          <dl className="container mx-auto grid max-w-6xl grid-cols-2 gap-x-8 px-4 sm:px-6 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={String(fact.label)} className="flex flex-col gap-1 py-8">
                <dt className="order-2 text-sm text-muted-foreground">{fact.label}</dt>
                <dd className="order-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                  {arabic && typeof fact.value === "string" ? <bdi dir="ltr">{fact.value}</bdi> : fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="py-20 md:py-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">{pick("What we don't do", "ما لا نفعله")}</h2>
            </div>
            <ul className="flex flex-col">
              {weDont.map((line) => (
                <li key={line} className="flex items-start gap-4 border-t border-border/70 py-5 text-base leading-relaxed text-foreground first:border-0 first:pt-0">
                  <Minus className="mt-1.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <LatestGuides />
      </div>
      <CompanyLegalNotice />
      <Footer />
    </>
  )
}
