"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const faqs = [
  {
    question: "How long does the visa application process take?",
    answer:
      "Typically, it takes 2-3 business days to prepare your complete application. The embassy processing time varies by country (usually 15-30 days), but we ensure your documents are submitted correctly the first time to avoid delays.",
  },
  {
    question: "What documents do I need to provide?",
    answer:
      "Basic requirements include a valid passport, recent photos, travel itinerary, proof of accommodation, and financial documents. We'll provide a personalized checklist based on your nationality and destination country.",
  },
  {
    question: "Do you help with finding visa appointment slots?",
    answer:
      "No, we do not assist with finding or booking visa appointment slots. However, we ensure all your documents are perfectly prepared so you're ready when you secure an appointment.",
  },
  {
    question: "What makes your service different from other agencies?",
    answer:
      "We use AI technology to analyze your documents and create fully customized applications. Unlike other agencies that use generic templates, every application we prepare is tailored specifically to your profile to maximize approval chances.",
  },
  {
    question: "What is included in the fee?",
    answer: `Our complete service includes AI-powered document analysis, personalized cover letter, customized travel itinerary, document review and formatting, application form assistance, and ongoing support until submission. No hidden fees.`,
  },
  {
    question: "What if my visa application is rejected?",
    answer:
      "While we can't guarantee approval (no agency can), we significantly improve your chances with our personalized approach. If rejected, we'll review the reasons and help you understand what can be improved for a reapplication.",
  },
  {
    question: "Can I get a refund if I change my mind?",
    answer:
      "Refunds are available before we begin processing your application. Once our team starts working on your documents, the service fee is non-refundable as work has commenced on your personalized application.",
  },
  {
    question: "Do you support all Schengen countries?",
    answer:
      "Yes, we support visa applications for all 29 Schengen countries including popular destinations like France, Germany, Italy, Spain, Netherlands, and more. Our AI system is trained on requirements for all Schengen nations.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
                  className="w-full py-4 md:py-5 text-left flex items-start justify-between gap-3 md:gap-4 hover:text-primary transition-colors group min-h-[56px]"
                >
                  <span className="font-medium text-sm md:text-base lg:text-lg leading-relaxed pr-2 md:pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 md:w-5 md:h-5 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 md:mt-1 group-hover:text-primary ${
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
                      <div className="pb-4 md:pb-6 pr-8 md:pr-12">
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
