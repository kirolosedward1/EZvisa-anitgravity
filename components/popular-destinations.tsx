"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { destinations } from "@/lib/destinations"
import { DestinationCard } from "@/components/destinations-catalog"

/** The five most requested countries, with the same photo card as /destinations. */
export function PopularDestinations() {
  const popular = destinations.filter((d) => d.popular).slice(0, 5)

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex flex-col items-start gap-3">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Top Travel Spots</span>
            <h2 className="text-foreground">Popular Destinations</h2>
          </div>
          <Link
            href="/destinations"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:self-auto"
          >
            View All Destinations
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {popular.map((country) => (
            <DestinationCard key={country.id} country={country} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
