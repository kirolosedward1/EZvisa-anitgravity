"use client"

import { useState, useEffect } from "react"
import { Check, X } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { ReadyLine } from "@/components/ready-line"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import type { MessageKey } from "@/messages"

export function ComparisonSection() {
  const [currentCurrency, setCurrentCurrency] = useState<{ code: string; symbol: string; rate: number }>({
    code: "AED",
    symbol: "AED",
    rate: 1,
  })

  useEffect(() => {
    const loadCurrency = () => {
      const savedCurrency = localStorage.getItem("selected-currency")
      if (savedCurrency === "USD") {
        setCurrentCurrency({ code: "USD", symbol: "$", rate: 0.27 })
      } else {
        setCurrentCurrency({ code: "AED", symbol: "AED", rate: 1 })
      }
    }

    loadCurrency()
    window.addEventListener("currency-changed", loadCurrency)
    return () => window.removeEventListener("currency-changed", loadCurrency)
  }, [])

  const getPrice = () => {
    const basePrice = 249
    if (currentCurrency.code === "USD") {
      return `$${Math.round(basePrice * currentCurrency.rate)}`
    }
    return `${basePrice} AED`
  }

  const getOtherPrice = () => {
    const basePrice = 1000
    if (currentCurrency.code === "USD") {
      return `$${Math.round(basePrice * currentCurrency.rate)}+`
    }
    return `${basePrice}+ AED`
  }

  const features: { name: MessageKey; others: boolean; ready?: boolean }[] = [
    { name: "compare.feature1", others: false },
    { name: "compare.feature2", others: false },
    { name: "compare.feature3", others: false },
    { name: "compare.feature4", others: false },
    { name: "compare.feature5", others: false },
    { name: "compare.feature6", others: true },
    { name: "compare.feature7", others: false, ready: true },
    { name: "compare.feature8", others: false },
  ]

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden"
      style={{
        backgroundImage: "url(/images/tourist-woman-bg.jpg)",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      {/* High-contrast overlay to keep readability clean and matching Atlys theme */}
      <div className="absolute inset-0 bg-background/90 md:bg-background/85 pointer-events-none" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <Msg id="compare.eyebrow" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground mb-5 text-balance">
            <Msg id="compare.headingLead" /> <span className="text-primary"><Msg id="compare.headingAccent" /></span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            <Msg id="compare.intro" />
          </p>
        </div>

        {/* Side-by-Side Cards */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Card: Other Agencies */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-card/75 border border-border/80 rounded-3xl p-8 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="mb-6">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest"><Msg id="compare.alternative" /></span>
                <h3 className="text-xl font-semibold text-foreground mt-1"><Msg id="compare.otherAgencies" /></h3>
                <p className="text-xs text-muted-foreground mt-1"><Msg id="compare.otherTagline" /></p>
              </div>

              <div className="space-y-4 border-t border-border/60 pt-6">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {feature.others ? (
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" strokeWidth={3} />
                    )}
                    <span className={`text-sm ${feature.others ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {feature.ready ? <ReadyLine /> : <Msg id={feature.name} />}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/60 text-center">
              <span className="text-xs text-muted-foreground block mb-1"><Msg id="compare.estimatedCost" /></span>
              <span className="text-xl font-semibold text-muted-foreground line-through">{getOtherPrice()}</span>
            </div>
          </motion.div>

          {/* Card: EZvisa (Emphasized) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-card border-2 border-primary rounded-3xl p-8 shadow-xl shadow-primary/10 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Recommendation Ribbon */}
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-semibold tracking-widest uppercase py-1.5 px-6 rounded-bl-2xl">
              <Msg id="compare.recommended" />
            </div>

            <div>
              <div className="mb-6">
                <div className="h-8 relative w-[100px] mb-2">
                  <Image src="/images/logo-main.png" alt="EZvisa" fill className="object-contain" priority />
                </div>
                <h3 className="text-xl font-semibold text-foreground mt-1"><Msg id="compare.ezvisaWay" /></h3>
                <p className="text-xs text-primary font-medium mt-1"><Msg id="compare.ezvisaTagline" /></p>
              </div>

              <div className="space-y-4 border-t border-primary/10 pt-6">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      {feature.ready ? <ReadyLine /> : <Msg id={feature.name} />}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-primary/10 text-center">
              <span className="text-xs text-muted-foreground block mb-1"><Msg id="compare.flatFee" /></span>
              <span className="text-2xl font-semibold text-primary">{getPrice()}</span>
            </div>
          </motion.div>
        </div>

        {/* CTA link at bottom */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <LocaleLink
            href="/apply"
            className="inline-flex items-center gap-2 group px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/95 text-white text-base font-semibold transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
          >
            <Msg id="compare.start" />
            <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform duration-200">
              &rarr;
            </span>
          </LocaleLink>
        </motion.div>
      </div>
    </section>
  )
}
