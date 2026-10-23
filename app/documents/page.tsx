"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { COUNTRY_DATA, SCHENGEN_META } from "@/lib/countries"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { CountryFlag } from "@/components/country-flag"
import { DocumentSplit } from "@/components/documents/document-split"
import { ContactSection } from "@/components/contact-section"

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  const query = searchQuery.trim().toLowerCase()
  const filteredCountries = COUNTRY_DATA.filter((country) => country.name.toLowerCase().includes(query))

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge="Documents"
          title="The documents for your Schengen visa, by country."
          description="Every Schengen country asks UAE residents for the same core file. Pick your destination for its visa centre, fees and the details that differ."
        >
          <label htmlFor="country-search" className="sr-only">
            Search for a country
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="country-search"
              type="search"
              placeholder="Search for a country"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-full border-border bg-background ps-11 text-base"
            />
          </div>
        </InnerHero>

        {/* Countries */}
        <section className="pb-20 md:pb-24" aria-label="Countries">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            {filteredCountries.length > 0 ? (
              <ul className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border/70 bg-card sm:grid-cols-2 lg:grid-cols-3">
                {filteredCountries.map((country) => (
                  <li key={country.name} className="-mb-px -me-px border-b border-e border-border/70">
                    <Link
                      href={`/documents/required-documents-to-apply-for-a-tourist-visa-in-${country.slug}`}
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/60"
                    >
                      <CountryFlag iso={SCHENGEN_META[country.name]?.iso} title={country.name} />
                      <span className="flex-1 font-medium text-foreground">{country.name}</span>
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-3xl border border-border/70 px-6 py-12 text-center text-muted-foreground">
                No Schengen country matches &ldquo;{searchQuery}&rdquo;.
              </p>
            )}
          </div>
        </section>

        {/* The core file */}
        <section className="border-t border-border/70 bg-secondary/40 py-20 md:py-28">
          <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
            <div className="flex max-w-2xl flex-col items-start gap-4">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Every country</span>
              <h2 className="text-balance text-foreground">Half the file is yours. The other half is ours.</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                You bring the documents only you can get. We prepare the ones that have to be written or booked for your trip, and
                check that all of them agree.
              </p>
            </div>
            <DocumentSplit />
          </div>
        </section>

        <ContactSection />
      </div>
      <Footer />
    </>
  )
}
