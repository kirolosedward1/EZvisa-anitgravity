"use client"

import { Star, X } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef, useCallback } from "react"

const testimonials = [
  {
    name: "Ahmed Al-Rashid",
    destination: "France",
    initials: "AR",
    text: "EZvisa made my French visa application incredibly smooth. Got approved in just 2 weeks!",
    visaImage: "/images/eu-visa-france.webp",
    fullStory:
      "I was nervous about applying for my first Schengen visa, but EZvisa guided me through every step. Their document analysis caught a small error in my bank statement that could have caused a rejection. The custom cover letter highlighted my travel history perfectly. Within 2 weeks, I had my visa approved and was on my way to Paris!",
  },
  {
    name: "Priya Sharma",
    destination: "Germany",
    initials: "PS",
    text: "The flight booking saved me money and the team's guidance was invaluable.",
    visaImage: "/images/eu-visa-france.webp",
    fullStory:
      "As a first-time traveler to Europe, I didn't want to purchase expensive flight tickets before getting my visa. EZvisa's reservation service was perfect — completely legitimate and a fraction of a real ticket. Their step-by-step guidance made the entire process stress-free, and I got my German visa approved in 10 days!",
  },
  {
    name: "Mohammed Hassan",
    destination: "Italy",
    initials: "MH",
    text: "Excellent service. Professional and delivered everything on time.",
    visaImage: "/images/eu-visa-france.webp",
    fullStory:
      "I needed to travel to Italy for a business conference and was on a tight deadline. EZvisa delivered all my documents within 48 hours, including a perfectly tailored itinerary and hotel bookings. Their professionalism and attention to detail gave me confidence throughout the process. My visa was approved without any issues.",
  },
  {
    name: "Sarah Mitchell",
    destination: "Spain",
    initials: "SM",
    text: "They spotted issues in my previous applications I didn't even know existed. Approved in 3 weeks!",
    visaImage: "/images/eu-visa-france.webp",
    fullStory:
      "I had tried applying for a Schengen visa twice before and got rejected both times. EZvisa identified the exact problems with my previous applications — inconsistent travel dates and insufficient proof of accommodation. They helped me prepare a rock-solid application with a perfect itinerary. This time, my Spanish visa was approved without any questions!",
  },
  {
    name: "Rajesh Kumar",
    destination: "Netherlands",
    initials: "RK",
    text: "Fast, reliable, and incredibly helpful. The custom cover letter made all the difference.",
    visaImage: "/images/eu-visa-france.webp",
    fullStory:
      "After hearing horror stories about visa rejections, I was worried about my Netherlands application. EZvisa not only provided all the required documents but also wrote a personalized cover letter that perfectly explained my travel purpose and ties to my home country. The attention to detail was remarkable, and my visa was approved in just 12 days!",
  },
]

export function TestimonialsSection() {
  const [selectedTestimonial, setSelectedTestimonial] = useState<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const syncMobileScroll = useCallback((index: number) => {
    if (!isMobile || !scrollRef.current) return
    const container = scrollRef.current
    const cardWidth = container.offsetWidth
    container.scrollTo({ left: index * cardWidth, behavior: "smooth" })
  }, [isMobile])

  useEffect(() => {
    if (isMobile || isPaused) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
      return
    }
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = testimonials.length - 2
        return prev >= maxIndex ? 0 : prev + 1
      })
    }, 5000)
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isPaused, isMobile])

  useEffect(() => {
    if (!isMobile || !scrollRef.current) return
    const container = scrollRef.current
    const handleScroll = () => {
      const cardWidth = container.offsetWidth
      const newIndex = Math.round(container.scrollLeft / cardWidth)
      setCurrentIndex(newIndex)
    }
    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [isMobile])

  return (
    <section id="testimonials" className="relative py-24 md:py-32 bg-background overflow-hidden">
      {/* Decorative dot matrix background */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 60%, transparent 100%)",
        }}
      />

      <div className="relative container mx-auto px-6 max-w-6xl z-10">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Reviews
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
              Loved by <span className="text-primary font-semibold">5,000+ happy travelers.</span>
            </h2>
          </div>
          <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-secondary/15 border border-border/40 self-start md:self-auto">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4.5 w-4.5 fill-accent text-accent" />
              ))}
            </div>
            <div className="h-4 w-[1px] bg-border/80" />
            <span className="text-sm font-semibold text-foreground">4.9/5 · 5,000+ reviews</span>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          {/* Mobile native scroll */}
          <div
            ref={scrollRef}
            className="flex md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-6 gap-5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
          >
            {testimonials.map((testimonial, index) => (
              <button
                key={index}
                onClick={() => setSelectedTestimonial(index)}
                className="flex-shrink-0 w-[85vw] snap-center text-left focus:outline-none"
              >
                <TestimonialCard testimonial={testimonial} />
              </button>
            ))}
          </div>

          {/* Desktop carousel */}
          <div className="hidden md:block overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${currentIndex * 50}%` }}
              transition={{ type: "spring" as const, stiffness: 120, damping: 22 }}
            >
              {testimonials.map((testimonial, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTestimonial(index)}
                  className="flex-shrink-0 w-1/2 px-3 text-left focus:outline-none"
                >
                  <TestimonialCard testimonial={testimonial} />
                </button>
              ))}
            </motion.div>
          </div>

          {/* Premium pagination indicators */}
          <div className="flex justify-center gap-2.5 mt-12">
            {Array.from({ length: isMobile ? testimonials.length : testimonials.length - 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  if (isMobile) syncMobileScroll(index)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-8 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/40"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedTestimonial !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTestimonial(null)}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring" as const, damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row border border-border"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedTestimonial(null)}
                className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                aria-label="Close review details"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Layout Container */}
              <div className="flex flex-col md:flex-row w-full">
                {/* Visa Image Section */}
                <div className="relative md:w-2/5 aspect-[16/11] md:aspect-auto min-h-[220px] bg-muted border-b md:border-b-0 md:border-r border-border/50">
                  <Image
                    src={testimonials[selectedTestimonial].visaImage || "/placeholder.svg"}
                    alt={`${testimonials[selectedTestimonial].destination} visa approval`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Testimonial Text Section */}
                <div className="flex-1 p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-base md:text-lg leading-relaxed font-medium text-foreground italic mb-6">
                      "{testimonials[selectedTestimonial].fullStory}"
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-6 border-t border-border/60">
                    <div className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm shadow-md shadow-primary/10">
                      {testimonials[selectedTestimonial].initials}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{testimonials[selectedTestimonial].name}</div>
                      <div className="text-xs text-primary font-semibold">{testimonials[selectedTestimonial].destination} visa approved</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[number] }) {
  return (
    <div className="group relative h-full bg-card border border-border/80 rounded-2xl p-6 md:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between items-start text-left cursor-pointer">
      {/* Decorative quotation background element */}
      <span className="absolute right-6 top-4 text-7xl font-serif text-muted-foreground/10 select-none pointer-events-none">&ldquo;</span>

      <div>
        <div className="flex gap-0.5 mb-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-accent text-accent" />
          ))}
        </div>
        <p className="text-base font-semibold leading-relaxed text-foreground mb-6 line-clamp-4">
          "{testimonial.text}"
        </p>
      </div>

      <div className="flex items-center gap-3.5 pt-5 border-t border-border/40 w-full">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          {testimonial.initials}
        </div>
        <div>
          <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors duration-300">
            {testimonial.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {testimonial.destination} visa approved
          </div>
        </div>
      </div>
    </div>
  )
}
