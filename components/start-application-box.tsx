"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"
import { formatPrice, PRICES, type Currency } from "@/lib/currency"

const fromCountries = [
  "Egypt",
  "India",
  "Jordan",
  "Pakistan",
  "Russian Federation",
  "Syria",
  "Turkey",
  "United Arab Emirates",
  "Saudi Arabia",
  "Philippines",
  "Bangladesh",
  "Sri Lanka",
  "Nigeria",
  "Kenya",
  "South Africa",
]

const fromCountryFlags: Record<string, string> = {
  Egypt: "🇪🇬",
  India: "🇮🇳",
  Jordan: "🇯🇴",
  Pakistan: "🇵🇰",
  "Russian Federation": "🇷🇺",
  Syria: "🇸🇾",
  Turkey: "🇹🇷",
  "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦",
  Philippines: "🇵🇭",
  Bangladesh: "🇧🇩",
  "Sri Lanka": "🇱🇰",
  Nigeria: "🇳🇬",
  Kenya: "🇰🇪",
  "South Africa": "🇿🇦",
}

export function StartApplicationBox() {
  const [selectedNationality, setSelectedNationality] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [currency, setCurrency] = useState<Currency>("AED")

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("hero-from-country")
    if (saved) setSelectedNationality(saved)
  }, [])

  useEffect(() => {
    const savedCurrency = localStorage.getItem("preferred-currency") as Currency
    if (savedCurrency && ["AED", "USD", "EUR", "GBP"].includes(savedCurrency)) {
      setCurrency(savedCurrency)
    }
  }, [])

  const handleNationalitySelect = (country: string) => {
    setSelectedNationality(country)
    localStorage.setItem("hero-from-country", country)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="sticky top-24 bg-gray-50/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl text-gray-900 mb-2 sm:text-xl font-semibold">Start your application</h3>
        </div>

        {/* Nationality Selector */}
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

        {/* Apply Button */}
        <Button
          size="lg"
          asChild
          className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all rounded-xl"
        >
          <Link href="/apply" className="flex items-center justify-center gap-2">
            Apply Now!
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </Button>

        {/* Pricing and Benefits */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-center mb-4">
            <div className="text-3xl font-medium text-primary mb-1">{formatPrice(PRICES.visaApplication, currency)}</div>
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
  )
}
