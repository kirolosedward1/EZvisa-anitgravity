"use client"

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { useState, useEffect } from "react"
import { ArrowRight, Check, Minus } from "lucide-react"
import { Image } from "@/components/image"
import { ReadyLine } from "@/components/ready-line"
import { APPLICATION_READY } from "@/lib/copy"
import { LangText } from "@/components/lang-text"
import { Button } from "@/components/ui/button"
import { LocaleLink } from "@/components/locale-link"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { useSiteLocale } from "@/components/locale-provider"
import { formatAedLabel } from "@/lib/currency"

export function ComparisonSection() {
  const locale = useSiteLocale()
  const [currentCurrency, setCurrentCurrency] = useState<{ code: string; symbol: string; rate: number }>({
    code: "AED",
    symbol: "AED",
    rate: 1,
  })

  useEffect(() => {
    const loadCurrency = () => {
      const savedCurrency = localStorage.getItem("selected-currency")
      if (savedCurrency === "USD") {
        setCurrentCurrency({ code: "USD", symbol: "$", rate: 0.27 })
      } else {
        setCurrentCurrency({ code: "AED", symbol: "AED", rate: 1 })
      }
    }

    loadCurrency()
    window.addEventListener("currency-changed", loadCurrency)
    return () => window.removeEventListener("currency-changed", loadCurrency)
  }, [])

  const getPrice = () => {
    const basePrice = PRICE_AED
    if (currentCurrency.code === "USD") {
      return `$${Math.round(basePrice * currentCurrency.rate)}`
    }
    return formatAedLabel(basePrice, locale)
  }

  // Doing it yourself vs with EZvisa: only facts about the service, no claims about other companies.
  const features = [
    { name: "Application form filled in for you", ar: "نعبّئ نموذج الطلب نيابة عنك", others: false },
    { name: "Cover letter written for your trip", ar: "خطاب تغطية مكتوب لرحلتك", others: false },
    { name: "Day-by-day itinerary that matches your bookings", ar: "برنامج يومي يطابق حجوزاتك", others: false },
    { name: "Flight and hotel reservations, no tickets to buy", ar: "حجوزات طيران وفندق من دون شراء تذاكر", others: false },
    { name: "Every document checked before you submit", ar: "مراجعة كل مستند قبل التقديم", others: false },
    { whatsapp: true, name: "A visa specialist to answer questions on WhatsApp", ar: "مختص تأشيرات يجيب عن أسئلتك على واتساب", others: false },
    { name: APPLICATION_READY, ar: "", others: false },
  ]

  return (
    <section className="ez-comparison py-20 md:py-28">
      <div className="container relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
        <div data-site-reveal="rise" className="flex flex-col items-start gap-5">
          <h2 className="text-balance">
            <LangText en="Applying on your own vs. with EZvisa" ar="التقديم بنفسك مقارنة بالتقديم مع إيزي فيزا" />
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            <LangText
              en="You can apply for a Schengen visa yourself. This is what changes when a specialist prepares the file with you."
              ar="يمكنك التقدّم لتأشيرة شنغن بنفسك. هذا ما يتغيّر عندما يجهّز مختص الملف معك."
            />
          </p>
          <Button asChild className="mt-2">
            <LocaleLink href="/apply">
              <span><LangText en="Start your application now" ar="ابدأ طلبك الآن" /></span>
              <ArrowRight aria-hidden="true" />
            </LocaleLink>
          </Button>
        </div>

        <div data-site-reveal="fade" className="ez-comparison-table overflow-hidden">
          <table className="relative w-full border-collapse text-left">
            <caption className="sr-only">
              <LangText en="Applying on your own compared with applying through EZvisa" ar="مقارنة التقديم بنفسك مع التقديم عبر إيزي فيزا" />
            </caption>
            <thead>
              <tr className="border-b border-border/70">
                <th scope="col" className="px-5 py-5 sm:px-7">
                  <span className="sr-only"><LangText en="Feature" ar="البند" /></span>
                </th>
                <th scope="col" className="w-24 px-2 py-5 text-center align-bottom sm:w-40">
                  <span className="block text-sm font-semibold text-muted-foreground"><LangText en="On your own" ar="بمفردك" /></span>
                </th>
                <th scope="col" className="w-24 px-2 py-5 text-center align-bottom sm:w-40">
                  <span className="relative mx-auto block h-5 w-20">
                    <Image src="/images/logo-main.png" alt={locale === "ar" ? "مع إيزي فيزا" : "With EZvisa"} fill sizes="80px" className="object-contain" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.name} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-5 py-4 text-sm font-normal text-foreground sm:px-7 sm:text-base">
                    {feature.whatsapp && <WhatsAppIcon className="me-2 inline-block size-4 align-text-bottom text-primary" />}
                    {feature.name === APPLICATION_READY ? <ReadyLine /> : <LangText en={feature.name} ar={feature.ar} />}
                  </th>
                  <td className="px-2 py-4 text-center">
                    {feature.others ? (
                      <Check className="mx-auto size-4 text-muted-foreground" strokeWidth={2.5} aria-label={locale === "ar" ? "نعم" : "Yes"} />
                    ) : (
                      <Minus className="mx-auto size-4 text-muted-foreground/40" strokeWidth={2.5} aria-label={locale === "ar" ? "لا" : "No"} />
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">
                    <Check className="mx-auto size-5 text-primary" strokeWidth={2.5} aria-label={locale === "ar" ? "نعم" : "Yes"} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/70">
                <th scope="row" className="px-5 py-5 text-sm font-semibold text-foreground sm:px-7">
                  <span className="sm:hidden"><LangText en="Cost" ar="التكلفة" /></span>
                  <span className="hidden sm:inline"><LangText en="What you pay" ar="ما تدفعه" /></span>
                </th>
                <td className="px-2 py-5 text-center">
                  <span className="text-xs text-muted-foreground sm:text-sm"><LangText en="Your time" ar="وقتك" /></span>
                </td>
                <td className="px-2 py-5 text-center">
                  <span className="block text-[10px] text-muted-foreground sm:text-xs"><LangText en="One flat fee" ar="رسم واحد ثابت" /></span>
                  <span dir="ltr" className="text-lg font-semibold tabular-nums text-foreground sm:text-xl">{getPrice()}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}
