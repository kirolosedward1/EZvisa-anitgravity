"use client"

import type { ReactNode } from "react"
import { ArrowRight, Check } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { LocaleLink } from "@/components/locale-link"
import { Image } from "@/components/image"
import { LangText } from "@/components/lang-text"
import { useSiteLocale } from "@/components/locale-provider"
import { formatAedLabel } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { getWhatsAppUrl } from "@/lib/whatsapp"

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
            <Image src="/images/6802.jpg" alt={locale === "ar" ? "مسافر على جسر في بودابست" : "Traveller on a bridge in Budapest"} fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover object-[30%_35%]" />
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
              <p className="text-sm text-muted-foreground">
                <LangText
                  en={<>Starting at <span dir="ltr" className="text-2xl font-semibold tabular-nums text-foreground">{formatAedLabel(PRICE_AED, "en")}</span></>}
                  ar={<>يبدأ من <span dir="ltr" className="text-2xl font-semibold tabular-nums text-foreground">{formatAedLabel(PRICE_AED, "ar")}</span></>}
                />
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <LocaleLink
                  href="/apply"
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                >
                  <LangText en="Start your application" ar="ابدأ الطلب" />
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
                </LocaleLink>
                <Link
                  href={getWhatsAppUrl("Hi EZvisa! I have a question about my visa application.", locale === "ar")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
                >
                  <svg className="size-4 text-[#1A7F37]" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  <LangText en="Chat on WhatsApp" ar="تواصل عبر واتساب" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
