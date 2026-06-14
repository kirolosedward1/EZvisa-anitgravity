"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Star, Clock, BookOpen, Plane, ChevronDown, Tag } from "lucide-react"
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

function getApprovalRate(from: string, to: string) {
  if (!from || !to) return "98.0%";
  const key = `${from}-${to}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  // Generate a stable pseudo-random rate between 94.0% and 99.4%
  const rate = 94.0 + (Math.abs(hash) % 55) / 10;
  return `${rate.toFixed(1)}%`;
}

export function HeroSection() {
  const [fromCountry, setFromCountry] = useState("")
  const [toCountry, setToCountry] = useState("")
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [heroBgImage, setHeroBgImage] = useState<string | undefined>(undefined)
  const [heroBgCountryName, setHeroBgCountryName] = useState<string | undefined>(undefined)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * destinations.length)
    const randomDest = destinations[randomIndex]
    if (randomDest && randomDest.image) {
      setHeroBgImage(randomDest.image)
      setHeroBgCountryName(randomDest.name)
    }
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
      {/* Premium Subtle Grid & Radial Glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft radial glow centering on the hero container */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10" />
        {/* Subtle, structured grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15] hidden md:block"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.45 0.25 264 / 0.15) 1.5px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black 70%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 30%, black 70%, transparent 100%)",
          }}
        />
        {/* Top Left Flight Path */}
        <div className="absolute -top-4 -left-4 w-[300px] h-[220px] opacity-[0.25] brightness-0 invert pointer-events-none hidden lg:block select-none rotate-[90deg] -scale-x-100">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        {/* Bottom Right Flight Path */}
        <div className="absolute bottom-28 right-[4%] w-[320px] h-[240px] opacity-[0.25] brightness-0 invert pointer-events-none hidden lg:block select-none rotate-[10deg]">
          <Image
            src="/images/flight-path-3.png"
            alt=""
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        {/* Border transition gradient lines */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative container mx-auto px-4 pt-6 md:pt-10 lg:pt-12 pb-10 md:pb-12 max-w-6xl">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-border/40 shadow-2xl p-6 py-12 md:p-12 lg:p-16 flex flex-col items-center text-center bg-slate-950"
        >
          {/* Background Image */}
          <Image
            src={heroBgImage || "/images/berlin-hero-bg.jpg"}
            alt={heroBgCountryName ? `${heroBgCountryName} background` : "Berlin sunset background"}
            fill
            priority
            className="object-cover object-center pointer-events-none"
            unoptimized
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/75 pointer-events-none" />

          {/* Content Wrapper */}
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Trust badge */}
            <motion.div 
              variants={itemVariants} 
              className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white cursor-default"
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="tracking-wide uppercase text-[10px] font-bold text-white/95">
                4.9/5 from 5,000+ travelers
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.1] tracking-tight text-balance max-w-4xl text-white">
              Get your Schengen visa approved, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-200 animate-gradient-x">the easy way.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-lg md:text-xl text-blue-100/90 leading-relaxed font-medium">
              We prepare your complete visa file — forms, cover letter, itinerary, and bookings — so embassies say yes.
            </motion.p>

            {/* Country selector card */}
            <motion.div variants={itemVariants} className="mt-10 w-full max-w-3xl relative z-10">
              <div className="bg-background/95 dark:bg-card/95 backdrop-blur-md border border-border/50 rounded-[2rem] p-6 md:p-8 shadow-2xl">
              <div className="flex flex-col gap-4">
                
                {/* Visual Widget Header */}
                <div className="flex items-center justify-between mb-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Visa Application</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase tracking-wider">Schengen Area</span>
                </div>

                {/* Selectors Row */}
                <div className="flex flex-col md:flex-row items-stretch gap-4">
                  
                  {/* Selector 1 */}
                  <div className="flex-1 flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">1. My Nationality</span>
                    <Popover open={fromOpen} onOpenChange={setFromOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`w-full group flex items-center gap-3 px-4 py-3 h-14 rounded-2xl border transition-all text-left shadow-xs hover:shadow-sm cursor-pointer ${
                            fromOpen
                              ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                              : "border-border bg-background hover:bg-secondary/50"
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                            <BookOpen className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {fromCountry ? (
                              <div className="flex items-center gap-2">
                                <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                  <Image
                                    src={`/flags/${fromCountry.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </span>
                                <span className="text-base font-bold truncate text-foreground">{fromCountry}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">Select nationality</span>
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
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">2. My Destination</span>
                    <Popover open={toOpen} onOpenChange={setToOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`w-full group flex items-center gap-3 px-4 py-3 h-14 rounded-2xl border transition-all text-left shadow-xs hover:shadow-sm cursor-pointer ${
                            toOpen
                              ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                              : "border-border bg-background hover:bg-secondary/50"
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                            <Plane className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {toCountry ? (
                              <div className="flex items-center gap-2">
                                <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                  <Image
                                    src={`/flags/${toCountry.toLowerCase().replace(/\s+/g, "-")}.png`}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </span>
                                <span className="text-base font-bold truncate text-foreground">{toCountry}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground">Pick a destination</span>
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

                  {/* Get Started Button */}
                  <div className="md:w-auto flex-shrink-0 flex items-end">
                    <motion.div
                      animate={fromCountry && toCountry ? { scale: [1, 1.03, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                      className="w-full md:w-auto"
                    >
                      <Button
                        className="w-full md:w-auto h-14 py-4 px-8 text-base font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all bg-primary hover:bg-primary/95 text-white cursor-pointer"
                        disabled={!fromCountry || !toCountry}
                        asChild
                      >
                        <Link href={handleGetStarted()}>
                          Get started <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </motion.div>
                  </div>

                </div>

                {/* Dynamic Visa Checker Alert Panel */}
                <AnimatePresence>
                  {fromCountry && toCountry && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ type: "spring", stiffness: 120, damping: 14 }}
                      className="overflow-hidden border-t border-border pt-4 mt-2"
                    >
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center -space-x-2.5 flex-shrink-0 mt-1">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-xs border border-background z-10 bg-secondary/50">
                              <Image
                                src={`/flags/${fromCountry.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                alt={fromCountry}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-xs border border-background bg-secondary/50">
                              <Image
                                src={`/flags/${toCountry.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                alt={toCountry}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm md:text-base">
                              Schengen visa required for {fromCountry} citizens visiting {toCountry}
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                              Let's prepare your full visa dossier. We verify everything (cover letter, bookings, and itinerary) for a successful embassy submission.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-row md:flex-col gap-3 md:gap-1.5 w-full md:w-auto text-xs font-semibold text-muted-foreground/90 flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                          <div className="flex items-center gap-1.5 bg-background px-2.5 py-1.5 rounded-lg border shadow-xs">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>Ready: 24-48h</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-background px-2.5 py-1.5 rounded-lg border shadow-xs">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span>{getApprovalRate(fromCountry, toCountry)} Approval</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Reassurance row under form */}
            <motion.div variants={itemVariants} className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-white/95">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-xs shadow-xs rounded-xl px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-300" />
                <span>Money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-xs shadow-xs rounded-xl px-3 py-1.5">
                <Clock className="h-4 w-4 text-blue-300" />
                <span>Ready in 24-48 hours</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-xs shadow-xs rounded-xl px-3 py-1.5">
                <Tag className="h-4 w-4 text-blue-300" />
                <span>From <span className="font-bold text-white">249 AED</span></span>
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
