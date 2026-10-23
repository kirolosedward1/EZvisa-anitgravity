"use client"

import { useRouter } from "next/navigation"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"

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

function DestinationCard({ name, onSelect }: { name: string; onSelect: (name: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      className="flex-shrink-0 max-md:snap-center flex items-center gap-4 px-5 py-4 mx-2 sm:mx-2.5 bg-background border border-border/80 rounded-2xl hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 group min-h-[72px] text-left w-[200px] sm:w-[240px] cursor-pointer"
    >
      <CountryFlag iso={SCHENGEN_META[name]?.iso} title={name} className="size-9 sm:size-10" />
      <span className="min-w-0 flex-1 truncate text-base sm:text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
        {name}
      </span>
    </button>
  )
}

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
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 z-10" />

      <div className="space-y-4 sm:space-y-5 py-6">
        {/* Row 1 - Scrolling Left */}
        <div className="flex w-max animate-scroll-left py-2 hover:[animation-play-state:paused] px-4 md:px-0">
          {[...ROW_1, ...ROW_1].map((destination, index) => (
            <DestinationCard key={`row1-${index}`} name={destination.name} onSelect={handleDestinationClick} />
          ))}
        </div>

        {/* Row 2 - Scrolling Right */}
        <div className="flex w-max animate-scroll-right py-2 hover:[animation-play-state:paused] px-4 md:px-0">
          {[...ROW_2, ...ROW_2].map((destination, index) => (
            <DestinationCard key={`row2-${index}`} name={destination.name} onSelect={handleDestinationClick} />
          ))}
        </div>
      </div>
    </div>
  )
}
