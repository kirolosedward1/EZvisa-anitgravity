"use client"

import React, { useState, useEffect } from "react"
import { Search, ArrowRight, Compass, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { destinations, Destination } from "@/lib/destinations"
import { destinationNameAr } from "@/lib/destination-names-ar"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { LangText } from "@/components/lang-text"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { Msg } from "@/components/msg"
import { useMessage, usePageArabic } from "@/components/use-message"
import { LocaleLink } from "@/components/locale-link"
import type { MessageKey } from "@/messages"

type TabType = "all" | "schengen" | "non-schengen"

/** Photo card: the whole card opens the destination page; "Apply" goes straight to the wizard. */
function DestinationCard({ country }: { country: Destination }) {
  const arabic = usePageArabic()
  const name = country.name
  const nameAr = destinationNameAr(country.slug) || name
  const specs = [
    { label: "Type", ar: "النوع", value: country.region === "Schengen" ? "Schengen" : country.visaType, valueAr: country.region === "Schengen" ? "شنغن" : country.visaType },
    { label: "Ready in", ar: "جاهز خلال", value: "1–2 days", valueAr: "1–2 يوم" },
    { label: "Fee", ar: "الرسوم", value: `${PRICE_AED} AED`, valueAr: `${PRICE_AED} درهم` },
  ]
  return (
    <div className="photo-card group relative aspect-[3/4] overflow-hidden rounded-[1.75rem] bg-foreground shadow-md ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/15 focus-within:ring-2 focus-within:ring-ring">
      <Image
        src={country.image}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {/* Photo stays bright at the top; text sits on a deep gradient at the bottom. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F] via-[#0A0F1F]/55 via-45% to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0A0F1F]/35 to-transparent" />

      <LocaleLink
        href={`/destinations/${country.slug}`}
        className="absolute inset-0 z-10 rounded-[1.75rem] focus-visible:outline-none"
        aria-label={arabic ? `تأشيرة ${nameAr}: المتطلبات وطريقة التقديم` : `${name} visa: requirements and how to apply`}
      />

      <span className="pointer-events-none absolute end-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-[#0A0F1F]/30 text-primary-foreground ring-1 ring-primary-foreground/30 transition-colors duration-300 group-hover:bg-primary-foreground group-hover:text-foreground">
        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 p-5 text-center text-primary-foreground">
        <CountryFlag iso={SCHENGEN_META[name]?.iso} title={name} className="size-7 ring-2 ring-primary-foreground/80 shadow-md" />
        <h3>
          <LangText en={name} ar={nameAr} />
        </h3>

        <dl className="grid w-full grid-cols-3 border-y border-primary-foreground/15 py-3">
          {specs.map((spec) => (
            <div key={spec.label} className="flex flex-col items-center gap-1">
              <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary-foreground/55">
                <LangText en={spec.label} ar={spec.ar} />
              </dt>
              <dd className="text-xs font-semibold tabular-nums">
                <LangText en={spec.value} ar={spec.valueAr} />
              </dd>
            </div>
          ))}
        </dl>

        {/* Desktop: the button opens on hover (or keyboard focus). Touch screens have no hover, so it always shows there. */}
        <div className="grid w-full transition-[grid-template-rows,opacity,margin] duration-300 ease-out lg:-mt-4 lg:grid-rows-[0fr] lg:opacity-0 lg:group-hover:mt-0 lg:group-hover:grid-rows-[1fr] lg:group-hover:opacity-100 lg:group-focus-within:mt-0 lg:group-focus-within:grid-rows-[1fr] lg:group-focus-within:opacity-100">
          <div className="min-h-0 overflow-hidden">
            <LocaleLink
              href={`/apply?to=${encodeURIComponent(name)}`}
              className="pointer-events-auto relative z-30 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary-foreground text-sm font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label={arabic ? `قدّم على تأشيرة ${nameAr}` : `Apply for a ${name} visa`}
            >
              <LangText en={`Apply for ${name}`} ar={`قدّم على تأشيرة ${nameAr}`} />
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </LocaleLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DestinationsCatalog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const searchCountry = useMessage("apply.searchCountry")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  // Filter destinations based on search query and active tab
  const filteredDestinations = destinations.filter((dest) => {
    const query = searchQuery.trim()
    const arabicName = destinationNameAr(dest.slug)
    const matchesSearch =
      dest.name.toLowerCase().includes(query.toLowerCase()) ||
      (arabicName !== "" && arabicName.includes(query))
    
    if (activeTab === "schengen") {
      return matchesSearch && dest.region === "Schengen"
    } else if (activeTab === "non-schengen") {
      return matchesSearch && dest.region !== "Schengen"
    }
    
    return matchesSearch
  })

  return (
    <div className="w-full">
      {/* Search and Tabs Control Panel */}
      <div className="bg-background/80 border-b border-border/40 py-6 mb-10">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Real-time Search */}
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchCountry}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 h-11 text-sm bg-muted/40 hover:bg-muted/60 focus:bg-background border-border/80 rounded-full transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Custom Sliding Tabs */}
            <div className="flex items-center bg-muted/60 p-1.5 rounded-full border border-border/20 w-full md:w-auto overflow-x-auto select-none no-scrollbar">
              {(
                [
                  { id: "all", label: "catalog.all" },
                  { id: "schengen", label: "catalog.schengen" },
                  { id: "non-schengen", label: "catalog.other" },
                ] as const satisfies readonly { id: TabType; label: MessageKey }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap outline-none cursor-pointer ${
                    activeTab === tab.id
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-primary rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10"><Msg id={tab.label} /></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <section className="pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <AnimatePresence>
            {filteredDestinations.length > 0 ? (
              <motion.div
                initial={false}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
              >
                {filteredDestinations.map((country) => (
                  <DestinationCard key={country.id} country={country} />
                ))}
              </motion.div>
            ) : activeTab === "non-schengen" ? (
              // Glassmorphic Coming Soon Block
              <motion.div
                key="coming-soon"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto text-center py-16 px-6 border border-border/40 rounded-3xl"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                  <Compass className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  <LangText en="Non-Schengen Visa Support" ar="دعم تأشيرات خارج شنغن" />
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-8">
                  <Msg id="catalog.expandBody" />
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <LocaleLink href="/apply" className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors text-xs">
                    <Msg id="catalog.startSchengen" />
                  </LocaleLink>
                  <LocaleLink href="/contact" className="px-6 py-2.5 bg-muted-foreground/10 hover:bg-muted-foreground/15 text-foreground font-semibold rounded-full transition-colors text-xs border border-border/20">
                    <Msg id="catalog.notify" />
                  </LocaleLink>
                </div>
              </motion.div>
            ) : (
              // Empty State
              <motion.div
                key="empty-state"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground"><Msg id="catalog.empty" values={{ query: searchQuery }} /></p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Msg id="catalog.clear" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
