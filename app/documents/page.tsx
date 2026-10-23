"use client"

import { useState, useEffect } from "react"
import { Search, Rocket } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CountryCard } from "@/components/country-card"
import { COUNTRY_DATA, SCHENGEN_META } from "@/lib/countries"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { useMessage } from "@/components/use-message"
import { countryNameAr } from "@/components/country-name"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { PhotoHeroOverlay } from "@/components/photo-hero-overlay"
import { LangText } from "@/components/lang-text"

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const searchPlaceholder = useMessage("documents.search")
  const scenicAlt = useMessage("documents.scenicAlt")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  const query = searchQuery.trim().toLowerCase()
  const filteredCountries = COUNTRY_DATA.filter((country) => {
    if (!query) return true
    const arabicName = (SCHENGEN_META[country.name]?.ar ?? countryNameAr(country.name)).toLowerCase()
    return country.name.toLowerCase().includes(query) || arabicName.includes(query)
  })

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen">
        <InnerHero
          badge={<LangText en="Documents" ar="المستندات" />}
          title={
            <LangText
              en={<>Schengen Visa Document <span className="text-[#0436DC]">Requirements</span></>}
              ar={<>متطلبات مستندات <span className="text-[#0436DC]">تأشيرة شنغن</span></>}
            />
          }
          description={<Msg id="documents.description" />}
          randomizeBackground={true}
        >
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-13 text-base bg-white text-[#0A0F1F] placeholder:text-[#5B6475] border border-[#E3E7EF] rounded-2xl shadow-[0_8px_24px_rgba(10,15,31,0.08)]"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5B6475] pointer-events-none z-10" />
          </div>
        </InnerHero>

        {/* Countries Grid */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            {filteredCountries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {filteredCountries.map((country, index) => (
                  <CountryCard key={country.name} country={country} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground"><Msg id="documents.empty" /></p>
              </div>
            )}
          </div>
        </section>

        {/* Additional Info / CTA */}
        <section className="py-16 md:py-20 bg-background overflow-hidden relative">
          {/* Subtle background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="photo-hero relative w-full rounded-[2rem] md:rounded-[2.5rem] border border-border/60 shadow-2xl p-8 md:p-12 overflow-hidden flex flex-col items-center text-center min-h-[320px] justify-center bg-slate-900">
              
              {/* Background Image of scenic country */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <Image
                  src="/images/countries/italy.jpg"
                  alt={scenicAlt}
                  fill
                  className="object-cover opacity-85 contrast-[1.05]"
                  sizes="(max-width: 1200px) 100vw, 1152px"
                  priority
                />
                <PhotoHeroOverlay />
              </div>

              {/* Dot grid decoration */}
              <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none z-10 hidden md:block"
                style={{
                  backgroundImage: "none",
                  backgroundSize: "24px 24px",
                  maskImage: "none",
                  WebkitMaskImage: "none",
                }}
              />
              
              <div className="relative z-20 max-w-2xl mx-auto flex flex-col items-center">
                <h2 className="hero-copy mb-4 text-balance text-white">
                  <LangText en="Need Help With Your Application?" ar="هل تحتاج مساعدة في طلبك؟" />
                </h2>
                <p className="text-white/85 text-base md:text-lg mb-8 leading-relaxed max-w-xl font-medium">
                  <Msg id="documents.helpBody" />
                </p>
                <LocaleLink href="/apply">
                  <button className="px-8 py-3.5 bg-white text-primary hover:bg-slate-50 transition-all duration-300 font-semibold inline-flex items-center gap-2.5 shadow-xl hover:-translate-y-0.5 cursor-pointer rounded-xl">
                    <Rocket className="h-5 w-5 text-primary" />
                    <Msg id="documents.start" />
                  </button>
                </LocaleLink>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
