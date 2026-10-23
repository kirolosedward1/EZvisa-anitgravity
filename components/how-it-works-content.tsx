"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FileText, ArrowRight, Check, CreditCard, FileCheck, Download } from "lucide-react"
import { formatPrice, PRICES, type Currency } from "@/lib/currency"
import { WhatYouGetSection } from "@/components/what-you-get-section"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CITIZENSHIP_OPTIONS, citizenshipLabel, citizenshipLabelAr, citizenshipSearchValue, toCitizenshipIso } from "@/lib/nationalities"
import { CountryFlag } from "@/components/country-flag"
import { Msg } from "@/components/msg"
import { useMessage } from "@/components/use-message"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import type { MessageKey } from "@/messages"

const steps: { icon: typeof FileText; title: MessageKey; description: MessageKey; duration: MessageKey }[] = [
  { icon: FileText, title: "hiw.step1Title", description: "hiw.step1Body", duration: "hiw.step1Time" },
  { icon: CreditCard, title: "hiw.step2Title", description: "hiw.step2Body", duration: "hiw.step2Time" },
  { icon: FileCheck, title: "hiw.step3Title", description: "hiw.step3Body", duration: "hiw.step3Time" },
  { icon: Download, title: "hiw.step4Title", description: "hiw.step4Body", duration: "hiw.step4Time" },
]

export function HowItWorksContent() {
  const [currency, setCurrency] = useState<Currency>("AED")
  const searchCountry = useMessage("apply.searchCountry")
  const [selectedNationality, setSelectedNationality] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const savedCurrency = localStorage.getItem("selectedCurrency") as Currency
    if (savedCurrency) {
      setCurrency(savedCurrency)
    }

    const handleCurrencyChange = (e: CustomEvent<{ currency: Currency }>) => {
      setCurrency(e.detail.currency)
    }

    window.addEventListener("currencyChange", handleCurrencyChange as EventListener)
    return () => window.removeEventListener("currencyChange", handleCurrencyChange as EventListener)
  }, [])

  // Load selected nationality from localStorage (synced with hero and header)
  useEffect(() => {
    const saved = localStorage.getItem("hero-from-country")
    if (saved) {
      setSelectedNationality(saved)
    }

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Listen for nationality changes from header or hero
  useEffect(() => {
    const handleNationalityChange = (e: CustomEvent<{ nationality: string }>) => {
      const incoming = toCitizenshipIso(e.detail.nationality) || e.detail.nationality
      if (incoming !== selectedNationality) {
        setSelectedNationality(incoming)
      }
    }

    window.addEventListener("nationalityChange", handleNationalityChange as EventListener)
    return () => window.removeEventListener("nationalityChange", handleNationalityChange as EventListener)
  }, [selectedNationality])

  const handleNationalitySelect = (nationality: string) => {
    setSelectedNationality(nationality)
    localStorage.setItem("hero-from-country", nationality)
    // Dispatch event to sync with header and hero
    window.dispatchEvent(new CustomEvent("nationalityChange", { detail: { nationality } }))
  }

  return (
    <section className="container mx-auto px-4 py-12 lg:py-16 max-w-7xl relative">
      {/* Top Left Flight Path */}
      <div className="absolute top-12 -left-20 w-[240px] h-[160px] pointer-events-none hidden lg:block select-none rotate-[85deg] -scale-x-100 opacity-[0.22] dark:opacity-[0.15] dark:brightness-0 dark:invert z-0">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          sizes="240px"
          className="object-contain"
          priority
        />
      </div>
      
      {/* Bottom Right Flight Path */}
      <div className="absolute bottom-32 -right-12 w-[280px] h-[200px] pointer-events-none hidden lg:block select-none rotate-[15deg] opacity-[0.22] dark:opacity-[0.15] dark:brightness-0 dark:invert z-0">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          sizes="280px"
          className="object-contain"
          priority
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Steps (65%) */}
        <div className="flex-1 lg:w-[65%]">
          <div className="space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute left-12 top-20 bottom-[-32px] w-[2px] bg-[#0436DC]" />
                  )}

                  <div className="bg-card border border-border/80 rounded-2xl p-6 lg:p-8 relative shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Icon & Step Number */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center">
                            <Icon className="w-6 h-6" strokeWidth={2} />
                          </div>
                          <div className="absolute -top-2 -right-2 w-5.5 h-5.5 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center shadow-md shadow-primary/15">
                            0{index + 1}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-3">
                          <h3 className="text-xl font-semibold text-foreground"><Msg id={step.title} /></h3>
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full w-fit uppercase tracking-wider">
                            <Msg id={step.duration} />
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed"><Msg id={step.description} /></p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* What You Get Section */}
          <div className="mt-16">
            <WhatYouGetSection />
          </div>

          {/* CTA moved to mobile only */}
          <div className="mt-12 text-center lg:hidden">
            <LocaleLink href="/apply">
              <Button size="lg" className="gap-2">
                <Msg id="documents.start" />
                <ArrowRight className="w-4 h-4" />
              </Button>
            </LocaleLink>
          </div>
        </div>

        <div className="hidden lg:block lg:w-[35%]">
          <div className="sticky top-28 bg-card border border-border/80 rounded-3xl p-8 shadow-xl shadow-primary/[0.02]">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center pb-4 border-b border-border/60">
                <h3 className="text-xl font-semibold text-foreground"><Msg id="hiw.start" /></h3>
              </div>

              {/* Nationality Selector - Where are you from? */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1"><Msg id="hiw.from" /></label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-between text-left font-semibold bg-background hover:bg-secondary/50 border-border rounded-xl shadow-xs"
                    >
                      {selectedNationality ? (
                        <div className="flex items-center gap-3">
                          <CountryFlag iso={toCitizenshipIso(selectedNationality)} title={citizenshipLabel(selectedNationality)} />
                          <span className="text-base font-semibold text-foreground">
                            <LangText en={citizenshipLabel(selectedNationality)} ar={citizenshipLabelAr(selectedNationality)} />
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground"><Msg id="hiw.selectNationality" /></span>
                      )}
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 20 20" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-[#5B6475]"
                      >
                        <path 
                          d="M5 7.5L10 12.5L15 7.5" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={searchCountry} autoFocus={!isMobile} />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty><Msg id="apply.noCountry" /></CommandEmpty>
                        <CommandGroup>
                          {CITIZENSHIP_OPTIONS.map((country) => (
                            <CommandItem
                              key={country.iso}
                              value={citizenshipSearchValue(country)}
                              onSelect={() => handleNationalitySelect(country.iso)}
                              className="cursor-pointer py-3"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <CountryFlag iso={country.iso} title={country.name} />
                                <span className="flex-1"><LangText en={country.name} ar={citizenshipLabelAr(country.iso)} /></span>
                                {country.iso === selectedNationality && <Check className="h-4 w-4 text-primary" />}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Apply Button with Primary Blue Color */}
              <Button 
                size="lg" 
                asChild 
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/95 text-white shadow-lg hover:shadow-primary/10 transition-all rounded-xl cursor-pointer"
              >
                <LocaleLink href="/apply" className="flex items-center justify-center gap-2">
                  <Msg id="hiw.applyNow" />
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </LocaleLink>
              </Button>

              {/* Pricing and Benefits */}
              <div className="pt-6 border-t border-border/60">
                <div className="text-center mb-6">
                  <div className="text-3xl font-semibold text-primary mb-1">
                    {formatPrice(PRICES.visaApplication, currency)}
                  </div>
                  <div className="text-xs text-muted-foreground"><Msg id="hiw.assistance" /></div>
                </div>

                <div className="space-y-3.5 text-left">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium"><Msg id="hiw.benefitDocs" /></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium"><Msg id="hiw.benefitCover" /></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium"><Msg id="hiw.benefitItinerary" /></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium"><Msg id="hiw.benefitReview" /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
