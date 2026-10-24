"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { LocaleLink } from "@/components/locale-link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, BadgeCheck, Expand, FileText, Hotel, Mail, Map, Plane, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { LangText } from "@/components/lang-text"
import { useSiteLocale } from "@/components/locale-provider"
import { formatAedLabel } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { cn } from "@/lib/utils"

type Copy = { en: string; ar: string }
type Service = { icon: LucideIcon; title: Copy; summary: Copy; description: Copy; image: string; extra?: boolean }

const services: Service[] = [
  {
    icon: FileText,
    title: { en: "Application form", ar: "نموذج الطلب" },
    summary: { en: "Filled in for your nationality and consulate.", ar: "معبّأ حسب جنسيتك والقنصلية." },
    description: { en: "We complete the official Schengen application form with your details, worded the way the consulate expects, ready for you to sign at your appointment.", ar: "نعبّئ نموذج طلب شنغن الرسمي ببياناتك، بصياغة تتوقعها القنصلية، ليكون جاهزًا لتوقيعك في الموعد." },
    image: "/images/documents/application-form.png",
  },
  {
    icon: Plane,
    title: { en: "Flight reservation", ar: "حجز الطيران" },
    summary: { en: "A verifiable booking, no ticket to buy yet.", ar: "حجز يمكن التحقق منه، من دون شراء تذكرة الآن." },
    description: { en: "A reservation with a checkable booking reference for your exact dates, so you don't pay for flights before the visa is issued.", ar: "حجز برقم يمكن التحقق منه لتواريخك المحددة، حتى لا تدفع ثمن التذاكر قبل صدور التأشيرة." },
    image: "/images/documents/flight-reservation.png",
  },
  {
    icon: Hotel,
    title: { en: "Hotel reservation", ar: "حجز الفندق" },
    summary: { en: "Every night of your stay, on your route.", ar: "كل ليلة من إقامتك، على مسار رحلتك." },
    description: { en: "Confirmed reservations for each night in the Schengen area, in the cities on your itinerary, valid for your visa application.", ar: "حجوزات مؤكدة لكل ليلة في منطقة شنغن، في مدن برنامج رحلتك، وصالحة لطلب التأشيرة." },
    image: "/images/documents/hotel-booking.png",
  },
  {
    icon: Map,
    title: { en: "Travel itinerary", ar: "برنامج الرحلة" },
    summary: { en: "Day by day, matching your bookings.", ar: "يومًا بيوم، مطابق لحجوزاتك." },
    description: { en: "A day-by-day plan that lines up with your flight and hotel dates, so the consulate sees one consistent trip.", ar: "خطة يومية تتوافق مع تواريخ الطيران والفندق، لترى القنصلية رحلة واحدة متّسقة." },
    image: "/images/documents/itinerary.png",
  },
  {
    icon: Mail,
    title: { en: "Cover letter", ar: "خطاب التغطية" },
    summary: { en: "Why you're travelling and why you'll return.", ar: "لماذا تسافر، ولماذا ستعود." },
    description: { en: "A letter to the consulate that explains your trip, how it's paid for and your ties to the UAE, ready for you to sign.", ar: "خطاب إلى القنصلية يشرح رحلتك وكيف تُموَّل وارتباطك بالإمارات، جاهز لتوقيعك." },
    image: "/images/documents/cover-letter.png",
  },
  {
    icon: ShieldCheck,
    title: { en: "Travel insurance", ar: "تأمين السفر" },
    summary: { en: "Optional extra. Buy it with us or bring your own.", ar: "إضافة اختيارية. اشترها معنا أو أحضر وثيقتك." },
    description: {
      en: "Every Schengen visa needs travel medical insurance with at least €30,000 of cover for your whole stay. It isn't part of the service fee: add a compliant policy through us as an extra, or bring your own.",
      ar: `كل تأشيرة شنغن تحتاج إلى تأمين طبي للسفر بتغطية لا تقل عن ${ltr("€30,000")} طوال الإقامة. ليس ضمن رسوم الخدمة: أضف وثيقة مطابقة عبرنا كإضافة، أو أحضر وثيقتك.`,
    },
    image: "/images/documents/travel-insurance.jpeg",
    extra: true,
  },
]

/** The selected sample as a sheet of paper on a small stack; cross-fades when the selection changes. */
function SamplePreview({ service, onExpand }: { service: Service; onExpand: () => void }) {
  const reduced = useReducedMotion()
  const arabic = useSiteLocale() === "ar"
  const title = arabic ? service.title.ar : service.title.en
  return (
    <div
      id="sample-preview"
      role="tabpanel"
      aria-label={arabic ? `نموذج ${title}` : `${title} sample`}
      className="relative flex aspect-[5/6] items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-secondary sm:aspect-[4/3]"
    >
      {/* Soft brand glow behind the paper */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />

      {/* Two sheets behind, for depth */}
      <div aria-hidden="true" className="absolute h-[78%] aspect-[1/1.38] translate-x-6 rotate-[5deg] rounded-lg bg-background/70 shadow-sm ring-1 ring-border/60" />
      <div aria-hidden="true" className="absolute h-[78%] aspect-[1/1.38] -translate-x-5 -rotate-[3deg] rounded-lg bg-background/85 shadow-sm ring-1 ring-border/60" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.button
          key={service.title.en}
          type="button"
          onClick={onExpand}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="group relative h-[82%] aspect-[1/1.38] cursor-zoom-in overflow-hidden rounded-lg bg-background shadow-xl ring-1 ring-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={arabic ? `عرض نموذج ${title} بالحجم الكامل` : `View the ${title.toLowerCase()} sample full size`}
        >
          <Image src={service.image} alt="" fill sizes="(max-width: 1024px) 70vw, 420px" className="object-cover object-top" />
        </motion.button>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/70">
          <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
          {service.extra ? <LangText en="Sample policy" ar="نموذج وثيقة" /> : <LangText en="Real sample" ar="نموذج حقيقي" />}<span className="hidden sm:inline"> · {title}</span>
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-muted"
        >
          <Expand className="size-3.5" aria-hidden="true" />
          <span className="sm:hidden"><LangText en="Full size" ar="الحجم الكامل" /></span>
          <span className="hidden sm:inline"><LangText en="View full size" ar="عرض بالحجم الكامل" /></span>
        </button>
      </div>
    </div>
  )
}

export function ServicesSection() {
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const arabic = useSiteLocale() === "ar"
  const text = (copy: Copy) => (arabic ? copy.ar : copy.en)
  const current = services[active]
  const CurrentIcon = current.icon

  // Arrow keys move between documents, like a native tab list.
  const onKey = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + services.length) % services.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section id="services" className="relative overflow-hidden bg-background py-20 sm:py-28">
      <div className="container relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><LangText en="What's included" ar="ما يشمله الملف" /></span>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-4xl md:text-5xl">
            <LangText en="Every document your embassy file needs" ar="كل مستند يحتاجه ملف السفارة" />
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            <LangText
              en="Five documents we prepare for every application, plus travel insurance if you need it. Pick one to see a real sample."
              ar="خمسة مستندات نجهّزها لكل طلب، مع تأمين السفر إن احتجته. اختر واحدًا لترى نموذجًا حقيقيًا."
            />
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
          {/* Documents: a vertical list on desktop, a row of chips on phones */}
          <div
            role="tablist"
            aria-label={arabic ? "المستندات المشمولة" : "Included documents"}
            aria-orientation="vertical"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {services.map((service, index) => {
              const Icon = service.icon
              const selected = index === active
              return (
                <button
                  key={service.title.en}
                  ref={(el) => {
                    tabs.current[index] = el
                  }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="sample-preview"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(e) => onKey(e, index)}
                  className={cn(
                    "group flex shrink-0 items-center gap-3 rounded-2xl border text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "px-3.5 py-2.5 lg:w-full lg:gap-4 lg:px-4 lg:py-3.5",
                    selected ? "border-border bg-card shadow-sm" : "border-transparent hover:bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors lg:size-10",
                      selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4 lg:size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("flex items-center gap-2 whitespace-nowrap text-sm font-semibold lg:text-base", selected ? "text-foreground" : "text-foreground/80")}>
                      {text(service.title)}
                      {service.extra ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><LangText en="Extra" ar="إضافة" /></span> : null}
                    </span>
                    <span className="hidden text-sm text-muted-foreground lg:block">{text(service.summary)}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3">
            <SamplePreview service={current} onExpand={() => setExpanded(true)} />
            <p className="px-1 text-sm leading-relaxed text-muted-foreground lg:hidden">{text(current.summary)}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-border pt-8 sm:flex-row">
          <div className="flex items-center gap-4 text-center sm:text-start">
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-foreground">
                <LangText
                  en={`All five for ${formatAedLabel(PRICE_AED, "en")}, one flat fee`}
                  ar={`الخمسة كلها مقابل ${formatAedLabel(PRICE_AED, "ar")}، برسم واحد`}
                />
              </p>
              <p className="text-sm text-muted-foreground">
                <LangText en="Travel insurance and embassy fees are separate." ar="تأمين السفر ورسوم السفارة منفصلان." />
              </p>
            </div>
          </div>
          <LocaleLink
            href="/apply"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <LangText en="Start your application" ar="ابدأ طلبك" />
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </LocaleLink>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-3xl">
          <div className="flex flex-col md:flex-row">
            <div className="relative aspect-[4/3] border-b border-border bg-secondary md:aspect-auto md:min-h-[440px] md:w-2/5 md:border-b-0 md:border-r">
              <Image src={current.image} alt={arabic ? `نموذج ${text(current.title)}` : `Sample ${text(current.title).toLowerCase()}`} fill sizes="(max-width: 768px) 100vw, 320px" className="object-contain p-4" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
              <div className="flex flex-col gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CurrentIcon className="size-5" aria-hidden="true" />
                </span>
                <DialogTitle className="panel-title panel-title-lg text-foreground">{text(current.title)}</DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-muted-foreground">{text(current.description)}</DialogDescription>
              </div>
              <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">{current.extra ? <LangText en="Optional extra, or bring your own" ar="إضافة اختيارية، أو أحضر وثيقتك" /> : <LangText en="Included in every application" ar="مشمول في كل طلب" />}</span>
                <LocaleLink
                  href="/apply"
                  onClick={() => setExpanded(false)}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LangText en="Start your application" ar="ابدأ طلبك" />
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </LocaleLink>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
