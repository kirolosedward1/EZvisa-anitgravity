"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, ClipboardList, CreditCard, FileCheck, PlaneTakeoff } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import type { MessageKey } from "@/messages"

const steps: { icon: typeof ClipboardList; title: MessageKey; description: MessageKey }[] = [
  {
    icon: ClipboardList,
    title: "how.step1Title",
    description: "how.step1Body",
  },
  {
    icon: CreditCard,
    title: "how.step2Title",
    description: "how.step2Body",
  },
  {
    icon: FileCheck,
    title: "how.step3Title",
    description: "how.step3Body",
  },
  {
    icon: PlaneTakeoff,
    title: "how.step4Title",
    description: "how.step4Body",
  },
]

export function HowItWorksSimple() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 bg-secondary/15 overflow-hidden">
      {/* Subtle backdrop circle blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full pointer-events-none hidden md:block" />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <Msg id="how.eyebrow" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
              <Msg id="how.headingLead" /> <span className="text-primary"><Msg id="how.headingAccent" /></span>
            </h2>
          </div>
          <Button asChild variant="outline" className="hidden md:inline-flex rounded-xl font-semibold border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all duration-300">
            <LocaleLink href="/how-it-works" className="flex items-center gap-2">
              <Msg id="how.seeFull" /> <ArrowRight className="h-4 w-4" />
            </LocaleLink>
          </Button>
        </div>

        {/* Step grid with relative connectors */}
        <div className="relative">
          {/* Connecting line on desktop */}
          <div className="absolute top-[3.5rem] left-[8%] right-[8%] h-[2px] hidden lg:block pointer-events-none z-0 bg-[#E3E7EF]" />

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
                  className="group relative bg-card border border-border/80 rounded-2xl p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 flex flex-col items-start text-left"
                >
                  {/* Step Marker & Icon container */}
                  <div className="flex flex-col items-start mb-6 relative">
                    {/* Icon Circle */}
                    <div className="h-14 w-14 rounded-2xl bg-background border border-border/80 text-primary flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary/20 group-hover:shadow-md group-hover:shadow-primary/5">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold mb-2.5 leading-tight tracking-tight text-foreground">
                    <Msg id={step.title} />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <Msg id={step.description} />
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="text-center mt-10 md:hidden">
          <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl font-semibold border-primary/20 text-primary hover:bg-primary/5 hover:text-primary">
            <LocaleLink href="/how-it-works" className="flex items-center gap-2 justify-center">
              <Msg id="how.seeFull" /> <ArrowRight className="h-4 w-4" />
            </LocaleLink>
          </Button>
        </div>
      </div>
    </section>
  )
}
