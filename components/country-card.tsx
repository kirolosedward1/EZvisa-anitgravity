"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import type { CountryData } from "@/lib/countries"

interface CountryCardProps {
  country: CountryData
  index: number
}

export function CountryCard({ country, index }: CountryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        href={`/documents/required-documents-to-apply-for-a-tourist-visa-in-${country.slug}`}
        className="block group"
      >
        {/* Mobile: compact horizontal layout */}
        <div className="md:hidden bg-white rounded-xl px-4 py-3 border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
              <Image
                src={`/flags/${country.slug}.png`}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium group-hover:text-primary transition-colors">{country.name}</h3>
              <span className="text-xs text-muted-foreground">{country.processingTime}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </div>

        {/* Desktop: original vertical layout */}
        <div className="hidden md:block bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-300 h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
              <Image
                src={`/flags/${country.slug}.png`}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-xl font-medium mb-2 group-hover:text-primary transition-colors">{country.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{country.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-gray-100 rounded-full">Processing: {country.processingTime}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
