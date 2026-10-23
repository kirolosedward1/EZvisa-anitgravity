"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Check, Minus } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { ReadyLine } from "@/components/ready-line"
import { APPLICATION_READY } from "@/lib/copy"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export function ComparisonSection() {
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
    return `${basePrice} AED`
  }

  const getOtherPrice = () => {
    const basePrice = 1000
    if (currentCurrency.code === "USD") {
      return `$${Math.round(basePrice * currentCurrency.rate)}+`
    }
    return `${basePrice}+ AED`
  }

  const features = [
    { name: "Simple, guided forms", ar: "نماذج بسيطة وموجّهة", others: false },
    { name: "Documents checked by our team", ar: "مراجعة المستندات من قِبل فريقنا", others: false },
    { name: "Checks for common mistakes", ar: "التحقق من الأخطاء الشائعة", others: false },
    { name: "Complete file checklist", ar: "قائمة تحقق كاملة للملف", others: false },
    { name: "Tailored cover letter & itinerary", ar: "خطاب تغطية وخط سير مخصّصان", others: false },
    { name: "Flight & hotel reservations for your visa application", ar: "حجوزات طيران وفنادق لطلب التأشيرة", others: true },
    { name: "Ready in 1–2 days", ar: "جاهز خلال 1–2 يوم", others: false },
    { name: "No hidden agency markups", ar: "بدون رسوم خفية", others: false },
  ]

  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><LangText en="Why EZvisa" ar="لماذا إيزي فيزا" /></span>
          <h2 className="text-balance text-foreground"><LangText en="Real service. Real difference." ar="خدمة حقيقية. فرق واضح." /></h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            <LangText en="See how EZvisa compares with preparing your file through a traditional travel agency." ar="قارن بين إيزي فيزا وتجهيز ملفك عبر وكالة سفر تقليدية." />
          </p>
          <LocaleLink
            href="/apply"
            className="group mt-2 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <LangText en="Start your application now" ar="ابدأ طلبك الآن" />
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          </LocaleLink>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-card"
        >
          {/* The EZvisa column, tinted top to bottom */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 w-24 bg-primary/[0.05] sm:w-40" />

          <table className="relative w-full border-collapse text-left">
            <caption className="sr-only">Other agencies compared with EZvisa</caption>
            <thead>
              <tr className="border-b border-border/70">
                <th scope="col" className="px-5 py-5 sm:px-7">
                  <span className="sr-only">Feature</span>
                </th>
                <th scope="col" className="w-24 px-2 py-5 text-center align-bottom sm:w-40">
                  <span className="block text-sm font-semibold text-muted-foreground"><LangText en="Other Agencies" ar="وكالات أخرى" /></span>
                  <span className="mt-0.5 hidden text-xs font-normal text-muted-foreground sm:block"><LangText en="Often manual and more expensive" ar="غالبًا يدوية وأعلى تكلفة" /></span>
                </th>
                <th scope="col" className="w-24 px-2 py-5 text-center align-bottom sm:w-40">
                  <span className="relative mx-auto block h-5 w-20">
                    <Image src="/images/logo-main.png" alt="EZvisa Way" fill sizes="80px" className="object-contain" />
                  </span>
                  <span className="mt-1 hidden text-xs font-medium text-primary sm:block"><LangText en="Documents checked by our team" ar="مراجعة المستندات من قِبل فريقنا" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.name} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-5 py-4 text-sm font-normal text-foreground sm:px-7 sm:text-base">
                    {feature.name === APPLICATION_READY ? <ReadyLine /> : <LangText en={feature.name} ar={feature.ar} />}
                  </th>
                  <td className="px-2 py-4 text-center">
                    {feature.others ? (
                      <Check className="mx-auto size-4 text-muted-foreground" strokeWidth={2.5} aria-label="Yes" />
                    ) : (
                      <Minus className="mx-auto size-4 text-muted-foreground/40" strokeWidth={2.5} aria-label="No" />
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">
                    <Check className="mx-auto size-5 text-primary" strokeWidth={2.5} aria-label="Yes" />
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
                  <span className="block text-[10px] text-muted-foreground sm:text-xs"><LangText en="Estimated typical cost" ar="التكلفة التقديرية المعتادة" /></span>
                  <span className="text-sm font-medium text-muted-foreground line-through">{getOtherPrice()}</span>
                </td>
                <td className="px-2 py-5 text-center">
                  <span className="block text-[10px] text-muted-foreground sm:text-xs"><LangText en="Fixed flat fee" ar="رسوم ثابتة" /></span>
                  <span className="text-lg font-semibold tabular-nums text-foreground sm:text-xl">{getPrice()}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </motion.div>
      </div>
    </section>
  )
}
