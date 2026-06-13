"use client"

import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

export function ContactSection() {
  const benefits = [
    "Quick document verification",
    "Expert guidance included",
    "98% approval rate",
    "Money-back guarantee",
  ]

  return (
    <section id="contact" className="relative py-24 md:py-32 overflow-hidden bg-background">
      <div className="container mx-auto px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-indigo-950 text-white shadow-2xl shadow-primary/10 border border-primary/20"
        >
          {/* Subtle grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Background image tint */}
          <div className="absolute inset-0">
            <Image
              src="/images/6802.jpg"
              alt="Happy traveler in Europe"
              fill
              className="object-cover opacity-[0.12] mix-blend-overlay"
              priority
              unoptimized
            />
          </div>

          {/* Decorative glowing orb */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-sky-500/25 blur-[120px] pointer-events-none" />

          <div className="relative grid lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-16 p-8 md:p-14 lg:p-16 z-10">
            
            {/* Left - Text Headline & Actions */}
            <div className="flex flex-col justify-center text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider mb-6 self-start">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" />
                Ready when you are
              </div>
              
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.15] tracking-tight text-white mb-6 text-balance"
              >
                Start your Schengen <br className="hidden sm:inline" />
                visa application today.
              </motion.h2>

              <p className="text-base md:text-lg text-white/80 max-w-md leading-relaxed mb-10">
                Join thousands of travelers who trusted us with their Schengen visa applications.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-7 bg-white text-primary hover:bg-white/95 rounded-xl font-semibold shadow-lg shadow-black/10 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <Link href="/apply" className="flex items-center">
                    Start application
                    <ArrowRight className="ml-2 h-4 w-4 text-primary" strokeWidth={2.5} />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <Link href="https://wa.me/971585864446" target="_blank" rel="noopener noreferrer" className="flex items-center">
                    Chat on WhatsApp
                    <svg className="ml-2 h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right - Glass Benefits Box */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:self-center w-full"
            >
              <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-8 text-left">
                <div className="text-xs font-semibold tracking-widest text-sky-300 mb-6">What you get</div>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.08 }}
                      className="flex gap-3.5 items-center"
                    >
                      <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5 text-sky-300" strokeWidth={3} />
                      </div>
                      <span className="text-sm md:text-base text-white font-medium leading-none">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs tracking-wider uppercase text-white/55 block">Starting at</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-white">249</span>
                      <span className="text-xs font-semibold text-white/70">AED</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/60 block">100% Secure</span>
                    <span className="text-xs text-white/60 block">Checkout</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
