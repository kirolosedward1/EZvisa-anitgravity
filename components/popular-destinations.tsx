"use client"

import { destinations } from "@/lib/destinations"
import { ArrowRight, MoveRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export function PopularDestinations() {
  // Filter only popular destinations (first 5: France, Italy, Spain, Germany, Switzerland)
  const popular = destinations.filter((d) => d.popular).slice(0, 5)

  return (
    <section className="py-16 md:py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-md">
              Top Travel Spots
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3">
              Popular Destinations
            </h2>
          </div>
          <Link
            href="/destinations"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span>View All Destinations</span>
            <MoveRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Responsive Grid/Carousel Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {popular.map((country, idx) => (
            <motion.div
              key={country.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative aspect-[3/4] rounded-3xl overflow-hidden group shadow-md hover:shadow-xl transition-shadow bg-muted"
            >
              {/* Country Background Image */}
              <Image
                src={country.image}
                alt={`${country.name} visa documents`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                priority={idx < 3}
              />

              {/* Dark Vignette Overlay for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

              {/* Top Right Circular Arrow Link */}
              <div className="absolute top-4 right-4 z-20">
                <Link
                  href={`/destinations/${country.slug}`}
                  className="h-10 w-10 border border-white/30 rounded-full hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-300"
                  aria-label={`View visa destination details for ${country.name}`}
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Bottom Card Content */}
              <div className="absolute bottom-6 left-6 right-6 z-20 text-white flex flex-col pointer-events-none">
                <span className="text-xs font-bold text-accent/90 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="relative w-4 h-4 rounded-full overflow-hidden inline-block flex-shrink-0">
                    <Image
                      src={`/flags/${country.slug}.png`}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </span>
                  <span>{country.visaType}</span>
                </span>
                <h3 className="text-xl font-bold tracking-tight mb-2">
                  {country.name}
                </h3>
                <div className="text-xs font-semibold text-white/70">
                  Starts at <span className="text-white text-sm font-bold">{country.price}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
