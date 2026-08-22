"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

// All Schengen countries for Row 1 - Starting with popular destinations
const ROW_1 = [
  { name: "Italy" },
  { name: "France" },
  { name: "Germany" },
  { name: "Spain" },
  { name: "Greece" },
  { name: "Switzerland" },
  { name: "Netherlands" },
  { name: "Austria" },
  { name: "Portugal" },
  { name: "Belgium" },
  { name: "Norway" },
  { name: "Sweden" },
  { name: "Denmark" },
  { name: "Finland" },
  { name: "Iceland" },
]

// All Schengen countries for Row 2 - Different sequence starting with different popular destinations
const ROW_2 = [
  { name: "Poland" },
  { name: "Czech Republic" },
  { name: "Hungary" },
  { name: "Croatia" },
  { name: "Lithuania" },
  { name: "Latvia" },
  { name: "Estonia" },
  { name: "Malta" },
  { name: "Luxembourg" },
  { name: "Liechtenstein" },
  { name: "Bulgaria" },
  { name: "Romania" },
  { name: "Slovakia" },
  { name: "Slovenia" },
]

export function TopDestinationsCarousel() {
  const router = useRouter()

  const handleDestinationClick = (countryName: string) => {
    // Save to localStorage
    localStorage.setItem("hero-to-country", countryName)
    // Navigate to apply page with pre-filled destination
    router.push(`/apply?to=${encodeURIComponent(countryName)}`)
  }

  return (
    <div className="w-full overflow-hidden relative">
      {/* Side gradient fade overlays for smooth mask without GPU performance overhead */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="space-y-4 sm:space-y-5 py-6">
        {/* Row 1 - Scrolling Left (Desktop) / Native Scroll (Mobile) */}
        <div className="flex sm:animate-scroll-left py-2 overflow-x-auto sm:overflow-visible scrollbar-hide snap-x md:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Duplicate items for seamless loop */}
          {[...ROW_1, ...ROW_1].map((destination, index) => (
            <button
              key={`row1-${index}`}
              onClick={() => handleDestinationClick(destination.name)}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3 mx-2 sm:mx-2.5 bg-background border border-border/80 rounded-2xl hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 group min-h-[64px] text-left w-[200px] sm:w-[240px] cursor-pointer snap-start"
            >
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl overflow-hidden bg-secondary/50 group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
                <Image
                  src={`/flags/${destination.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {destination.name}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded-md mt-1 w-max">
                  Schengen Visa
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Row 2 - Scrolling Right (Desktop Only) / Hidden on Mobile for compactness */}
        <div className="hidden sm:flex animate-scroll-right py-2">
          {/* Duplicate items for seamless loop */}
          {[...ROW_2, ...ROW_2].map((destination, index) => (
            <button
              key={`row2-${index}`}
              onClick={() => handleDestinationClick(destination.name)}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3 mx-2.5 bg-background border border-border/80 rounded-2xl hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 group min-h-[64px] text-left w-[200px] sm:w-[240px] cursor-pointer"
            >
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl overflow-hidden bg-secondary/50 group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
                <Image
                  src={`/flags/${destination.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {destination.name}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded-md mt-1 w-max">
                  Schengen Visa
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translate3d(-50%, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
          will-change: transform;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
          will-change: transform;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
