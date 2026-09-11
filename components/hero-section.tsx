"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Star, Clock, BookOpen, Plane, ChevronDown, Tag, MapPin } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import Image from "next/image"
import { TopDestinationsCarousel } from "@/components/top-destinations-carousel"
import { motion, AnimatePresence } from "framer-motion"
import { destinations } from "@/lib/destinations"

const countryFlags: Record<string, string> = {
  Austria: "🇦🇹", Belgium: "🇧🇪", Croatia: "🇭🇷", "Czech Republic": "🇨🇿",
  Denmark: "🇩🇰", Estonia: "🇪🇪", Finland: "🇫🇮", France: "🇫🇷",
  Germany: "🇩🇪", Greece: "🇬🇷", Hungary: "🇭🇺", Iceland: "🇮🇸",
  Italy: "🇮🇹", Latvia: "🇱🇻", Liechtenstein: "🇱🇮", Lithuania: "🇱🇹",
  Luxembourg: "🇱🇺", Malta: "🇲🇹", Netherlands: "🇳🇱", Norway: "🇳🇴",
  Poland: "🇵🇱", Portugal: "🇵🇹", Romania: "🇷🇴", Slovakia: "🇸🇰",
  Slovenia: "🇸🇮", Spain: "🇪🇸", Sweden: "🇸🇪", Switzerland: "🇨🇭",
  Bulgaria: "🇧🇬",
  Egypt: "🇪🇬", India: "🇮🇳", Jordan: "🇯🇴", Pakistan: "🇵🇰",
  "Russian Federation": "🇷🇺", Syria: "🇸🇾",
}

const schengenCountries = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland",
  "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Slovakia",
  "Slovenia", "Spain", "Sweden", "Switzerland",
]

const fromCountries = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria"]



export function HeroSection({ initialBgImage = "/images/berlin-hero-bg.jpg", initialBgCountry = "Germany" }: { initialBgImage?: string, initialBgCountry?: string }) {
  const [fromCountry, setFromCountry] = useState("")
  const [toCountry, setToCountry] = useState("")
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Use props directly for immediate SSR render (fixes LCP)
  const heroBgImage = initialBgImage;
  const heroBgCountryName = initialBgCountry;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const savedFrom = localStorage.getItem("hero-from-country")
    const savedTo = localStorage.getItem("hero-to-country")
    if (savedFrom) setFromCountry(savedFrom)
    if (savedTo) setToCountry(savedTo)
  }, [])

  useEffect(() => {
    if (fromCountry) {
      localStorage.setItem("hero-from-country", fromCountry)
      window.dispatchEvent(new CustomEvent("nationalityChange", { detail: { nationality: fromCountry } }))
    }
  }, [fromCountry])

  useEffect(() => {
    const handleNationalityChange = (e: CustomEvent<{ nationality: string }>) => {
      if (e.detail.nationality !== fromCountry) setFromCountry(e.detail.nationality)
    }
    window.addEventListener("nationalityChange", handleNationalityChange as EventListener)
    return () => window.removeEventListener("nationalityChange", handleNationalityChange as EventListener)
  }, [fromCountry])

  useEffect(() => {
    if (toCountry) localStorage.setItem("hero-to-country", toCountry)
  }, [toCountry])

  const handleGetStarted = () => {
    const params = new URLSearchParams()
    if (fromCountry) params.set("from", fromCountry)
    if (toCountry) params.set("to", toCountry)
    return `/apply?${params.toString()}`
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  } as const

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  } as const

  return (
    <section id="hero" className="relative overflow-hidden border-b border-border bg-background pt-12">
      {/* Subtle Document Geometry Pattern */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Subtle, structured grid overlay resembling document security paper */}
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] hidden md:block"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.45 0.25 264 / 0.2) 1.5px, transparent 0)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative container mx-auto px-4 pt-6 md:pt-10 lg:pt-12 pb-10 md:pb-12 max-w-6xl">
        {/* Top Left Flight Path */}
        <div className="absolute top-24 -left-24 w-[400px] h-[300px] pointer-events-none hidden lg:block select-none rotate-[20deg] -scale-x-100 opacity-[0.22] dark:opacity-[0.15] dark:brightness-0 dark:invert z-10">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            sizes="280px"
            className="object-contain"
            priority
          />
        </div>
        
        {/* Bottom Right Flight Path */}
        <div className="absolute -bottom-12 -right-24 w-[400px] h-[300px] pointer-events-none hidden lg:block select-none rotate-[15deg] opacity-[0.22] dark:opacity-[0.15] dark:brightness-0 dark:invert z-10">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            sizes="300px"
            className="object-contain"
            priority
          />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full rounded-lg md:rounded-xl overflow-hidden border border-border/50 shadow-xl p-6 py-12 md:p-12 lg:p-16 flex flex-col items-center text-center bg-slate-950 z-20"
        >
          {/* Background Image */}
          <Image
            src={heroBgImage || "/images/berlin-hero-bg.jpg"}
            alt={heroBgCountryName ? `${heroBgCountryName} background` : "Berlin sunset background"}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover object-center pointer-events-none"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-slate-950/70 to-slate-950/90 pointer-events-none" />

          {/* Content Wrapper */}
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Headline */}
            <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-balance max-w-4xl text-white">
              Professional Schengen Visa <span className="text-primary-foreground underline decoration-primary decoration-4 underline-offset-8">Document Preparation.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p variants={itemVariants} className="mt-5 max-w-2xl text-base md:text-lg text-blue-100/90 leading-relaxed font-medium">
              We prepare your complete visa file in 24-48 hours — forms, cover letter, itinerary, and verifiable bookings — ready for your embassy appointment.
            </motion.p>

            {/* Country selector card */}
            <motion.div variants={itemVariants} className="mt-10 w-full max-w-3xl relative z-10">
              {/* Boarding Pass Aesthetic Card */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-0 shadow-2xl relative overflow-hidden border border-border/50 flex flex-col md:flex-row">
                
                {/* Left side: Main Content */}
                <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-dashed border-border/60">
                  <div className="flex flex-col gap-4">
                    
                    {/* Visual Widget Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Application File</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-sm uppercase tracking-widest border border-primary/20">Schengen Area</span>
                    </div>

                    {/* Selectors Row */}
                    <div className="flex flex-col md:flex-row items-stretch gap-4 mt-2">
                      
                      {/* Selector 1 */}
                      <div className="flex-1 flex flex-col gap-1.5 text-left">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Nationality</span>
                        <Popover open={fromOpen} onOpenChange={setFromOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`w-full group flex items-center gap-3 px-4 py-3 h-14 rounded-md border transition-all text-left cursor-pointer ${
                                fromOpen
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "border-border bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <div className="h-9 w-9 rounded-md bg-white dark:bg-slate-900 border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                {fromCountry ? (
                                  <div className="flex items-center gap-2">
                                    <span className="relative w-5 h-5 rounded-sm overflow-hidden inline-block flex-shrink-0 shadow-xs border border-border/50">
                                      <Image
                                        src={`/flags/${fromCountry.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                        alt=""
                                        fill
                                        sizes="20px"
                                        className="object-cover"
                                      />
                                    </span>
                                    <span className="text-sm md:text-base font-bold truncate text-foreground tracking-tight">{fromCountry}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-muted-foreground">Select origin</span>
                                )}
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[320px] p-0 bg-background border border-border shadow-2xl rounded-2xl"
                        align="start"
                        sideOffset={8}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Search country..." className="h-12 text-base border-b-0" autoFocus={!isMobile} />
                          <CommandList className="max-h-[300px] p-2">
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {fromCountries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={() => { setFromCountry(country); setFromOpen(false) }}
                                  className="cursor-pointer py-3 px-4 text-base rounded-xl hover:bg-primary/10 transition-colors my-1"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                      <Image
                                        src={`/flags/${country.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                        alt=""
                                        fill
                                        className="object-cover"
                                      />
                                    </span>
                                    <span className="font-medium">{country}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Selector 2 */}
                  <div className="flex-1 flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Destination</span>
                    <Popover open={toOpen} onOpenChange={setToOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`w-full group flex items-center gap-3 px-4 py-3 h-14 rounded-md border transition-all text-left cursor-pointer ${
                            toOpen
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="h-9 w-9 rounded-md bg-white dark:bg-slate-900 border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {toCountry ? (
                              <div className="flex items-center gap-2">
                                <span className="relative w-5 h-5 rounded-sm overflow-hidden inline-block flex-shrink-0 shadow-xs border border-border/50">
                                  <Image
                                    src={`/flags/${toCountry.toLowerCase().replace(/\s+/g, "-")}.png`}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </span>
                                <span className="text-sm md:text-base font-bold truncate text-foreground tracking-tight">{toCountry}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">Pick destination</span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[320px] p-0 bg-background border border-border shadow-2xl rounded-2xl"
                        align="end"
                        sideOffset={8}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Search country..." className="h-12 text-base border-b-0" autoFocus={!isMobile} />
                          <CommandList className="max-h-[300px] p-2">
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {schengenCountries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={() => { setToCountry(country); setToOpen(false) }}
                                  className="cursor-pointer py-3 px-4 text-base rounded-xl hover:bg-primary/10 transition-colors my-1"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                      <Image
                                        src={`/flags/${country.toLowerCase().replace(/\s+/g, "-")}.png`}
                                        alt=""
                                        fill
                                        className="object-cover"
                                      />
                                    </span>
                                    <span className="font-medium">{country}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  </div>
                </div>
              </div>

                {/* Right side: Boarding Pass Stub / CTA */}
                <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-950 p-6 md:p-8 flex flex-col justify-center items-center text-center">
                  <div className="mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Service Fee</span>
                    <span className="text-2xl font-black text-foreground">249 AED</span>
                  </div>
                  <Button
                    className="w-full h-12 text-sm font-bold rounded-md shadow-md transition-all bg-primary hover:bg-primary/95 text-white cursor-pointer"
                    disabled={!fromCountry || !toCountry}
                    asChild
                  >
                    <Link href={handleGetStarted()}>
                      Start File <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

            {/* Reassurance row under form */}
            <motion.div variants={itemVariants} className="mt-6 w-full max-w-3xl flex flex-wrap justify-center gap-2 sm:gap-4 lg:gap-6 font-medium text-white/95 mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 bg-white/5 border border-white/10 backdrop-blur-md shadow-xs rounded-xl p-2 px-3 sm:px-4">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left">Transparent Pricing</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 bg-white/5 border border-white/10 backdrop-blur-md shadow-xs rounded-xl p-2 px-3 sm:px-4">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left">Ready in 24-48 hours</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 bg-white/5 border border-white/10 backdrop-blur-md shadow-xs rounded-xl p-2 px-3 sm:px-4">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300 flex-shrink-0" />
                <span className="font-bold text-white text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left">All-Inclusive File</span>
              </div>
            </motion.div>
          </motion.div>

          </div> {/* Content Wrapper close */}
          {heroBgCountryName && (
            <div className="absolute bottom-4 right-6 md:bottom-5 md:right-8 text-[9px] md:text-[10px] text-white/35 tracking-widest font-semibold uppercase z-20 pointer-events-none select-none">
              {heroBgCountryName}
            </div>
          )}
        </motion.div>
      </div>

      <div className="relative w-full pt-8 pb-12 md:pb-16 z-10">
        <TopDestinationsCarousel />
      </div>
    </section>
  )
}
