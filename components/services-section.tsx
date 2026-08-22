"use client"

import { FileText, Plane, Hotel, Map, Mail, X, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

const services = [
  {
    icon: FileText,
    title: "Application forms",
    description: "Error-free visa application forms filled accurately to match official embassy and consulate guidelines.",
    image: "/images/visa-20application-20forms-20.jpg",
  },
  {
    icon: Plane,
    title: "Flight reservations",
    description: "Verifiable flight reservations to satisfy embassy travel itinerary requirements without buying full tickets beforehand.",
    image: "/images/dummy-20flight-20bookings-20.webp",
  },
  {
    icon: Hotel,
    title: "Hotel reservations",
    description: "Confirmed hotel reservations covering your entire stay, matched directly to your daily travel itinerary.",
    image: "/images/hotel-20reservations-20.jpg",
  },
  {
    icon: Map,
    title: "Travel itinerary",
    description: "Custom day-by-day travel plan detailing your destination entry points, hotel stays, and planned activities.",
    image: "/images/travel-itinerary-new.jpg",
  },
  {
    icon: Mail,
    title: "Cover letter",
    description: "Expertly drafted cover letter detailing your travel purpose, financial backing, and strong ties to your home country.",
    image: "/images/cover-20letter.png",
  },
]

export function ServicesSection() {
  const [selectedService, setSelectedService] = useState<number | null>(null)

  return (
    <section id="services" className="relative py-20 sm:py-28 bg-background/50 overflow-hidden">
      {/* Background radial grid */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none hidden md:block"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 70%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 70%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 md:px-12 relative z-10 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            What's included
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-foreground text-balance">
            Everything you need for a <br className="hidden sm:block" />
            <span className="text-primary">successful visa application.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            One flat fee. Five core documents prepared by seasoned travel visa experts. <span className="font-semibold text-foreground">Click any box below</span> to view full document details.
          </p>
        </div>

        {/* Surround Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
          
          {/* Left Side: 2 Document Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {[0, 1].map((index) => {
              const service = services[index]
              const Icon = service.icon
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.025, transition: { duration: 0.2 } }}
                  onClick={() => setSelectedService(index)}
                  className="group w-full text-left p-5 sm:p-6 rounded-3xl border border-border/80 bg-card hover:bg-primary/[0.02] hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/10 cursor-pointer flex items-center gap-4.5"
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-xs">
                    <Icon className="h-5.5 w-5.5" strokeWidth={2} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                </motion.button>
              )
            })}
          </div>

          {/* Center Hub: Lady Image with Pulse Aura */}
          <div className="lg:col-span-4 flex justify-center items-center relative py-4 lg:py-0">
            {/* Background Glow Ring */}
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-sky-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-primary/15 animate-[spin_60s_linear_infinite] pointer-events-none" />
            <div className="absolute w-80 h-80 sm:w-[22rem] sm:h-[22rem] rounded-full border border-dashed border-primary/20 pointer-events-none" />

            {/* Center Image Container */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[1.1] md:aspect-[1.2] lg:aspect-[0.88] max-w-[380px] lg:max-w-[360px] flex items-center justify-center">
              <Image
                src="/images/woman-travel.png"
                alt="EZvisa Travel Consultant"
                fill
                className="object-contain z-10 select-none filter drop-shadow-[0_20px_40px_rgba(59,130,246,0.2)]"
                sizes="(max-width: 640px) 100vw, 380px"
              />
            </div>
          </div>

          {/* Right Side: 2 Document Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {[2, 3].map((index) => {
              const service = services[index]
              const Icon = service.icon
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (index - 2) * 0.1 }}
                  whileHover={{ scale: 1.025, transition: { duration: 0.2 } }}
                  onClick={() => setSelectedService(index)}
                  className="group w-full text-left p-5 sm:p-6 rounded-3xl border border-border/80 bg-card hover:bg-primary/[0.02] hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/10 cursor-pointer flex items-center gap-4.5"
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-xs">
                    <Icon className="h-5.5 w-5.5" strokeWidth={2} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                </motion.button>
              )
            })}
          </div>

        </div>

        {/* Bottom Centered Card: Cover Letter */}
        <div className="mt-5 max-w-xl mx-auto">
          {(() => {
            const index = 4
            const service = services[index]
            const Icon = service.icon
            return (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                onClick={() => setSelectedService(index)}
                className="group w-full text-left p-5 sm:p-6 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/[0.03] via-card to-primary/[0.03] hover:border-primary/60 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/10 cursor-pointer flex items-center justify-center gap-4.5"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <Icon className="h-5.5 w-5.5" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    <Sparkles className="h-3 w-3" /> Embassy Compliant
                  </span>
                </div>
              </motion.button>
            )
          })()}
        </div>

      </div>

      {/* Pop-up Modal Box */}
      <AnimatePresence>
        {selectedService !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedService(null)}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring" as const, damping: 26, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-3xl max-w-3xl w-full shadow-2xl relative overflow-hidden border border-border flex flex-col md:flex-row max-h-[90vh] overflow-y-auto"
            >
              {/* Image Sample Panel */}
              <div className="relative md:w-2/5 aspect-[16/11] md:aspect-auto min-h-[220px] bg-muted border-b md:border-b-0 md:border-r border-border/50">
                <Image
                  src={services[selectedService].image || "/placeholder.svg"}
                  alt={services[selectedService].title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                />
              </div>

              {/* Text Details Panel */}
              <div className="flex-1 p-6 sm:p-8 md:p-10 relative flex flex-col justify-between">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedService(null)}
                  className="absolute top-4 right-4 h-9 w-9 rounded-full bg-secondary border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center z-10 cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="h-4 w-4" />
                </button>

                <div>
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {(() => {
                      const SelectedIcon = services[selectedService].icon
                      return <SelectedIcon className="h-5 w-5" strokeWidth={2} />
                    })()}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight text-foreground">
                    {services[selectedService].title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {services[selectedService].description}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-border flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground font-medium">Included in Application Package</span>
                  <Link
                    href="/apply"
                    onClick={() => setSelectedService(null)}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all shadow-md hover:shadow-xl hover:shadow-primary/20"
                  >
                    Start Application
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
