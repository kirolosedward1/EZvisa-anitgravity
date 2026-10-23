"use client"

import React from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { destinations } from "@/lib/destinations"
import { PhotoHeroOverlay } from "@/components/photo-hero-overlay"
import { stableIndex } from "@/lib/stable-index"

interface InnerHeroProps {
  badge?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  backgroundImage?: string
  randomizeBackground?: boolean
  gradientType?: "default" | "ocean" | "sunset" | "aurora"
  children?: React.ReactNode
  className?: string
}

export function InnerHero({
  badge,
  title,
  description,
  backgroundImage,
  randomizeBackground = false,
  children,
  className = "",
}: InnerHeroProps) {
  // The server renders /ar/* via a rewrite (it sees "/documents", the browser sees "/ar/documents"):
  // use the locale-free path so the picked hero is identical on both sides (fixes React #418 on /ar).
  const pathname = usePathname()?.replace(/^\/ar(?=\/|$)/, "") || "/"
  const picked = randomizeBackground ? destinations[stableIndex(pathname || "inner", destinations.length)] : undefined
  const named = destinations.find((destination) => destination.image === backgroundImage)
  const heroBgImage = backgroundImage || picked?.image
  const heroBgCountryName = named?.name || picked?.name

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  } as const

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 },
    },
  } as const

  return (
    <section className={`relative bg-background pt-12 pb-12 px-4 overflow-x-clip ${className}`}>
      {/* Flight Path Curve Decoration (Left) */}
      <div className="absolute -bottom-8 left-[6%] w-[220px] h-[150px] pointer-events-none hidden lg:block select-none -rotate-[12deg] opacity-[0.22] dark:opacity-[0.15] dark:brightness-0 dark:invert">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          sizes="220px"
          className="object-contain"
          priority
        />
      </div>

      {/* Flight Path Curve Decoration (Right) */}
      <div className="absolute top-6 right-[8%] w-[260px] h-[180px] pointer-events-none hidden md:block select-none rotate-[8deg] opacity-[0.25] dark:opacity-[0.18] dark:brightness-0 dark:invert">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          sizes="260px"
          className="object-contain"
          priority
        />
      </div>

      <div className="container mx-auto max-w-6xl">
        <div className={`relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-[#E3E7EF] shadow-2xl px-6 py-24 md:py-28 flex flex-col items-center text-center bg-[#FFFFFF] ${heroBgImage ? "photo-hero" : ""}`}>
          {heroBgImage ? (
            <>
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <Image
                  src={heroBgImage}
                  alt=""
                  fill
                  priority
                  quality={75}
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover object-center"
                />
              </div>
              <PhotoHeroOverlay />
            </>
          ) : null}

          {/* Content Container */}
          <motion.div
            variants={containerVariants}
            initial={false}
            animate="visible"
            className="relative z-10 flex flex-col items-center max-w-3xl mx-auto w-full"
          >
            {/* Glassmorphic Badge Pill */}
            {badge && (
              <motion.div
                variants={itemVariants}
                className="mb-5 inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider shadow-sm cursor-default bg-[#F7F8FA] text-[#0436DC] border-[#E3E7EF]"
              >
                {badge}
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className={`text-balance ${heroBgImage ? "hero-copy text-white" : "text-[#0A0F1F]"}`}
            >
              {title}
            </motion.h1>

            {/* Description */}
            {description && (
              <motion.p
                variants={itemVariants}
                className={`mt-4 max-w-2xl ${heroBgImage ? "hero-copy text-white/90" : "text-[#3A4150]"}`}
              >
                {description}
              </motion.p>
            )}

            {/* Optional actions/inputs row */}
            {children && (
              <motion.div variants={itemVariants} className="mt-8 w-full">
                {children}
              </motion.div>
            )}
          </motion.div>
          {heroBgCountryName && (
            <div className={`absolute bottom-4 end-6 md:bottom-5 md:end-8 text-[9px] md:text-[10px] tracking-widest font-semibold uppercase z-20 pointer-events-none select-none ${heroBgImage ? "text-white/70" : "text-[#0A0F1F]/40"}`}>
              {heroBgCountryName}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
