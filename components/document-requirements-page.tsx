"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, FileText, AlertCircle, BookOpen, ClipboardList, Camera, ShieldCheck, Plane, Hotel, Landmark, Briefcase, Receipt, PenLine, Map, Stamp, BookMarked } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import Image from "next/image"
import { SCHENGEN_COUNTRIES, countryFlags, getCountryUrl } from "@/lib/countries"
import { motion } from "framer-motion"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { FixedCTAButton } from "@/components/fixed-cta-button"
import { formatPrice, PRICES, type Currency } from "@/lib/currency"

interface DocumentRequirementsPageProps {
  initialCountry: string
}

// Country background images mapping
const countryBackgrounds: Record<string, string> = {
  Austria: "/images/countries/austria.jpg",
  Belgium: "/images/countries/belgium.jpg",
  Bulgaria: "/images/countries/bulgaria.jpg",
  Croatia: "/images/countries/croatia.jpg",
  "Czech Republic": "/images/countries/czech-republic.jpg",
  Denmark: "/images/countries/denmark.jpg",
  Estonia: "/images/countries/estonia.jpg",
  Finland: "/images/countries/finland.jpg",
  France: "/images/countries/france.jpg",
  Germany: "/images/countries/germany.jpg",
  Greece: "/images/countries/greece.jpg",
  Hungary: "/images/countries/hungary.jpg",
  Iceland: "/images/countries/iceland.jpg",
  Italy: "/images/countries/italy.jpg",
  Latvia: "/images/countries/latvia.jpg",
  Liechtenstein: "/images/countries/liechtenstein.jpg",
  Lithuania: "/images/countries/lithuania.jpg",
  Luxembourg: "/images/countries/luxembourg.jpg",
  Malta: "/images/countries/malta.jpg",
  Netherlands: "/images/countries/netherlands.jpg",
  Norway: "/images/countries/norway.jpg",
  Poland: "/images/countries/poland.jpg",
  Portugal: "/images/countries/portugal.jpg",
  Romania: "/images/countries/romania.jpg",
  Slovakia: "/images/countries/slovakia.jpg",
  Slovenia: "/images/countries/slovenia.jpg",
  Spain: "/images/countries/spain.jpg",
  Sweden: "/images/countries/sweden.jpg",
  Switzerland: "/images/countries/switzerland.jpg",
  // Default fallback
  default: "/images/eiffel-tower-view.jpg"
}

const getDocumentRequirements = (country: string) => ({
  essential: [
    {
      title: "Valid Passport",
      description: "Must be valid for at least 3 months beyond your planned stay with at least 2 blank pages",
      required: true,
      icon: BookMarked,
    },
    {
      title: "Completed Visa Application Form",
      description: "Fully filled and signed application form for Schengen visa",
      required: true,
      icon: ClipboardList,
    },
    {
      title: "Recent Passport Photos",
      description: "Two recent color photographs (35mm x 45mm) with white background",
      required: true,
      icon: Camera,
    },
    {
      title: "Travel Insurance",
      description: "Medical insurance coverage of minimum €30,000 valid across Schengen area",
      required: true,
      icon: ShieldCheck,
    },
    {
      title: "Flight Reservation",
      description: "Round-trip flight itinerary showing entry and exit dates",
      required: true,
      icon: Plane,
    },
    {
      title: "Hotel Booking",
      description: "Confirmed accommodation for entire stay in " + country,
      required: true,
      icon: Hotel,
    },
  ],
  financial: [
    {
      title: "Bank Statements",
      description: "Last 6 months of bank statements showing sufficient funds",
      required: true,
      icon: Landmark,
    },
    {
      title: "Employment Letter",
      description: "Letter from employer confirming employment and approved leave",
      required: true,
      icon: Briefcase,
    },
  ],
  additional: [
    {
      title: "Cover Letter",
      description: "Personalized letter explaining purpose of visit and travel itinerary",
      required: false,
      icon: PenLine,
    },
    {
      title: "Travel Itinerary",
      description: "Day-by-day plan of activities and places to visit",
      required: false,
      icon: Map,
    },
    {
      title: "Previous Visas",
      description: "Copies of previous Schengen visas if applicable",
      required: false,
      icon: Stamp,
    },
  ],
})

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

export function DocumentRequirementsPage({ initialCountry }: DocumentRequirementsPageProps) {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry)
  const [selectedNationality, setSelectedNationality] = useState<string>("")
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currency, setCurrency] = useState<Currency>("AED")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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

  const requirements = getDocumentRequirements(selectedCountry)

  const handleNationalitySelect = (nationality: string) => {
    setSelectedNationality(nationality)
    localStorage.setItem("hero-from-country", nationality)
    // Dispatch event to sync with header and hero
    window.dispatchEvent(new CustomEvent("nationalityChange", { detail: { nationality } }))
  }

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    setOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
    router.push(getCountryUrl(country))
  }

  // Push Crisp chat widget up on mobile so it doesn't overlap the fixed CTA button
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "crisp-offset-style"
    style.textContent = `
      @media (max-width: 1023px) {
        .crisp-client .cc-1brb6[data-full-view=false] .cc-unoo {
          bottom: 80px !important;
        }
        #crisp-chatbox .cc-1brb6[data-full-view=false] .cc-unoo {
          bottom: 80px !important;
        }
        .crisp-client .cc-1brb6 .cc-unoo {
          bottom: 80px !important;
        }
        .crisp-client a[data-cfs-tooltip] {
          bottom: 80px !important;
        }
        .crisp-client .crisp-1swadhx {
          bottom: 80px !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById("crisp-offset-style")
      if (el) el.remove()
    }
  }, [])

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-gray-50">
        <InnerHero
          badge="Requirements"
          title={
            <>
              Required Documents to Apply for a Tourist Visa in <span className="text-blue-300">{selectedCountry}</span>
            </>
          }
          description={`Complete checklist of documents required for your ${selectedCountry} tourist visa application.`}
          backgroundImage={countryBackgrounds[selectedCountry] || countryBackgrounds.default}
        >
          {/* Country Selector */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[240px] md:min-w-[280px] h-12 md:h-14 justify-between text-left font-normal bg-white/10 dark:bg-black/30 text-white border-white/20 hover:border-white/30 hover:bg-white/20 focus:border-white/50 rounded-2xl shadow-inner backdrop-blur-md"
                >
                  <div className="flex items-center">
                    <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block mr-3 flex-shrink-0 shadow-xs">
                      <Image
                        src={`/flags/${selectedCountry.toLowerCase().replace(/\s+/g, "-")}.png`}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </span>
                    <span className="text-lg font-semibold">{selectedCountry}</span>
                  </div>
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="ml-2 text-white/80"
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
              <PopoverContent className="w-[300px] p-0" align="center">
                <Command>
                  <CommandInput placeholder="Search country..." autoFocus={!isMobile} />
                  <CommandList className="max-h-[400px]">
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {SCHENGEN_COUNTRIES.map((country) => (
                        <CommandItem
                          key={country}
                          value={country}
                          onSelect={() => handleCountryChange(country)}
                          className="cursor-pointer py-3"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <span className="relative w-5.5 h-5.5 rounded-full overflow-hidden inline-block mr-2 flex-shrink-0 shadow-xs">
                              <Image
                                src={`/flags/${country.toLowerCase().replace(/\s+/g, "-")}.png`}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            </span>
                            <span className="flex-1">{country}</span>
                            {country === selectedCountry && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </InnerHero>

        <section className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Documents List (65%) */}
            <div className="flex-1 lg:w-[65%] space-y-8">
              {/* Essential Documents */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-medium">Essential Documents</h2>
                  <span className="text-[10px] md:text-xs text-muted-foreground">(Required)</span>
                </div>

                <div className="grid gap-3">
                  {requirements.essential.map((doc, index) => (
                    <DocumentCard key={index} {...doc} />
                  ))}
                </div>
              </motion.div>

              {/* Financial Documents */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-medium">Financial Documents</h2>
                  <span className="text-[10px] md:text-xs text-muted-foreground">(Required)</span>
                </div>

                <div className="grid gap-3">
                  {requirements.financial.map((doc, index) => (
                    <DocumentCard key={index} {...doc} />
                  ))}
                </div>
              </motion.div>

              {/* Additional Documents */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-medium">Additional Documents</h2>
                  <span className="text-[10px] md:text-xs text-muted-foreground">(Recommended)</span>
                </div>

                <div className="grid gap-3">
                  {requirements.additional.map((doc, index) => (
                    <DocumentCard key={index} {...doc} />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Sticky CTA Box (35%) */}
            <div className="lg:w-[35%]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="sticky top-24 bg-gray-50/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 shadow-lg"
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">Start your application</h3>
                  </div>

                  {/* Nationality Selector - Where are you from? */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Where are you from?</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-14 justify-between text-left font-normal bg-white hover:bg-gray-50 border-gray-300 rounded-xl"
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
                              <span className="text-base font-medium text-gray-900">{selectedNationality}</span>
                            </div>
                          ) : (
                            <span className="text-base text-gray-500">Select your nationality</span>
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
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all rounded-xl"
                  >
                    <Link href="/apply" className="flex items-center justify-center gap-2">
                      Apply Now!
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </Button>

                  {/* Pricing and Benefits */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-medium text-primary mb-1">
                        {formatPrice(PRICES.visaApplication, currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">Complete visa assistance</div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Document verification</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Cover letter writing</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Travel itinerary creation</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">Application review</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
      <FixedCTAButton country={selectedCountry} />
    </>
  )
}

function DocumentCard({ title, description, required, icon: Icon }: { title: string; description: string; required: boolean; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200 hover:border-primary/50 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2.5 md:gap-3">
        <div
          className={`mt-0.5 h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            required ? "bg-primary/10" : "bg-gray-100"
          }`}
        >
          <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${required ? "text-primary" : "text-gray-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm md:text-base font-semibold">{title}</h3>
            {required && (
              <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium whitespace-nowrap">
                Required
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
