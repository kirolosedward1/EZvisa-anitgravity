import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Minus } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { CompanyLegalNotice } from "@/components/legal/company-details"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { ContactSection } from "@/components/contact-section"
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
        "لسنا سفارة ولا مركز تأشيرات، ولا نعمل لصالح أي منهما. قرار التأشيرة للسفارة دائمًا.",
        "لا نعد بالقبول. لا يستطيع أحد ذلك بصدق، ومن يعد به يبيعك شيئًا آخر.",
        "لا نحجز موعد مركز التأشيرات ولا نحضره عنك. أنت تحجز الموعد، ونحن نتأكد من أن الملف الذي تحضره صحيح.",
        "لا نبيع تذاكر طيران. حجوزات الطيران والفندق لغرض التأشيرة، حتى لا تدفع ثمن رحلة قبل أن تحصل عليها.",
      ]
    : [
        "We're not an embassy or a visa centre, and we don't work for one. The decision on your visa is always the embassy's.",
        "We don't promise approval. Nobody honestly can, and anyone who does is selling you something else.",
        "We don't book or attend your visa centre appointment. You book the slot; we make sure the file you bring is right.",
        "We don't sell plane tickets. Your flight and hotel reservations are for the visa, so you don't pay for a trip before you have one.",
      ]

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={pick("About EZvisa", "عن إيزي فيزا")}
          title={pick(
            "We prepare Schengen visa files for people who live in the UAE.",
            "نجهّز ملفات تأشيرة شنغن للمقيمين في الإمارات.",
          )}
          description={pick(
            "A visa application is judged on paper. We make sure yours is complete, and that every page tells the same story about your trip.",
            "يُحكم طلب التأشيرة من الأوراق. نتأكد من أن ملفك مكتمل، وأن كل صفحة تحكي القصة نفسها عن رحلتك.",
          )}
        />

        <section className="pb-20 md:pb-28">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <h2 className="text-balance text-foreground">{pick("What we do", "ماذا نفعل")}</h2>
            <div className="flex flex-col gap-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {arabic ? (
                <>
                  <p>
                    تخبرنا عن رحلتك وترفع مستنداتك. يقرأها مختص تأشيرات، ويعبّئ نموذج طلب شنغن، ويكتب خطاب تغطية لرحلتك، ويضع برنامجًا يوميًا، ويرتّب حجوزات طيران وفندق تطابقه.
                  </p>
                  <p>
                    قبل أن يعود إليك أي شيء، نتأكد من أن الملف كله متّسق مع نفسه: التواريخ والمدن وعملك وكشوف الحساب. يقرأ موظف القنصلية ذلك كله معًا، والفجوات بين المستندات هي ما يثير الأسئلة.
                  </p>
                  <p>
                    أكثر عملائنا مقيمون من الهند ومصر والأردن وباكستان ودول أخرى تحتاج جوازاتها إلى تأشيرة شنغن، ويسافرون بإقامة إماراتية. القواعد واحدة في كل سفارة، ونعمل بها كل يوم.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You tell us about your trip and upload your documents. A visa specialist reads them, fills in your Schengen
                    application form, writes a cover letter for your trip, plans a day-by-day itinerary, and arranges flight and
                    hotel reservations that match it.
                  </p>
                  <p>
                    Before anything comes back to you, we check that the whole file agrees with itself: the dates, the cities, your
                    job and your bank statements. A consulate officer reads all of it together, and gaps between documents are
                    what raise questions.
                  </p>
                  <p>
                    Most of our customers are expats from India, Egypt, Jordan, Pakistan and other countries whose passports need a
                    Schengen visa, travelling on a UAE residence visa. The rules for you are the same at every embassy, and we work
                    with them every day.
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
              <p className="text-base leading-relaxed text-muted-foreground">{pick("So you know exactly what you're paying for.", "حتى تعرف بالضبط ما تدفع مقابله.")}</p>
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

        <ContactSection />
      </div>
      <CompanyLegalNotice />
      <Footer />
    </>
  )
}
