"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const steps = [
  {
    number: "1",
    title: "Tell us your plans",
    description: "Share your travel dates, destination, and basic info. Takes about 5 minutes.",
  },
  {
    number: "2",
    title: "Pay securely",
    description: "Complete your application with secure payment processing. Money-back guarantee.",
  },
  {
    number: "3",
    title: "We prepare your file",
    description: "Our experts prepare every document — itinerary, cover letter, reservations.",
  },
  {
    number: "4",
    title: "Submit & travel",
    description: "Download your file, walk into your appointment, and get approved.",
  },
]

export function HowItWorksSimple() {
  return (
    <section id="how-it-works" className="bg-background py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="flex flex-col items-start gap-5 lg:sticky lg:top-32 lg:self-start">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">How it works</span>
          <h2 className="text-balance text-foreground">Four simple steps to your approved visa.</h2>
          <Link
            href="/how-it-works"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            See full process
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>

        <ol className="flex flex-col border-t border-border">
          {steps.map((step, index) => (
            <motion.li
              key={step.number}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 border-b border-border py-7 sm:gap-8 sm:py-8"
            >
              <span className="flex size-10 items-center justify-center rounded-full border border-border text-sm font-semibold tabular-nums text-foreground">
                {step.number}
              </span>
              <div className="flex flex-col gap-2 pt-1.5">
                <h3 className="text-foreground">{step.title}</h3>
                <p className="max-w-lg text-base leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
