"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Clock, BookOpen, Plane, ChevronDown, Tag } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import Image from "next/image"
import { TopDestinationsCarousel } from "@/components/top-destinations-carousel"
import { motion, AnimatePresence } from "framer-motion"
import { destinations } from "@/lib/destinations"
import { ReadyLine, useArabic } from "@/components/ready-line"
import { LangText } from "@/components/lang-text"
import { SCHENGEN_META } from "@/lib/countries"
import { CITIZENSHIP_OPTIONS, citizenshipName, citizenshipSearchValue, toCitizenshipIso } from "@/lib/nationalities"
import { CountryFlag } from "@/components/country-flag"
import { PhotoHeroOverlay } from "@/components/photo-hero-overlay"
import { stableIndex } from "@/lib/stable-index"

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
  .map((name) => CITIZENSHIP_OPTIONS.find((country) => country.name === name))
  .filter((country): country is NonNullable<typeof country> => Boolean(country))

export function HeroSection() {
  const [fromCountry, setFromCountry] = useState("")
  const [toCountry, setToCountry] = useState("")
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const arabic = useArabic()

  const homeDestination = destinations[stableIndex("home", destinations.length)]
  const heroBgImage = homeDestination?.image
  const heroBgCountryName = homeDestination?.name

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
    if (savedFrom) setFromCountry(toCitizenshipIso(savedFrom) || savedFrom)
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
      const incoming = toCitizenshipIso(e.detail.nationality) || e.detail.nationality
      if (incoming !== fromCountry) setFromCountry(incoming)
    }
    window.addEventListener("nationalityChange", handleNationalityChange as EventListener)
    return () => window.removeEventListener("nationalityChange", handleNationalityChange as EventListener)
  }, [fromCountry])

  useEffect(() => {
    if (toCountry) localStorage.setItem("hero-to-country", toCountry)
  }, [toCountry])

  const fromLabel = citizenshipName(fromCountry) || fromCountry

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
    <section id="hero" className="relative overflow-hidden border-b border-border bg-[#FFFFFF] pt-12">

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
          initial={false}
          animate="visible"
          className="photo-hero relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-[#E3E7EF] shadow-2xl p-6 py-12 md:p-12 lg:p-16 flex flex-col items-center text-center bg-[#FFFFFF] z-20"
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
          <PhotoHeroOverlay />

          {/* Content Wrapper */}
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Plain intro line (replaced the removed rating badge) */}
            <motion.p variants={itemVariants} className="mb-5 text-sm text-white/90">
              <LangText en="Schengen visa application preparation from the UAE" ar="تجهيز طلبات تأشيرة شنغن من الإمارات" />
            </motion.p>

            {/* Headline */}
            <motion.h1 variants={itemVariants} className="hero-copy max-w-4xl text-balance text-white">
              <LangText
                en={<>Get your Schengen visa application ready, the <span className="text-[#0436DC]">easy</span> way.</>}
                ar={<>جهّز طلب تأشيرة شنغن، <span className="text-[#0436DC]">بسهولة.</span></>}
              />
            </motion.h1>

            {/* Subheading */}
            <motion.p variants={itemVariants} className="hero-copy mt-5 max-w-2xl text-white/90">
              <LangText
                en="Tell us about your trip. Our visa experts prepare your forms, cover letter, itinerary and bookings, and check every page before you apply."
                ar="أخبرنا عن رحلتك. يجهّز خبراؤنا النماذج وخطاب التغطية وخط السير والحجوزات، ويراجعون كل صفحة قبل تقديم طلبك."
              />
            </motion.p>

            {/* Country selector card */}
            <motion.div variants={itemVariants} className="mt-10 w-full max-w-3xl relative z-10">
              <div className="rounded-[2rem] border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(10,15,31,0.28)] md:p-8">
              <div className="flex flex-col gap-4">
                
                {/* Selectors Row */}
                <div className="flex flex-col md:flex-row items-stretch gap-4">
                  
                  {/* Selector 1 */}
                  <div className="flex-1 flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-semibold text-primary-foreground/85 uppercase tracking-wider px-1"><LangText en="1. My Nationality" ar="1. جنسيتي" /></span>
                    <Popover open={fromOpen} onOpenChange={setFromOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`w-full group flex items-center gap-3 px-4 py-3 h-14 rounded-2xl border transition-all text-left shadow-xs hover:shadow-sm cursor-pointer ${
                            fromOpen
                              ? "border-primary bg-background ring-2 ring-primary/30"
                              : "border-transparent bg-background hover:bg-secondary"
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                            <BookOpen className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {fromCountry ? (
                              <div className="flex items-center gap-2">
                                <CountryFlag iso={toCitizenshipIso(fromCountry)} title={fromLabel} />
                                <span className="text-base font-semibold truncate text-foreground">{fromLabel}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground"><LangText en="Select nationality" ar="اختر الجنسية" /></span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 text-[#5B6475] flex-shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[320px] p-0 rounded-2xl"
                        align="start"
                        sideOffset={8}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command className="bg-transparent">
                          <CommandInput placeholder={arabic ? "ابحث عن دولة..." : "Search country..."} className="h-12 text-base border-b-0" autoFocus={!isMobile} />
                          <CommandList className="max-h-[300px] p-2">
                            <CommandEmpty><LangText en="No country found." ar="لم يُعثر على دولة." /></CommandEmpty>
                            <CommandGroup>
                              {fromCountries.map((country) => (
                                <CommandItem
                                  key={country.iso}
                                  value={citizenshipSearchValue(country)}
                                  onSelect={() => { setFromCountry(country.iso); setFromOpen(false) }}
                                  className="cursor-pointer py-3 px-4 text-base rounded-xl hover:bg-primary/10 transition-colors my-1"
                                >
                                  <div className="flex items-center gap-3">
                                    <CountryFlag iso={country.iso} title={country.name} />
                                    <span className="font-medium">{country.name}</span>
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
                    <span className="text-xs font-semibold text-primary-foreground/85 uppercase tracking-wider px-1"><LangText en="2. My Destination" ar="2. وجهتي" /></span>
                    <Popover open={toOpen} onOpenChange={setToOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`w-full group flex items-center gap-3 px-4 py-3 h-14 rounded-2xl border transition-all text-left shadow-xs hover:shadow-sm cursor-pointer ${
                            toOpen
                              ? "border-primary bg-background ring-2 ring-primary/30"
                              : "border-transparent bg-background hover:bg-secondary"
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                            <Plane className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {toCountry ? (
                              <div className="flex items-center gap-2">
                                <CountryFlag iso={SCHENGEN_META[toCountry]?.iso} title={toCountry} />
                                <span className="text-base font-semibold truncate text-foreground">{toCountry}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground"><LangText en="Pick a destination" ar="اختر الوجهة" /></span>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 text-[#5B6475] flex-shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[320px] p-0 rounded-2xl"
                        align="end"
                        sideOffset={8}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command className="bg-transparent">
                          <CommandInput placeholder={arabic ? "ابحث عن دولة..." : "Search country..."} className="h-12 text-base border-b-0" autoFocus={!isMobile} />
                          <CommandList className="max-h-[300px] p-2">
                            <CommandEmpty><LangText en="No country found." ar="لم يُعثر على دولة." /></CommandEmpty>
                            <CommandGroup>
                              {schengenCountries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={() => { setToCountry(country); setToOpen(false) }}
                                  className="cursor-pointer py-3 px-4 text-base rounded-xl hover:bg-primary/10 transition-colors my-1"
                                >
                                  <div className="flex items-center gap-3">
                                    <CountryFlag iso={SCHENGEN_META[country]?.iso} title={country} />
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
                        className="w-full md:w-auto h-14 py-4 px-8 text-base font-semibold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all bg-primary hover:bg-primary/95 text-white cursor-pointer"
                        disabled={!fromCountry || !toCountry}
                        asChild
                      >
                        <Link href={handleGetStarted()}>
                          <LangText en="Get started" ar="ابدأ" /> <ArrowRight className="ml-2 h-5 w-5" />
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
                      className="overflow-hidden border-t border-primary-foreground/15 pt-4 mt-2"
                    >
                      <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center -space-x-2.5 flex-shrink-0 mt-1">
                            <CountryFlag iso={toCitizenshipIso(fromCountry)} title={fromLabel} />
                            <CountryFlag iso={SCHENGEN_META[toCountry]?.iso} title={toCountry} />
                          </div>
                          <div>
                            <div className="font-semibold text-primary-foreground text-sm md:text-base">
                              <LangText
                                en={`Schengen visa required for ${fromLabel} citizens visiting ${toCountry}`}
                                ar={`تأشيرة شنغن مطلوبة لمواطني ${fromLabel} عند زيارة ${toCountry}`}
                              />
                            </div>
                            <p className="text-xs md:text-sm text-primary-foreground/80 mt-0.5 leading-relaxed">
                              <LangText
                                en="Let's prepare your full visa dossier. We check everything (cover letter, reservations and itinerary) before you submit."
                                ar="لنجهّز ملف التأشيرة كاملًا. نراجع كل شيء (خطاب التغطية والحجوزات وخط السير) قبل التقديم."
                              />
                            </p>
                          </div>
                        </div>
                        
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Reassurance row under form */}
            <motion.div variants={itemVariants} className="mt-6 w-full max-w-3xl flex flex-wrap justify-center gap-2 sm:gap-4 lg:gap-6 font-medium text-primary-foreground mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur-xl rounded-xl p-2 px-3 sm:px-4">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground flex-shrink-0" />
                <span className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left"><LangText en="Full refund before we start" ar="استرداد كامل قبل بدء التجهيز" /></span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur-xl rounded-xl p-2 px-3 sm:px-4">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground flex-shrink-0" />
                <ReadyLine className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left" />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur-xl rounded-xl p-2 px-3 sm:px-4">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground flex-shrink-0" />
                <span className="font-semibold text-primary-foreground text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left"><LangText en="All-Inclusive File" ar="ملف شامل" /></span>
              </div>
            </motion.div>
          </motion.div>

          </div> {/* Content Wrapper close */}
          {heroBgCountryName && (
            <div className="absolute bottom-4 right-6 md:bottom-5 md:right-8 text-[9px] md:text-[10px] text-[#0A0F1F]/40 tracking-widest font-semibold uppercase z-20 pointer-events-none select-none">
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
