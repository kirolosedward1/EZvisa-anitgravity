"use client"

import { useState, useEffect } from "react"
import { Search, Rocket } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CountryCard } from "@/components/country-card"
import { COUNTRY_DATA } from "@/lib/countries"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  const filteredCountries = COUNTRY_DATA.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-gray-50">
        <InnerHero
          badge="Documents"
          title={
            <>
              Schengen Visa <span className="text-blue-300">Document Requirements</span>
            </>
          }
          description="Find complete document requirements for your destination country. We help you prepare everything you need for a successful application."
          randomizeBackground={true}
        >
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search for a country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-13 text-base bg-white/10 dark:bg-black/30 text-white placeholder:text-white/60 border-white/20 hover:border-white/30 focus:border-white/50 focus:ring-0 rounded-2xl shadow-inner backdrop-blur-md"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70 pointer-events-none z-10" />
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
                <p className="text-lg text-muted-foreground">No countries found matching your search.</p>
              </div>
            )}
          </div>
        </section>

        {/* Additional Info / CTA */}
        <section className="py-16 md:py-20 bg-background overflow-hidden relative">
          {/* Subtle background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="relative w-full rounded-[2rem] md:rounded-[2.5rem] border border-border/60 shadow-2xl p-8 md:p-12 overflow-hidden flex flex-col items-center text-center min-h-[320px] justify-center bg-slate-900">
              
              {/* Background Image of scenic country */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <Image
                  src="/images/countries/italy.jpg"
                  alt="Scenic Italy"
                  fill
                  className="object-cover opacity-85 contrast-[1.05]"
                  sizes="(max-w-6xl) 100vw, 1152px"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />
              </div>

              {/* Dot grid decoration */}
              <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none z-10 hidden md:block"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                  maskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 100%)",
                }}
              />
              
              <div className="relative z-20 max-w-2xl mx-auto flex flex-col items-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
                  Need Help With Your Application?
                </h2>
                <p className="text-white/85 text-base md:text-lg mb-8 leading-relaxed max-w-xl font-medium">
                  Our experts will review your documents and ensure everything is perfect before submission.
                </p>
                <Link href="/apply">
                  <button className="px-8 py-3.5 bg-white text-primary hover:bg-slate-50 transition-all duration-300 font-bold inline-flex items-center gap-2.5 shadow-xl hover:-translate-y-0.5 cursor-pointer rounded-xl">
                    <Rocket className="h-5 w-5 text-primary" />
                    Start Your Application
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
