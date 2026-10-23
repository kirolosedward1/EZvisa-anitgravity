"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { FAQ_AR, FAQ_EN } from "@/lib/faq"
import { useArabic } from "@/components/ready-line"

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const arabic = useArabic()
  const faqs = arabic ? FAQ_AR : FAQ_EN

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12 lg:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 md:mb-4 leading-tight tracking-tight">Frequently asked questions</h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about our visa application service.
          </p>
        </motion.div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16">
          {/* Left Column - FAQ Questions (takes 7 columns on desktop) */}
          <div className="lg:col-span-7 space-y-2">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="border-b border-border/40"
              >
                <button
                  onClick={() => toggleFAQ(index)}
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
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pb-4 md:pb-6 pe-8 md:pe-12 text-start">
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Right Column - Video (takes 5 columns on desktop) */}
          <div className="hidden lg:block lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:sticky lg:top-24"
            >
              <div className="relative aspect-[3/4] w-full max-w-sm mx-auto overflow-hidden rounded-2xl shadow-xl ring-1 ring-border/50">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  src="https://videos.pexels.com/video-files/27497252/12153786_1440_2560_30fps.mp4"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
