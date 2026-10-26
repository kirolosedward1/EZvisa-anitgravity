"use client"

import { useEffect, useState, type ReactNode } from "react"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { COUNTRY_DATA, SCHENGEN_META } from "@/lib/countries"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { CountryFlag } from "@/components/country-flag"
import { CountryName } from "@/components/country-name"
import { DocumentSplit } from "@/components/documents/document-split"
import { useSiteLocale } from "@/components/locale-provider"

export function DocumentsIndex({ children }: { children?: ReactNode }) {
  const arabic = useSiteLocale() === "ar"
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  const query = searchQuery.trim().toLowerCase()
  const filteredCountries = COUNTRY_DATA.filter((country) => {
    const arName = SCHENGEN_META[country.name]?.ar ?? ""
    return country.name.toLowerCase().includes(query) || arName.includes(searchQuery.trim())
  })

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={arabic ? "المستندات" : "Documents"}
          title={arabic ? "مستندات تأشيرة شنغن حسب الدولة" : "Schengen visa documents by country"}
          description={
            arabic
              ? "اختر وجهتك لمعرفة المستندات المطلوبة ومركز التأشيرات الذي يستقبل الطلبات ورسوم السفارة."
              : "Select your destination to see the required documents, the visa centre that handles applications, and the embassy fee."
          }
        >
          <label htmlFor="country-search" className="sr-only">
            {arabic ? "ابحث عن دولة" : "Search for a country"}
          </label>
          <div className="relative mx-auto max-w-md">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="country-search"
              type="search"
              placeholder={arabic ? "ابحث عن دولة" : "Search for a country"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-full border-border bg-background ps-11 text-base"
            />
          </div>
        </InnerHero>

        {/* Countries */}
        <section className="pb-20 md:pb-24" aria-label={arabic ? "الدول" : "Countries"}>
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            {filteredCountries.length > 0 ? (
              <ul className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border/70 bg-card sm:grid-cols-2 lg:grid-cols-3">
                {filteredCountries.map((country) => (
                  <li key={country.name} className="-mb-px -me-px border-b border-e border-border/70">
                    <LocaleLink
                      href={`/documents/required-documents-to-apply-for-a-tourist-visa-in-${country.slug}`}
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/60"
                    >
                      <CountryFlag iso={SCHENGEN_META[country.name]?.iso} title={arabic ? SCHENGEN_META[country.name]?.ar ?? country.name : country.name} />
                      <span className="flex-1 font-medium text-foreground"><CountryName name={country.name} /></span>
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180"
                        aria-hidden="true"
                      />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-3xl border border-border/70 px-6 py-12 text-center text-muted-foreground">
                {arabic ? `لا توجد دولة شنغن تطابق «${searchQuery}».` : `No Schengen country matches “${searchQuery}”.`}
              </p>
            )}
          </div>
        </section>

        {/* The core file */}
        <section className="border-t border-border/70 bg-secondary/40 py-20 md:py-28">
          <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
            <div className="flex max-w-2xl flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">{arabic ? "مستندات كل دول شنغن" : "Documents for every Schengen country"}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {arabic
                  ? "تطلب كل دول شنغن المستندات الأساسية نفسها. تقدّم أنت مستنداتك الشخصية، ونجهّز الباقي ضمن الخدمة."
                  : "All Schengen countries ask for the same core documents. You provide your personal documents, and we prepare the rest as part of the service."}
              </p>
            </div>
            <DocumentSplit />
          </div>
        </section>

        {children}
      </div>
      <Footer />
    </>
  )
}
