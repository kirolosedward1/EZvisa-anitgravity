"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import { LocaleLink } from "@/components/locale-link"
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion"
import { ArrowRight, Check, ChevronDown, Lock, Plane } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { LangText } from "@/components/lang-text"
import { PaymentMarks } from "@/components/payment-marks"
import { useSiteLocale } from "@/components/locale-provider"
import { formatAedLabel, type DisplayLocale } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { cn } from "@/lib/utils"

function stepsFor(locale: DisplayLocale): { number: string; title: string; description: ReactNode }[] {
  const price = formatAedLabel(PRICE_AED, locale)
  if (locale === "ar") {
    return [
      {
        number: "1",
        title: "أخبرنا بخططك",
        description: "اختر جنسيتك ووجهتك، ثم أضف بياناتك كمسافر. يستغرق ذلك نحو خمس دقائق.",
      },
      {
        number: "2",
        title: `ادفع ${price}`,
        description: `ادفع بالبطاقة أو ${ltr("Apple Pay")} أو ${ltr("Google Pay")}. تواريخ الرحلة وبيانات الجواز والعمل تأتي بعد الدفع، عندما تكون جاهزًا.`,
      },
      {
        number: "3",
        title: "نجهّز ملفك",
        description: (
          <>
            يملأ مختص التأشيرات نموذج الطلب ويعدّ خطاب التغطية وبرنامج الرحلة يومًا بيوم وحجوزات الطيران والفندق خلال <bdi dir="ltr">1–2</bdi> يوم.
          </>
        ),
      },
      {
        number: "4",
        title: "خذه إلى موعدك",
        description: `اطبع الملف وأحضره إلى موعد ${ltr("VFS")} أو القنصلية مع مستنداتك الأصلية. القرار للسفارة.`,
      },
    ]
  }
  return [
    {
      number: "1",
      title: "Tell us your plans",
      description: "Choose your nationality and destination, then add your details as the traveller. It takes about five minutes.",
    },
    {
      number: "2",
      title: `Pay ${price}`,
      description: "Pay by card, Apple Pay or Google Pay. Trip dates, passport and job details come after payment, when you're ready.",
    },
    {
      number: "3",
      title: "We prepare your file",
      description: "A visa specialist fills in your application form and prepares your cover letter, day-by-day itinerary, and flight and hotel reservations within 1–2 days.",
    },
    {
      number: "4",
      title: "Take it to your appointment",
      description: "Print your file and bring it to your VFS or consulate appointment with your original documents. The embassy makes the decision.",
    },
  ]
}

/* ---- One small illustration per step, built from the product's own parts ---- */

function Picker({ label, iso, value }: { label: string; iso: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground shadow-xs">
        <CountryFlag iso={iso} className="size-5" />
        <bdi>{value}</bdi>
        <ChevronDown className="ms-auto size-4 text-muted-foreground" aria-hidden="true" />
      </span>
    </div>
  )
}

function PlansVisual() {
  return (
    <div className="w-[78%] rounded-2xl border border-border/70 bg-card p-5 shadow-xl">
      <p className="text-base font-semibold text-foreground">
        <LangText en="Where are you going?" ar="إلى أين تسافر؟" />
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Picker label={useSiteLocale() === "ar" ? "جنسيتك" : "Your nationality"} iso="EG" value={useSiteLocale() === "ar" ? "مصر" : "Egypt"} />
        <Picker label={useSiteLocale() === "ar" ? "دولة الوجهة" : "Destination country"} iso="FR" value={useSiteLocale() === "ar" ? "فرنسا" : "France"} />
      </div>
      <span className="mt-5 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
        <LangText en="Continue" ar="متابعة" />
      </span>
    </div>
  )
}

function PayVisual() {
  const locale = useSiteLocale()
  const price = formatAedLabel(PRICE_AED, locale)
  return (
    <div className="w-[78%] rounded-2xl border border-border/70 bg-card p-5 shadow-xl">
      <div className="flex items-center gap-3">
        <CountryFlag iso="FR" className="size-8" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            <LangText en="France · Schengen visa" ar="فرنسا · تأشيرة شنغن" />
          </span>
          <span className="text-xs text-muted-foreground">
            <LangText en="1 applicant" ar="مسافر واحد" />
          </span>
        </div>
      </div>
      <dl className="mt-5 flex flex-col gap-2 border-y border-border py-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground"><LangText en="Service fee" ar="رسوم الخدمة" /></dt><dd dir="ltr" className="tabular-nums text-foreground">{price}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground"><LangText en="Embassy fee" ar="رسوم السفارة" /></dt><dd className="text-muted-foreground"><LangText en="At your appointment" ar="عند موعدك" /></dd></div>
        <div className="flex justify-between pt-1 text-base font-semibold"><dt className="text-foreground"><LangText en="Total" ar="المجموع" /></dt><dd dir="ltr" className="tabular-nums text-foreground">{price}</dd></div>
      </dl>
      <span className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
        <Lock className="size-4" aria-hidden="true" />
        <LangText en={`Pay ${price}`} ar={`ادفع ${price}`} />
      </span>
      <div className="mt-4 scale-90">
        <PaymentMarks />
      </div>
    </div>
  )
}

function FileVisual() {
  const sheets = [
    { src: "/images/documents/itinerary.png", className: "-translate-x-[30%] -rotate-[6deg]" },
    { src: "/images/documents/flight-reservation.png", className: "translate-x-[30%] rotate-[6deg]" },
    { src: "/images/documents/cover-letter.png", className: "-translate-y-1" },
  ]
  return (
    <div className="relative h-[62%] aspect-[1/1.38]">
      {sheets.map((sheet) => (
        <div key={sheet.src} className={cn("absolute inset-0 overflow-hidden rounded-lg bg-background shadow-xl ring-1 ring-border/70", sheet.className)}>
          <Image src={sheet.src} alt="" fill sizes="260px" className="object-cover object-top" />
        </div>
      ))}
      <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md ring-1 ring-border/70">
        <Check className="size-3.5 text-success" strokeWidth={3} aria-hidden="true" />
        <LangText en="Checked by a visa expert" ar="راجعه خبير تأشيرات" />
      </span>
    </div>
  )
}

function TravelVisual() {
  return (
    <div className="absolute inset-0">
      <Image src="/images/countries/france.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F]/60 via-transparent to-transparent" />
      <div className="absolute inset-x-6 bottom-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-xl">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-5" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground"><LangText en="Your visa file is ready" ar="ملف تأشيرتك جاهز" /></span>
          <span className="truncate text-xs text-muted-foreground"><LangText en="France · appointment-day guide included" ar="فرنسا · دليل يوم الموعد مشمول" /></span>
        </div>
        <Plane className="size-5 shrink-0 text-primary" aria-hidden="true" />
      </div>
    </div>
  )
}

const VISUALS = [PlansVisual, PayVisual, FileVisual, TravelVisual]

/** `standalone`: on the How it works page itself, so the section drops its pill and its link to that page. */
export function HowItWorksSimple({ standalone = false }: { standalone?: boolean }) {
  const [active, setActive] = useState(0)
  const steps = stepsFor(useSiteLocale())
  const items = useRef<(HTMLLIElement | null)[]>([])
  const reduced = useReducedMotion()

  // The step crossing the middle of the screen is the active one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    items.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Fills the line beside the step numbers as the list scrolls past the middle of the screen.
  const listRef = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start center", "end center"] })
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })

  return (
    <section id="how-it-works" className="bg-background py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col items-start gap-5">
            {!standalone && <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><LangText en="How it works" ar="كيف تعمل" /></span>}
            <h2 className="text-balance text-foreground"><LangText en="From your first answer to your embassy appointment." ar="من أول إجابة حتى موعد السفارة." /></h2>
            {!standalone && <LocaleLink
              href="/how-it-works"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <LangText en="See full process" ar="اعرض الخطوات كاملة" />
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
            </LocaleLink>}
          </div>

          {/* Desktop: the illustration for the step in view */}
          <div
            aria-hidden="true"
            className="relative hidden aspect-square max-h-[calc(100vh-19rem)] min-h-[26rem] items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-secondary lg:flex"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />
            {VISUALS.map((Visual, index) => {
              const offset = index - active
              return (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{
                    opacity: offset === 0 ? 1 : 0,
                    y: reduced || offset === 0 ? 0 : offset > 0 ? 24 : -24,
                    scale: reduced || offset === 0 ? 1 : 0.96,
                  }}
                  // The old picture leaves fast, the new one arrives a beat later: no blank panel, no double image.
                  transition={offset === 0 ? { duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] } : { duration: 0.18, ease: "easeIn" }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ pointerEvents: "none", zIndex: offset === 0 ? 1 : 0 }}
                >
                  <Visual />
                </motion.div>
              )
            })}
            <div className="absolute left-5 top-5 z-10 flex gap-1.5">
              {steps.map((step, index) => (
                <span key={step.number} className={cn("h-1 rounded-full transition-all duration-300", index === active ? "w-6 bg-primary" : "w-2 bg-border")} />
              ))}
            </div>
          </div>
        </div>

        <ol ref={listRef} className="relative flex flex-col">
          {/* Track and fill, centred on the 40px number circles */}
          <span aria-hidden="true" className="absolute bottom-12 start-5 top-12 w-px -translate-x-1/2 bg-border rtl:translate-x-1/2" />
          <motion.span
            aria-hidden="true"
            className="absolute bottom-12 start-5 top-12 w-px origin-top -translate-x-1/2 bg-primary rtl:translate-x-1/2"
            style={{ scaleY: reduced ? scrollYProgress : fill }}
          />
          {steps.map((step, index) => {
            const isActive = index === active
            return (
              <li
                key={step.number}
                ref={(el) => {
                  items.current[index] = el
                }}
                data-index={index}
                className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-5 py-8 sm:gap-8 lg:min-h-[13rem] lg:py-10"
              >
                <span
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-500",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_6px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
                      : index < active
                        ? "border-primary bg-background text-primary"
                        : "border-border bg-background text-foreground",
                  )}
                >
                  {step.number}
                </span>
                <div className="flex flex-col gap-2 pt-1.5">
                  <h3 className={cn("text-foreground transition-opacity duration-500", isActive ? "opacity-100" : "opacity-60 lg:opacity-45")}>{step.title}</h3>
                  <p className="max-w-lg text-base leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
