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

const documents = [
  {
    id: 1,
    title: "Visa Application Form",
    description: "Your official Schengen visa application form completed accurately without typos or blanks.",
    image: "/images/documents/application-form.png",
    icon: FileText,
    type: "Embassy Required",
  },
  {
    id: 2,
    title: "Cover Letter",
    description: "A professionally drafted cover letter highlighting your trip purpose, itinerary, and financial proof.",
    image: "/images/documents/cover-letter.png",
    icon: Mail,
    type: "Personalized Draft",
  },
  {
    id: 3,
    title: "Travel Itinerary",
    description: "A detailed day-by-day travel map displaying dates, destinations, and local connection plans.",
    image: "/images/documents/itinerary.png",
    icon: MapPin,
    type: "Custom Itinerary",
  },
  {
    id: 4,
    title: "Flight Reservation",
    description: "Embassy-compliant flight reservation matching your exact travel dates.",
    image: "/images/documents/flight-reservation.png",
    icon: Plane,
    type: "Verified Booking",
  },
  {
    id: 5,
    title: "Hotel Booking",
    description: "Confirmed hotel reservations aligned with your selected travel cities.",
    image: "/images/documents/hotel-booking.png",
    icon: Hotel,
    type: "Verified Booking",
  },
  {
    id: 6,
    title: "Travel Insurance",
    description: "Fully compliant Schengen travel insurance certificate with €30,000 minimum medical coverage.",
    image: "/images/documents/travel-insurance.jpeg",
    icon: Shield,
    type: "Certified Policy",
  },
  {
    id: 7,
    title: "No Objection Certificate",
    description: "Custom NOC format prepared for your employer's signature to confirm your leave period.",
    image: "/images/documents/noc.png",
    icon: Briefcase,
    type: "Standard Template",
  },
  {
    id: 8,
    title: "Invitation Letter",
    description: "Formatted host invitation templates designed to address strict consular guidelines.",
    image: "/images/documents/invitation-letter.png",
    icon: UserCheck,
    type: "Host Template",
  },
  {
    id: 9,
    title: "Sponsorship Letter",
    description: "Consulate-approved financial sponsorship letters to substantiate travel funding.",
    image: "/images/documents/sponsorship-letter.png",
    icon: HandCoins,
    type: "Financial Draft",
  },
]

export function WhatYouGetSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

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
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 75%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 75%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-left max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Documents included
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-foreground text-balance">
            Your complete, <span className="text-primary">consolidated dossier.</span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            EZvisa provides a fully compiled and filled-out Schengen visa application packet with all necessary paperwork configured for your profile.
          </p>
        </div>

        {/* Horizontal Document Selector & Preview Workspace */}
        <div className="flex flex-col gap-6 mb-16">
          
          {/* Horizontal Document Selector */}
          <div className="w-full flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
            {documents.map((doc, index) => {
              const DocIcon = doc.icon
              const isSelected = index === currentIndex
              return (
                <button
                  key={doc.id}
                  onClick={() => goToSlide(index)}
                  className={`flex-shrink-0 text-left p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer min-w-[200px] sm:min-w-[220px] ${
                    isSelected
                      ? "border-primary bg-primary/[0.04] text-primary shadow-sm"
                      : "border-border/60 hover:border-primary/30 text-muted-foreground hover:text-foreground bg-card/65"
                  }`}
                >
                  {/* Icon Wrapper */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-background border-border text-muted-foreground"
                  }`}>
                    <DocIcon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  
                  {/* Title */}
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-bold block leading-tight ${isSelected ? "text-primary font-bold" : "text-foreground"}`}>
                      {doc.title}
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
                <h3 className="text-lg font-bold text-primary tracking-tight">
                  {currentDocument.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                {currentDocument.description}
              </p>
            </div>

            {/* Document Image & Stacked Cards Effect */}
            <div className="relative flex items-center justify-center my-6 md:my-8 px-8">
              {/* Previous Nav */}
              <button
                onClick={goToPrevious}
                className="absolute left-0 w-10 h-10 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center z-10 cursor-pointer"
                aria-label="Previous document"
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
                          alt={currentDocument.title}
                          fill
                          className="object-contain"
                          sizes="320px"
                          unoptimized
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Next Nav */}
              <button
                onClick={goToNext}
                className="absolute right-0 w-10 h-10 rounded-full bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center z-10 cursor-pointer"
                aria-label="Next document"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Footer / Pagination controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/50 pt-6 gap-4">
              <span className="text-xs italic text-primary/80">
                * For illustrative purposes only.
              </span>
              
              {/* Dot Indicators */}
              <div className="flex gap-2">
                {documents.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? "w-6 bg-primary"
                        : "w-2 bg-primary/20 hover:bg-primary/45"
                    }`}
                    aria-label={`Go to document ${index + 1}`}
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
