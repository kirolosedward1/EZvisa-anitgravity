"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { DigitRanges } from "@/components/digit-ranges"
import { FAQ_AR, FAQ_EN } from "@/lib/faq"
import { Msg } from "@/components/msg"
import { Globi } from "@/components/globi/globi"
import { useSiteLocale } from "@/components/locale-provider"

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()
  const arabic = useSiteLocale() === "ar"
  const faqs = arabic ? FAQ_AR : FAQ_EN

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div data-site-reveal="rise"
          className="text-center mb-10 md:mb-12 lg:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 md:mb-4 leading-tight tracking-tight">
            <Msg id="faq.heading" />
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            <Msg id="faq.intro" />
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16">
          {/* Left Column - FAQ Questions (takes 7 columns on desktop) */}
          <div className="lg:col-span-7 space-y-2 order-2 lg:order-1">
            {faqs.map((faq, index) => (
              <div
                key={index}
                data-site-reveal="fade"
                className="border-b border-border/40"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                  className="w-full py-4 md:py-5 text-start flex items-start justify-between gap-3 md:gap-4 hover:text-primary transition-colors group min-h-[56px]"
                >
                  <span className="font-medium text-sm md:text-base lg:text-lg leading-relaxed pe-2 md:pe-4 text-start">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 md:w-5 md:h-5 text-[#5B6475] transition-transform flex-shrink-0 mt-0.5 md:mt-1 group-hover:text-primary ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                      id={`faq-answer-${index}`}
                    >
                      <div className="pb-4 md:pb-6 pe-8 md:pe-12 text-start">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed"><DigitRanges text={faq.answer} /></p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div data-site-reveal="fade" className="ez-faq-globi order-1 lg:order-2 lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Globi pose="documents" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
