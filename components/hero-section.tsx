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
import { ReadyLine, useArabic } from "@/components/ready-line"
import type { ReactNode } from "react"

/** Both languages are in the HTML. The /ar script sets dir=rtl before paint, so Arabic shows at the same size. */
function LangText({ en, ar }: { en: ReactNode; ar: ReactNode }) {
  return (
    <>
      <span className="rtl:hidden">{en}</span>
      <span className="hidden rtl:inline">{ar}</span>
    </>
  )
}
import { CITIZENSHIP_OPTIONS, citizenshipName, citizenshipSearchValue, flagSrc, toCitizenshipIso } from "@/lib/nationalities"

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
  const arabic = useArabic()

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
  const fromFlag = toCitizenshipIso(fromCountry) ? flagSrc(toCitizenshipIso(fromCountry)) : ""

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
          initial="hidden"
          animate="visible"
          className="relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-[#E3E7EF] shadow-2xl p-6 py-12 md:p-12 lg:p-16 flex flex-col items-center text-center bg-[#FFFFFF] z-20"
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
          <div className="absolute inset-0 bg-[#FFFFFF]/90 pointer-events-none" />

          {/* Content Wrapper */}
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Trust badge */}
            <motion.div 
              variants={itemVariants} 
              className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F8FA] border border-[#E3E7EF] text-xs font-semibold text-[#0A0F1F] cursor-default"
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="tracking-wide uppercase text-[10px] font-bold text-[#0A0F1F]">
                <LangText en="4.9/5 from 5,000+ travelers" ar="٤٫٩/٥ من أكثر من ٥٬٠٠٠ مسافر" />
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight text-balance max-w-4xl text-[#0A0F1F]">
              <LangText
                en={<>Get your Schengen visa approved, the <span className="text-[#0436DC]">easy</span> way.</>}
                ar={<>احصل على تأشيرة شنغن، <span className="text-[#0436DC]">بسهولة.</span></>}
              />
            </motion.h1>

            {/* Subheading */}
            <motion.p variants={itemVariants} className="mt-5 max-w-2xl text-base md:text-lg text-[#5B6475] leading-relaxed font-medium">
              <LangText
                en="We prepare your complete visa file — forms, cover letter, itinerary, and bookings — so embassies say yes."
                ar="نجهّز ملف التأشيرة كاملًا — النماذج وخطاب التغطية وخط السير والحجوزات — حتى توافق السفارة."
              />
            </motion.p>

            {/* Country selector card */}
            <motion.div variants={itemVariants} className="mt-10 w-full max-w-3xl relative z-10">
              <div className="bg-[#FFFFFF] border border-[#E3E7EF] rounded-[2rem] p-6 md:p-8 shadow-[0_8px_24px_rgba(10,15,31,0.08)]">
              <div className="flex flex-col gap-4">
                
                {/* Visual Widget Header */}
                <div className="flex items-center justify-between mb-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider"><LangText en="Start Visa Application" ar="ابدأ طلب التأشيرة" /></span>
                  </div>
                  <span className="text-[10px] font-bold text-[#0436DC] bg-[#0436DC]/10 px-2.5 py-1 rounded-md uppercase tracking-wider"><LangText en="Schengen Area" ar="منطقة شنغن" /></span>
                </div>

                {/* Selectors Row */}
                <div className="flex flex-col md:flex-row items-stretch gap-4">
                  
                  {/* Selector 1 */}
                  <div className="flex-1 flex flex-col gap-1.5 text-left">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1"><LangText en="1. My Nationality" ar="١. جنسيتي" /></span>
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
                                    src={fromFlag}
                                    alt=""
                                    fill
                                    sizes="24px"
                                    className="object-cover"
                                  />
                                </span>
                                <span className="text-base font-bold truncate text-foreground">{fromLabel}</span>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-muted-foreground"><LangText en="Select nationality" ar="اختر الجنسية" /></span>
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
                                    <span className="relative w-6 h-6 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                      <Image
                                        src={flagSrc(country.iso)}
                                        alt=""
                                        fill
                                        className="object-cover"
                                      />
                                    </span>
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
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1"><LangText en="2. My Destination" ar="٢. وجهتي" /></span>
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
                              <span className="text-sm font-medium text-muted-foreground"><LangText en="Pick a destination" ar="اختر الوجهة" /></span>
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
                      className="overflow-hidden border-t border-border pt-4 mt-2"
                    >
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center -space-x-2.5 flex-shrink-0 mt-1">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-xs border border-background z-10 bg-secondary/50">
                              <Image
                                src={fromFlag}
                                alt={fromLabel}
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
                              <LangText
                                en={`Schengen visa required for ${fromLabel} citizens visiting ${toCountry}`}
                                ar={`تأشيرة شنغن مطلوبة لمواطني ${fromLabel} عند زيارة ${toCountry}`}
                              />
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                              <LangText
                                en="Let's prepare your full visa dossier. We verify everything (cover letter, bookings, and itinerary) for a successful embassy submission."
                                ar="لنجهّز ملف التأشيرة كاملًا. نراجع كل شيء (خطاب التغطية والحجوزات وخط السير) لتقديم ناجح للسفارة."
                              />
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-row md:flex-col gap-3 md:gap-1.5 w-full md:w-auto text-xs font-semibold text-muted-foreground/90 flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                          <div className="flex items-center gap-1.5 bg-background px-2.5 py-1.5 rounded-lg border shadow-xs">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <ReadyLine />
                          </div>
                          <div className="flex items-center gap-1.5 bg-background px-2.5 py-1.5 rounded-lg border shadow-xs">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span>{getApprovalRate(fromCountry, toCountry)} <LangText en="Approval" ar="نسبة القبول" /></span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Reassurance row under form */}
            <motion.div variants={itemVariants} className="mt-6 w-full max-w-3xl flex flex-wrap justify-center gap-2 sm:gap-4 lg:gap-6 font-medium text-[#0A0F1F] mx-auto">
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 bg-[#F7F8FA] border border-[#E3E7EF] shadow-xs rounded-xl p-2 px-3 sm:px-4">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-[#0436DC] flex-shrink-0" />
                <span className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left"><LangText en="Money-back guarantee" ar="ضمان استرداد المبلغ" /></span>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 bg-[#F7F8FA] border border-[#E3E7EF] shadow-xs rounded-xl p-2 px-3 sm:px-4">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-[#0436DC] flex-shrink-0" />
                <ReadyLine className="text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left" />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-1 sm:gap-2 bg-[#F7F8FA] border border-[#E3E7EF] shadow-xs rounded-xl p-2 px-3 sm:px-4">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-[#0436DC] flex-shrink-0" />
                <span className="font-bold text-[#0A0F1F] text-[10px] sm:text-xs lg:text-sm leading-tight text-center sm:text-left"><LangText en="All-Inclusive File" ar="ملف شامل" /></span>
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
