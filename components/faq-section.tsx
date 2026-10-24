"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { DigitRanges } from "@/components/digit-ranges"
import { FAQ_AR, FAQ_EN } from "@/lib/faq"
import { Msg } from "@/components/msg"
import { Image } from "@/components/image"
import { useSiteLocale } from "@/components/locale-provider"

const FAQ_VIDEO = "https://videos.pexels.com/video-files/27497252/12153786_1440_2560_30fps.mp4"

/**
 * The Eiffel Tower clip beside the FAQ. A remote autoplay <video> in the server HTML crashed WebKit while it parsed
 * the home document, so the page ships a still and the <video> element is only created after hydration, once the
 * column is near the viewport. Reduced-motion visitors keep the still.
 */
function FaqVideo({ alt }: { alt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [play, setPlay] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0">
      <Image src="/images/eiffel-tower-view.jpg" alt={alt} fill sizes="384px" className="object-cover" />
      {play && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          src={FAQ_VIDEO}
        />
      )}
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const arabic = useSiteLocale() === "ar"
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
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 md:mb-4 leading-tight tracking-tight">
            <Msg id="faq.heading" />
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            <Msg id="faq.intro" />
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
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed"><DigitRanges text={faq.answer} /></p>
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
                <FaqVideo alt={arabic ? "برج إيفل في باريس" : "The Eiffel Tower in Paris"} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
