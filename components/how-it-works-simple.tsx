"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ClipboardList, CreditCard, FileCheck, PlaneTakeoff } from "lucide-react"

const steps = [
  {
    number: "1",
    icon: ClipboardList,
    title: "Tell us your plans",
    description: "Share your travel dates, destination, and basic info. Takes about 5 minutes.",
  },
  {
    number: "2",
    icon: CreditCard,
    title: "Pay securely",
    description: "Complete your application with secure payment processing. Transparent flat-fee pricing.",
  },
  {
    number: "3",
    icon: FileCheck,
    title: "We prepare your file",
    description: "Our experts prepare every document — itinerary, cover letter, reservations.",
  },
  {
    number: "4",
    icon: PlaneTakeoff,
    title: "Submit & travel",
    description: "Download your file, attend your appointment, and await your visa decision.",
  },
]

export function HowItWorksSimple() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 bg-secondary/15 overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold tracking-widest uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Application Process
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
              Four simple steps to your <span className="text-primary font-bold">complete visa file.</span>
            </h2>
          </div>
          <Button asChild variant="outline" className="hidden md:inline-flex rounded-md font-semibold border-border text-foreground hover:bg-slate-100 transition-all duration-300">
            <Link href="/how-it-works" className="flex items-center gap-2">
              See full process <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Step grid with relative connectors */}
        <div className="relative">
          {/* Connecting line on desktop */}
          <div 
            className="absolute top-[3.5rem] left-[8%] right-[8%] h-[1px] hidden lg:block pointer-events-none z-0 border-t border-dashed border-primary/30"
          />

          {/* Connecting line on mobile */}
          <div 
            className="absolute top-[4rem] bottom-[4rem] left-[2.2rem] w-[1px] block lg:hidden pointer-events-none z-0 border-l border-dashed border-primary/30"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="group relative bg-white dark:bg-slate-900 border border-border/80 rounded-md p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 flex flex-col items-start text-left"
                >
                  {/* Step Marker & Icon container */}
                  <div className="flex flex-col items-start mb-6 relative w-full">
                    <div className="flex items-center justify-between w-full">
                      {/* Icon Container */}
                      <div className="h-12 w-12 rounded-sm bg-slate-50 dark:bg-slate-950 border border-border text-primary flex items-center justify-center shadow-sm transition-all duration-300 group-hover:border-primary/30">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      
                      {/* Step Number */}
                      <span className="text-3xl font-black text-border/40 group-hover:text-primary/20 transition-colors pointer-events-none select-none">
                        0{step.number}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold mb-2.5 leading-tight tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="text-center mt-10 md:hidden">
          <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl font-semibold border-primary/20 text-primary hover:bg-primary/5 hover:text-primary">
            <Link href="/how-it-works" className="flex items-center gap-2 justify-center">
              See full process <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
