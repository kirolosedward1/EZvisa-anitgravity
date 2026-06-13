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
      <div className="space-y-4 sm:space-y-5 py-6" style={{
        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
      }}>
        {/* Row 1 - Scrolling Left */}
        <div className="flex animate-scroll-left py-2">
          {/* Duplicate items for seamless loop */}
          {[...ROW_1, ...ROW_1, ...ROW_1].map((destination, index) => (
            <button
              key={`row1-${index}`}
              onClick={() => handleDestinationClick(destination.name)}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3 mx-2.5 bg-background border border-border/80 rounded-2xl hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 group min-h-[64px] text-left w-[200px] sm:w-[240px] cursor-pointer"
            >
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl overflow-hidden bg-secondary/50 group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
                <Image
                  src={`/flags/${destination.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                  alt=""
                  fill
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

        {/* Row 2 - Scrolling Right */}
        <div className="flex animate-scroll-right py-2">
          {/* Duplicate items for seamless loop */}
          {[...ROW_2, ...ROW_2, ...ROW_2].map((destination, index) => (
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
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-scroll-left {
          animation: scroll-left 60s linear infinite;
        }

        .animate-scroll-right {
          animation: scroll-right 60s linear infinite;
        }

        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
