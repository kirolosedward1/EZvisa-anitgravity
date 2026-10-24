"use client"

import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { countryNameAr } from "@/components/country-name"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { SCHENGEN_META, type CountryData } from "@/lib/countries"
import { CountryFlag } from "@/components/country-flag"
import { ReadyLine } from "@/components/ready-line"

interface CountryCardProps {
  country: CountryData
  index: number
}

export function CountryCard({ country }: CountryCardProps) {
  return (
    <motion.div initial={false}>
      <LocaleLink
        href={`/documents/required-documents-to-apply-for-a-tourist-visa-in-${country.slug}`}
        className="block group"
      >
        {/* Mobile: compact horizontal layout */}
        <div className="md:hidden bg-card rounded-xl px-4 py-3 border border-border hover:border-primary hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3">
            <CountryFlag iso={SCHENGEN_META[country.name]?.iso} title={country.name} />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-medium group-hover:text-primary transition-colors">
                <span className="rtl:hidden">{country.name}</span>
                <span className="hidden rtl:inline">{countryNameAr(country.name)}</span>
              </h3>
              <ReadyLine className="text-xs text-muted-foreground" />
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </div>

        {/* Desktop: original vertical layout */}
        <div className="hidden md:block bg-card rounded-2xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all duration-300 h-full">
          <div className="flex items-start justify-between mb-4">
            <CountryFlag iso={SCHENGEN_META[country.name]?.iso} title={country.name} />
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-xl font-medium mb-1 group-hover:text-primary transition-colors">
            <span className="rtl:hidden">{country.name}</span>
            <span className="hidden rtl:inline">{countryNameAr(country.name)}</span>
          </h3>
          <p className="text-xs text-muted-foreground mb-3"><ReadyLine /></p>
          <p className="text-sm text-muted-foreground">
            <Msg
              id="documents.cardDescription"
              values={{ country: country.name }}
              valuesAr={{ country: countryNameAr(country.name) }}
            />
          </p>
        </div>
      </LocaleLink>
    </motion.div>
  )
}
