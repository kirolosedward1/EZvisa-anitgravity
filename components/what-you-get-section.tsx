"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Mail, 
  MapPin, 
  Plane, 
  Hotel, 
  Shield, 
  Briefcase, 
  UserCheck, 
  HandCoins 
} from "lucide-react"
import { CountryDocumentSelector } from "@/components/country-document-selector"
import { Msg } from "@/components/msg"
import { useMessage } from "@/components/use-message"
import type { MessageKey } from "@/messages"

const documents: { id: number; title: MessageKey; description: MessageKey; image: string; icon: typeof FileText }[] = [
  { id: 1, title: "dossier.formTitle", description: "dossier.formBody", image: "/images/documents/application-form.png", icon: FileText },
  { id: 2, title: "dossier.coverTitle", description: "dossier.coverBody", image: "/images/documents/cover-letter.png", icon: Mail },
  { id: 3, title: "dossier.itineraryTitle", description: "dossier.itineraryBody", image: "/images/documents/itinerary.png", icon: MapPin },
  { id: 4, title: "dossier.flightTitle", description: "dossier.flightBody", image: "/images/documents/flight-reservation.png", icon: Plane },
  { id: 5, title: "dossier.hotelTitle", description: "dossier.hotelBody", image: "/images/documents/hotel-booking.png", icon: Hotel },
  { id: 6, title: "dossier.insuranceTitle", description: "dossier.insuranceBody", image: "/images/documents/travel-insurance.jpeg", icon: Shield },
  { id: 7, title: "dossier.nocTitle", description: "dossier.nocBody", image: "/images/documents/noc.png", icon: Briefcase },
  { id: 8, title: "dossier.inviteTitle", description: "dossier.inviteBody", image: "/images/documents/invitation-letter.png", icon: UserCheck },
  { id: 9, title: "dossier.sponsorTitle", description: "dossier.sponsorBody", image: "/images/documents/sponsorship-letter.png", icon: HandCoins },
]

export function WhatYouGetSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const previousLabel = useMessage("dossier.prev")
  const nextLabel = useMessage("dossier.next")
  const imageAlt = useMessage(documents[currentIndex]?.title ?? "dossier.formTitle")

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? documents.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === documents.length - 1 ? 0 : prev + 1))
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const currentDocument = documents[currentIndex]
  const IconComponent = currentDocument.icon

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative dot matrix background */}
      <div
        className="absolute inset-0 opacity-[0.1] pointer-events-none"
        style={{
          backgroundImage: "none",
          backgroundSize: "32px 32px",
          maskImage: "none",
          WebkitMaskImage: "none",
        }}
      />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-left max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <Msg id="dossier.eyebrow" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
            <Msg id="dossier.headingLead" /> <span className="text-primary"><Msg id="dossier.headingAccent" /></span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            <Msg id="dossier.intro" />
          </p>
        </div>

        {/* Horizontal Document Selector & Preview Workspace */}
        <div className="flex flex-col gap-6 mb-16">
          
          {/* Horizontal Document Selector */}
          <div className="w-full flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-6 px-6 md:-mx-4 md:px-4">
            {documents.map((doc, index) => {
              const DocIcon = doc.icon
              const isSelected = index === currentIndex
              return (
                <button
                  key={doc.id}
                  onClick={() => goToSlide(index)}
                  className={`flex-shrink-0 text-left py-2.5 px-4 rounded-xl border transition-all flex items-center gap-3 cursor-pointer snap-center md:snap-start ${
                    isSelected
                      ? "border-primary bg-primary/[0.04] text-primary shadow-sm"
                      : "border-border/60 hover:border-primary/30 text-muted-foreground hover:text-foreground bg-card/65"
                  }`}
                >
                  {/* Icon Wrapper */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-background border-border text-muted-foreground"
                  }`}>
                    <DocIcon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  
                  {/* Title */}
                  <div className="min-w-0">
                    <span className={`text-xs sm:text-sm font-medium whitespace-nowrap block leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                      <Msg id={doc.title} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Full-width Live Document Preview Panel */}
          <div className="w-full bg-card border border-border/80 rounded-3xl p-6 md:p-10 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-primary/[0.02]">
            
            {/* Header Details */}
            <div className="mb-6 relative z-10">
              <div className="flex items-center gap-3.5 mb-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/10 flex items-center justify-center">
                  <IconComponent className="h-4.5 w-4.5" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-semibold text-primary tracking-tight">
                  <Msg id={currentDocument.title} />
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                <Msg id={currentDocument.description} />
              </p>
            </div>

            {/* Document Image & Stacked Cards Effect */}
            <div className="relative flex items-center justify-center my-6 md:my-8 px-8">
              {/* Previous Nav */}
              <button
                onClick={goToPrevious}
                className="absolute left-0 w-10 h-10 rounded-full bg-background border border-border text-[#5B6475] hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center z-10 cursor-pointer"
                aria-label={previousLabel}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Central Framed Document */}
              <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
                {/* Visual Stack behind the paper */}
                <div className="absolute inset-0 bg-background border border-border/80 rounded-2xl translate-x-2.5 translate-y-2.5 -z-10 shadow-sm opacity-80" />
                <div className="absolute inset-0 bg-background border border-border/50 rounded-2xl translate-x-5 translate-y-5 -z-20 shadow-xs opacity-60" />

                {/* Main Paper */}
                <div className="relative bg-white rounded-2xl shadow-xl border border-border overflow-hidden aspect-[3/4] p-3 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full relative"
                      >
                        <Image
                          src={currentDocument.image || "/placeholder.svg"}
                          alt={imageAlt}
                          fill
                          className="object-contain"
                          sizes="320px"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Next Nav */}
              <button
                onClick={goToNext}
                className="absolute right-0 w-10 h-10 rounded-full bg-background border border-border text-[#5B6475] hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center z-10 cursor-pointer"
                aria-label={nextLabel}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Footer / Pagination controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/50 pt-6 gap-4">
              <span className="text-xs italic text-primary/80">
                <Msg id="dossier.illustrative" />
              </span>
              
              {/* Dot Indicators */}
              <div className="flex gap-2">
                {documents.map((_, index) => (
                  <DocumentDot
                    key={index}
                    index={index}
                    selected={index === currentIndex}
                    onClick={() => goToSlide(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Country Document Selector */}
        <CountryDocumentSelector />
      </div>
    </section>
  )
}

function DocumentDot({ index, selected, onClick }: { index: number; selected: boolean; onClick: () => void }) {
  const label = useMessage("dossier.goto", { n: index + 1 })
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-2 rounded-full transition-all duration-300 ${
        selected ? "w-6 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/45"
      }`}
      aria-label={label}
    />
  )
}
