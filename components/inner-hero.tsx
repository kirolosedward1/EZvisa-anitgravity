"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { destinations } from "@/lib/destinations"

interface InnerHeroProps {
  badge?: string
  title: React.ReactNode
  description?: string
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
  gradientType = "default",
  children,
  className = "",
}: InnerHeroProps) {
  const [heroBgImage, setHeroBgImage] = useState<string | undefined>(backgroundImage)
  const [heroBgCountryName, setHeroBgCountryName] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (randomizeBackground) {
      const randomIndex = Math.floor(Math.random() * destinations.length)
      const randomDest = destinations[randomIndex]
      if (randomDest && randomDest.image) {
        setHeroBgImage(randomDest.image)
        setHeroBgCountryName(randomDest.name)
      }
    } else {
      setHeroBgImage(backgroundImage)
      // Look up country name by image path
      const matchingDest = destinations.find(d => d.image === backgroundImage)
      if (matchingDest) {
        setHeroBgCountryName(matchingDest.name)
      } else {
        setHeroBgCountryName(undefined)
      }
    }
  }, [backgroundImage, randomizeBackground])

  // Define blob color configurations based on gradientType
  const blobColors = {
    default: {
      blob1: "bg-primary/10",
      blob2: "bg-blue-500/10",
    },
    ocean: {
      blob1: "bg-cyan-500/10",
      blob2: "bg-blue-600/10",
    },
    sunset: {
      blob1: "bg-orange-500/10",
      blob2: "bg-amber-500/10",
    },
    aurora: {
      blob1: "bg-emerald-500/10",
      blob2: "bg-teal-500/10",
    },
  }

  const selectedBlobs = blobColors[gradientType] || blobColors.default

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
          className="object-contain"
          priority
          unoptimized
        />
      </div>

      {/* Flight Path Curve Decoration (Right) */}
      <div className="absolute top-6 right-[8%] w-[260px] h-[180px] pointer-events-none hidden md:block select-none rotate-[8deg] opacity-[0.25] dark:opacity-[0.18] dark:brightness-0 dark:invert">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          className="object-contain"
          priority
          unoptimized
        />
      </div>

      <div className="container mx-auto max-w-6xl">
        <div className={`relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-border/40 shadow-2xl px-6 py-24 md:py-28 flex flex-col items-center text-center ${
          heroBgImage ? "bg-slate-950" : "bg-card"
        }`}>
          {/* Background Elements */}
          {heroBgImage ? (
            <>
              {/* Background Image Layer */}
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <Image
                  src={heroBgImage}
                  alt="Hero background"
                  fill
                  priority
                  quality={75}
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover object-center"
                />
              </div>
              {/* High-contrast dark gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/75 pointer-events-none" />
            </>
          ) : (
            <>
              {/* Animated Mesh Blobs */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{
                    x: [0, 40, 0, -40, 0],
                    y: [0, 20, 40, 20, 0],
                    scale: [1, 1.1, 1, 0.95, 1],
                  }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className={`absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full ${selectedBlobs.blob1} blur-[90px]`}
                />
                <motion.div
                  animate={{
                    x: [0, -30, 0, 30, 0],
                    y: [0, -30, 0, 30, 0],
                    scale: [1, 0.95, 1.05, 1, 1],
                  }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className={`absolute top-20 -left-32 w-[400px] h-[400px] rounded-full ${selectedBlobs.blob2} blur-[90px]`}
                />
              </div>
            </>
          )}

          {/* Decorative Subtle Dot Grid */}
          <div
            className="absolute inset-0 opacity-[0.25] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, oklch(0.45 0.25 264 / 0.15) 1px, transparent 0)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 50%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 50%, transparent 100%)",
            }}
          />

          {/* Content Container */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 flex flex-col items-center max-w-3xl mx-auto w-full"
          >
            {/* Glassmorphic Badge Pill */}
            {badge && (
              <motion.div
                variants={itemVariants}
                className={`mb-5 inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-sm cursor-default ${
                  heroBgImage
                    ? "bg-white/10 text-white/90 border-white/20"
                    : "bg-primary/5 text-primary border-primary/10"
                }`}
              >
                {badge}
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.15] text-balance ${
                heroBgImage ? "text-white drop-shadow-md" : "text-foreground"
              }`}
            >
              {title}
            </motion.h1>

            {/* Description */}
            {description && (
              <motion.p
                variants={itemVariants}
                className={`mt-4 text-base sm:text-lg leading-relaxed max-w-2xl font-medium ${
                  heroBgImage ? "text-white/80 drop-shadow-sm" : "text-muted-foreground"
                }`}
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
            <div className="absolute bottom-4 right-6 md:bottom-5 md:right-8 text-[9px] md:text-[10px] text-white/35 tracking-widest font-semibold uppercase z-20 pointer-events-none select-none">
              {heroBgCountryName}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
