"use client"

import type { ReactNode } from "react"
import { ArrowRight, Check } from "lucide-react"
import { motion } from "framer-motion"
import { LocaleLink } from "@/components/locale-link"
import { Button } from "@/components/ui/button"
import { Image } from "@/components/image"
import { LangText } from "@/components/lang-text"
import { useSiteLocale } from "@/components/locale-provider"
import { formatAedLabel } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export function ContactSection() {
  const locale = useSiteLocale()
  const price = formatAedLabel(PRICE_AED, locale)
  const benefits: ReactNode[] = locale === "ar"
    ? ["تعبئة نموذج الطلب", "خطاب التغطية وبرنامج الرحلة", "حجوزات الطيران والفندق", <>جاهز خلال <bdi dir="ltr">1–2</bdi> يوم</>, "استرداد كامل قبل أن نبدأ مراجعة مستنداتك"]
    : ["Application form filled in", "Cover letter and itinerary", "Flight and hotel reservations", "Ready in 1–2 days", "Full refund before we start reviewing your documents"]

  return (
    <section id="contact" className="bg-background py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="grid overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        >
          <div className="relative order-first h-56 sm:h-72 lg:order-last lg:h-auto">
            <Image src="/images/6802.jpg" alt={locale === "ar" ? "مسافر على جسر في بودابست" : "Traveller on a bridge in Budapest"} fill sizes="(min-width: 1024px) 1000px, 100vw" className="object-cover object-[30%_35%]" />
          </div>

          <div className="flex flex-col items-start gap-6 p-8 md:p-12 lg:p-14">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <LangText en="Get started" ar="ابدأ الآن" />
            </span>
            <div className="flex flex-col gap-4">
              <h2 className="text-balance text-foreground">
                <LangText en="Start your Schengen visa application" ar="ابدأ طلب تأشيرة شنغن" />
              </h2>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                <LangText
                  en={`It takes about five minutes to start. Once you've paid ${price}, you can add the rest of your details at any time, and a visa specialist will prepare your file.`}
                  ar={<>يستغرق البدء نحو خمس دقائق. بعد دفع <bdi dir="ltr">{price}</bdi> يمكنك إضافة بقية بياناتك في أي وقت، وسيجهّز مختص التأشيرات ملفك.</>}
                />
              </p>
            </div>

            <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="whitespace-nowrap text-sm text-muted-foreground">
                <LangText
                  en={<>Starting at <span dir="ltr" className="text-2xl font-semibold tabular-nums text-foreground">{formatAedLabel(PRICE_AED, "en")}</span></>}
                  ar={<>يبدأ من <span dir="ltr" className="text-2xl font-semibold tabular-nums text-foreground">{formatAedLabel(PRICE_AED, "ar")}</span></>}
                />
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <LocaleLink href="/apply">
                    <span><LangText en="Start your application" ar="ابدأ الطلب" /></span>
                    <ArrowRight aria-hidden="true" />
                  </LocaleLink>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
