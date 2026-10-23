"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, BadgeCheck, Expand, FileText, Hotel, Mail, Map, Plane, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { LangText } from "@/components/lang-text"
import { cn } from "@/lib/utils"

type Service = { icon: LucideIcon; title: string; summary: string; description: string; image: string }

const services: Service[] = [
  {
    icon: FileText,
    title: "Application form",
    summary: "Filled to the embassy's exact rules.",
    description: "Error-free visa application forms filled accurately to match official embassy and consulate guidelines.",
    image: "/images/documents/application-form.png",
  },
  {
    icon: Plane,
    title: "Flight reservation",
    summary: "Verifiable, no full ticket needed.",
    description: "Verifiable flight reservations to satisfy embassy travel itinerary requirements without buying full tickets beforehand.",
    image: "/images/documents/flight-reservation.png",
  },
  {
    icon: Hotel,
    title: "Hotel reservation",
    summary: "Confirmed for every night of your stay.",
    description: "Confirmed hotel reservations covering your entire stay, matched directly to your daily travel itinerary.",
    image: "/images/documents/hotel-booking.png",
  },
  {
    icon: Map,
    title: "Travel itinerary",
    summary: "Day by day, matched to your bookings.",
    description: "Custom day-by-day travel plan detailing your destination entry points, hotel stays, and planned activities.",
    image: "/images/documents/itinerary.png",
  },
  {
    icon: Mail,
    title: "Cover letter",
    summary: "Your purpose, funds and ties, clearly put.",
    description: "Expertly drafted cover letter detailing your travel purpose, financial backing, and strong ties to your home country.",
    image: "/images/documents/cover-letter.png",
  },
  {
    icon: ShieldCheck,
    title: "Travel insurance",
    summary: "€30,000 Schengen-compliant cover.",
    description: "Compliant Schengen medical travel insurance covering €30,000 for your entire stay in Europe.",
    image: "/images/documents/travel-insurance.jpeg",
  },
]

/** The selected sample as a sheet of paper on a small stack; cross-fades when the selection changes. */
function SamplePreview({ service, onExpand }: { service: Service; onExpand: () => void }) {
  const reduced = useReducedMotion()
  return (
    <div
      id="sample-preview"
      role="tabpanel"
      aria-label={`${service.title} sample`}
      className="relative flex aspect-[5/6] items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-secondary sm:aspect-[4/3]"
    >
      {/* Soft brand glow behind the paper */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />

      {/* Two sheets behind, for depth */}
      <div aria-hidden="true" className="absolute h-[78%] aspect-[1/1.38] translate-x-6 rotate-[5deg] rounded-lg bg-background/70 shadow-sm ring-1 ring-border/60" />
      <div aria-hidden="true" className="absolute h-[78%] aspect-[1/1.38] -translate-x-5 -rotate-[3deg] rounded-lg bg-background/85 shadow-sm ring-1 ring-border/60" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.button
          key={service.title}
          type="button"
          onClick={onExpand}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="group relative h-[82%] aspect-[1/1.38] cursor-zoom-in overflow-hidden rounded-lg bg-background shadow-xl ring-1 ring-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View the ${service.title.toLowerCase()} sample full size`}
        >
          <Image src={service.image} alt="" fill sizes="(max-width: 1024px) 70vw, 420px" className="object-cover object-top" />
        </motion.button>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/70">
          <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
          Real sample<span className="hidden sm:inline"> · {service.title}</span>
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-muted"
        >
          <Expand className="size-3.5" aria-hidden="true" />
          <span className="sm:hidden">Full size</span>
          <span className="hidden sm:inline">View full size</span>
        </button>
      </div>
    </div>
  )
}

export function ServicesSection() {
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
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
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">What&apos;s included</span>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-4xl md:text-5xl">
            Every document your embassy file needs
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            Six documents, prepared and checked by our visa experts. Pick one to see a real sample.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
          {/* Documents: a vertical list on desktop, a row of chips on phones */}
          <div
            role="tablist"
            aria-label="Included documents"
            aria-orientation="vertical"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {services.map((service, index) => {
              const Icon = service.icon
              const selected = index === active
              return (
                <button
                  key={service.title}
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
                    "group flex shrink-0 items-center gap-3 rounded-2xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                    <span className={cn("whitespace-nowrap text-sm font-semibold lg:text-base", selected ? "text-foreground" : "text-foreground/80")}>{service.title}</span>
                    <span className="hidden text-sm text-muted-foreground lg:block">{service.summary}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3">
            <SamplePreview service={current} onExpand={() => setExpanded(true)} />
            <p className="px-1 text-sm leading-relaxed text-muted-foreground lg:hidden">{current.summary}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-border pt-8 sm:flex-row">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-foreground">All six for {PRICE_AED} AED, one flat fee</p>
              <p className="text-sm text-muted-foreground"><LangText en="Full refund if you cancel before we start preparing your file." ar="استرداد كامل إذا ألغيت قبل أن نبدأ تجهيز ملفك." /></p>
            </div>
          </div>
          <Link
            href="/apply"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Start your application
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-3xl">
          <div className="flex flex-col md:flex-row">
            <div className="relative aspect-[4/3] border-b border-border bg-secondary md:aspect-auto md:min-h-[440px] md:w-2/5 md:border-b-0 md:border-r">
              <Image src={current.image} alt={`Sample ${current.title.toLowerCase()}`} fill sizes="(max-width: 768px) 100vw, 320px" className="object-contain p-4" />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
              <div className="flex flex-col gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CurrentIcon className="size-5" aria-hidden="true" />
                </span>
                <DialogTitle className="panel-title panel-title-lg text-foreground">{current.title}</DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-muted-foreground">{current.description}</DialogDescription>
              </div>
              <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">Included in every application</span>
                <Link
                  href="/apply"
                  onClick={() => setExpanded(false)}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start your application
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
