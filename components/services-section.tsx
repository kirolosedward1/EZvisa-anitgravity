"use client"

import { FileText, Plane, Hotel, Map, Mail, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

const services = [
  {
    icon: FileText,
    title: "Application forms",
    description:
      "Error-free visa application forms filled accurately to match embassy guidelines.",
    image: "/images/visa-20application-20forms-20.jpg",
  },
  {
    icon: Plane,
    title: "Flight reservations",
    description:
      "Verifiable flight bookings to satisfy embassy travel path requirements.",
    image: "/images/dummy-20flight-20bookings-20.webp",
  },
  {
    icon: Hotel,
    title: "Hotel reservations",
    description:
      "Confirmed hotel bookings for your entire stay matching your itinerary.",
    image: "/images/hotel-20reservations-20.jpg",
  },
  {
    icon: Map,
    title: "Travel itinerary",
    description:
      "Day-by-day travel plan detailing your destinations and activities.",
    image: "/images/travel-itinerary-new.jpg",
  },
  {
    icon: Mail,
    title: "Cover letter",
    description:
      "Expertly drafted cover letter detailing your trip purpose and ties to home.",
    image: "/images/cover-20letter.png",
  },
]

export function ServicesSection() {
  const [selectedService, setSelectedService] = useState<number | null>(null)

  return (
    <section id="services" className="relative py-24 md:py-32 bg-background/50 overflow-hidden">
      {/* Decorative background grid */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 70%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 70%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column - Content & Cards */}
          <div className="lg:col-span-7 space-y-10 text-left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                What's included
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
                Everything you need for a <br />
                <span className="text-primary">successful visa application.</span>
              </h2>
              <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
                One flat fee. Five core documents prepared by seasoned travel visa experts who know exactly what consulate officers and embassies look for.
              </p>
            </div>

            {/* Premium service horizontal list */}
            <div className="space-y-4">
              {services.map((service, index) => {
                const Icon = service.icon
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
                    whileHover={{ x: 6, transition: { duration: 0.2, ease: "easeOut" } }}
                    onClick={() => setSelectedService(index)}
                    className="group w-full text-left p-5 sm:p-6 rounded-2xl border border-border/80 bg-card hover:bg-primary/[0.01] hover:border-primary/30 flex items-start gap-5 transition-all duration-300 hover:shadow-md cursor-pointer"
                  >
                    <div className="h-11 w-11 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-sm">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300 mb-1">
                        {service.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Right Column - Premium Travel Image */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            {/* Visual background glows */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 rounded-[3rem] blur-2xl pointer-events-none" />
            
            {/* Soft decorative background circles */}
            <div className="absolute w-72 h-72 rounded-full border border-blue-500/5 animate-[spin_40s_linear_infinite] pointer-events-none" />
            <div className="absolute w-[22rem] h-[22rem] rounded-full border border-dashed border-primary/10 animate-[spin_80s_linear_infinite] pointer-events-none" />

            <div className="relative w-full aspect-[4/3] sm:aspect-[1.1] md:aspect-[1.2] lg:aspect-[0.9] max-w-[460px] flex items-center justify-center">
              {/* Backing Card frame */}
              <div className="absolute inset-4 rounded-3xl bg-gradient-to-tr from-blue-600/10 to-indigo-600/5 -rotate-2 border border-blue-500/10 shadow-sm" />
              
              <Image
                src="/images/woman-travel.png"
                alt="EZvisa Travel Consultant"
                fill
                className="object-contain z-10 hover:scale-[1.02] transition-transform duration-500 select-none"
                sizes="(max-w-lg) 100vw, 460px"
                priority
                unoptimized
              />
            </div>
          </div>

        </div>
      </div>

      {/* Modern Dialog Pop-up */}
      <AnimatePresence>
        {selectedService !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedService(null)}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring" as const, damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-3xl max-w-3xl w-full shadow-2xl relative overflow-hidden border border-border flex flex-col md:flex-row"
            >
              {/* Image panel */}
              <div className="relative md:w-2/5 aspect-[16/11] md:aspect-auto min-h-[220px] bg-muted border-b md:border-b-0 md:border-r border-border/50">
                <Image
                  src={services[selectedService].image || "/placeholder.svg"}
                  alt={services[selectedService].title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Text panel */}
              <div className="flex-1 p-8 md:p-10 relative flex flex-col justify-between">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedService(null)}
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center z-10 cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mt-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    {(() => {
                      const SelectedIcon = services[selectedService].icon
                      return <SelectedIcon className="h-5 w-5" strokeWidth={2} />
                    })()}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight leading-none text-primary">
                    {services[selectedService].title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {services[selectedService].description}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Expertly drafted by EZvisa</span>
                  <Link
                    href="/apply"
                    onClick={() => setSelectedService(null)}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all hover:shadow-lg hover:shadow-primary/15"
                  >
                    Start Now
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
