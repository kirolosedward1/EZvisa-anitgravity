"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FileText, ArrowRight, Check, CreditCard, FileCheck, Download } from "lucide-react"
import { formatPrice, PRICES, type Currency } from "@/lib/currency"
import { WhatYouGetSection } from "@/components/what-you-get-section"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// Nationality list from hero component
const fromCountries = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria"]

const fromCountryFlags: Record<string, string> = {
  Egypt: "🇪🇬",
  India: "🇮🇳",
  Jordan: "🇯🇴",
  Pakistan: "🇵🇰",
  "Russian Federation": "🇷🇺",
  Syria: "🇸🇾",
}

const steps = [
  {
    icon: FileText,
    title: "Submit Your Application",
    description:
      "Complete our online form with your personal information, travel destination, budget, travel dates, and spouse details if applicable. Upload required documents such as passports, NOC letters, and any supporting documents.",
    duration: "10-15 minutes",
  },
  {
    icon: CreditCard,
    title: "Pay & Confirm",
    description:
      "Submit your completed application to EZvisa and make a secure payment. Your application will be immediately forwarded to our expert team for processing.",
    duration: "Instant",
  },
  {
    icon: FileCheck,
    title: "We Prepare Your File",
    description:
      "Our visa experts review your application and prepare your complete visa file including application forms, hotel bookings, dummy travel tickets, travel insurance, cover letter, and all necessary supporting documents.",
    duration: "24-48 hours",
  },
  {
    icon: Download,
    title: "Download & Submit",
    description:
      "Your complete visa file is ready for download. Simply print the documents and submit them at your visa appointment at the embassy or visa application center.",
    duration: "Ready to use",
  },
]

export function HowItWorksContent() {
  const [currency, setCurrency] = useState<Currency>("AED")
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
      if (e.detail.nationality !== selectedNationality) {
        setSelectedNationality(e.detail.nationality)
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
    <section className="container mx-auto px-4 py-12 lg:py-16 max-w-7xl">
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
                    <div className="hidden lg:block absolute left-12 top-20 bottom-[-32px] w-[2px] bg-gradient-to-b from-primary/30 to-primary/5" />
                  )}

                  <div className="bg-card border border-border/80 rounded-2xl p-6 lg:p-8 relative shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300">
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
                          <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full w-fit uppercase tracking-wider">
                            {step.duration}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
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
            <Link href="/apply">
              <Button size="lg" className="gap-2">
                Start Your Application
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="hidden lg:block lg:w-[35%]">
          <div className="sticky top-28 bg-card border border-border/80 rounded-3xl p-8 shadow-xl shadow-primary/[0.02]">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center pb-4 border-b border-border/60">
                <h3 className="text-xl font-semibold text-foreground">Start your application</h3>
              </div>

              {/* Nationality Selector - Where are you from? */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Where are you from?</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-between text-left font-semibold bg-background hover:bg-secondary/50 border-border rounded-xl shadow-xs"
                    >
                      {selectedNationality ? (
                        <div className="flex items-center gap-3">
                          <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                            <Image
                              src={`/flags/${selectedNationality.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </span>
                          <span className="text-base font-semibold text-foreground">{selectedNationality}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">Select your nationality</span>
                      )}
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 20 20" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-gray-500"
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
                      <CommandInput placeholder="Search country..." autoFocus={!isMobile} />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {fromCountries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={() => handleNationalitySelect(country)}
                              className="cursor-pointer py-3"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <span className="relative w-5.5 h-5.5 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                  <Image
                                    src={`/flags/${country.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </span>
                                <span className="flex-1">{country}</span>
                                {country === selectedNationality && <Check className="h-4 w-4 text-primary" />}
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
                <Link href="/apply" className="flex items-center justify-center gap-2">
                  Apply Now
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </Button>

              {/* Pricing and Benefits */}
              <div className="pt-6 border-t border-border/60">
                <div className="text-center mb-6">
                  <div className="text-3xl font-semibold text-primary mb-1">
                    {formatPrice(PRICES.visaApplication, currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">Complete visa assistance</div>
                </div>

                <div className="space-y-3.5 text-left">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium">Document verification</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium">Cover letter writing</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium">Travel itinerary creation</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-muted-foreground font-medium">Application review</span>
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
