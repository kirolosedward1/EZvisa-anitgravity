"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, FileText, Hotel, Mail, Map, Plane, ShieldCheck, BadgeCheck, Eye } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { useMessage, usePageArabic } from "@/components/use-message"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import type { MessageKey } from "@/messages"

type Service = { icon: LucideIcon; title: MessageKey; summary: MessageKey; description: MessageKey; image: string }

const services: Service[] = [
  {
    icon: FileText,
    title: "services.formsTitle",
    summary: "services.formsSummary",
    description: "services.formsBody",
    image: "/images/documents/application-form.png",
  },
  {
    icon: Plane,
    title: "services.flightsTitle",
    summary: "services.flightsSummary",
    description: "services.flightsBody",
    image: "/images/documents/flight-reservation.png",
  },
  {
    icon: Hotel,
    title: "services.hotelsTitle",
    summary: "services.hotelsSummary",
    description: "services.hotelsBody",
    image: "/images/documents/hotel-booking.png",
  },
  {
    icon: Map,
    title: "services.itineraryTitle",
    summary: "services.itinerarySummary",
    description: "services.itineraryBody",
    image: "/images/documents/itinerary.png",
  },
  {
    icon: Mail,
    title: "services.coverTitle",
    summary: "services.coverSummary",
    description: "services.coverBody",
    image: "/images/documents/cover-letter.png",
  },
  {
    icon: ShieldCheck,
    title: "services.insuranceTitle",
    summary: "services.insuranceSummary",
    description: "services.insuranceBody",
    image: "/images/documents/travel-insurance.jpeg",
  },
]

function DocumentCard({ service, index, onOpen }: { service: Service; index: number; onOpen: () => void }) {
  const Icon = service.icon
  const title = useMessage(service.title)
  const summary = useMessage(service.summary)
  const viewSample = useMessage("services.viewSample")
  const aria = useMessage("services.cardAria", { title })
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
      aria-label={aria}
    >
      {/* Sample preview: the real document as a sheet of paper, cropped and faded at the bottom */}
      <div className="relative hidden h-52 overflow-hidden border-b border-border/70 bg-secondary sm:block">
        <div className="absolute inset-x-8 top-6 bottom-0 overflow-hidden rounded-t-lg bg-background shadow-md ring-1 ring-border/70 transition-transform duration-500 group-hover:-translate-y-1.5 sm:inset-x-10">
          <Image src={service.image} alt="" fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px" className="object-cover object-top" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-secondary to-transparent" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Eye className="size-3.5" aria-hidden="true" />
          {viewSample}
        </span>
      </div>

      <div className="flex items-center gap-4 p-4 sm:items-start sm:gap-3.5 sm:p-5">
        {/* Phones: a small thumbnail of the sample instead of the large preview */}
        <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-background shadow-sm ring-1 ring-border sm:hidden">
          <Image src={service.image} alt="" fill sizes="48px" className="object-cover object-top" />
        </span>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-base font-semibold tracking-tight text-foreground">{title}</span>
          <span className="text-sm leading-relaxed text-muted-foreground">{summary}</span>
        </span>
        <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden="true" />
      </div>
    </motion.button>
  )
}

export function ServicesSection() {
  const [selected, setSelected] = useState<number | null>(null)
  const current = selected === null ? null : services[selected]
  const CurrentIcon = current?.icon
  const arabic = usePageArabic()
  const title = useMessage(current?.title ?? "services.formsTitle")
  const description = useMessage(current?.description ?? "services.formsBody")
  const sampleAlt = useMessage("services.sampleAlt", { title: arabic ? title : title.toLowerCase() })

  return (
    <section id="services" className="relative overflow-hidden bg-background py-20 sm:py-28">
      <div className="container relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Msg id="services.eyebrow" />
          </span>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance sm:text-4xl md:text-5xl">
            <Msg id="services.headingLead" />
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground text-pretty">
            <Msg id="services.introBefore" />
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:mt-14 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {services.map((service, index) => (
            <DocumentCard key={service.title} service={service} index={index} onOpen={() => setSelected(index)} />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border border-border bg-secondary p-6 sm:flex-row sm:px-8">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
              <BadgeCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-foreground">
                <Msg id="services.fee" values={{ price: PRICE_AED }} />
              </p>
              <p className="text-sm text-muted-foreground">Money back if your visa is refused.</p>
            </div>
          </div>
          <LocaleLink
            href="/apply"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Msg id="services.start" />
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </LocaleLink>
        </div>
      </div>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-3xl">
          {current && CurrentIcon ? (
            <div className="flex flex-col md:flex-row">
              <div className="relative aspect-[4/3] border-b border-border bg-secondary md:aspect-auto md:min-h-[440px] md:w-2/5 md:border-b-0 md:border-r">
                <Image src={current.image} alt={sampleAlt} fill sizes="(max-width: 768px) 100vw, 320px" className="object-contain p-4" />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
                <div className="flex flex-col gap-4">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CurrentIcon className="size-5" aria-hidden="true" />
                  </span>
                  <DialogTitle className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{title}</DialogTitle>
                  <DialogDescription className="text-base leading-relaxed text-muted-foreground">{description}</DialogDescription>
                </div>
                <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted-foreground">
                    <Msg id="services.included" />
                  </span>
                  <LocaleLink
                    href="/apply"
                    onClick={() => setSelected(null)}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Msg id="services.start" />
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </LocaleLink>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
