"use client"

import { useState } from "react"
import { Search, ArrowRight } from "lucide-react"
import { destinations, type Destination } from "@/lib/destinations"
import { destinationNameAr } from "@/lib/destination-names-ar"
import { LocaleLink } from "@/components/locale-link"
import { Image } from "@/components/image"
import { useSiteLocale } from "@/components/locale-provider"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { formatAedLabel } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export function DestinationCard({ country, compact = false }: { country: Destination; compact?: boolean }) {
  const arabic = useSiteLocale() === "ar"
  const name = arabic ? destinationNameAr(country.slug) || country.name : country.name
  return <article data-site-reveal="rise" className={`ez-catalog-card${compact ? " ez-catalog-compact" : ""}`}>
    <LocaleLink href={`/destinations/${country.slug}`} className="ez-catalog-image" aria-label={arabic ? `متطلبات تأشيرة ${name}` : `${name} visa requirements`}>
      <Image src={country.image} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-cover" />
      <CountryFlag iso={SCHENGEN_META[country.name]?.iso} title={name} className="size-9" />
    </LocaleLink>
    <div className="ez-catalog-heading"><h3><LocaleLink href={`/destinations/${country.slug}`}>{name}</LocaleLink></h3></div>
    <p>{arabic ? "مستنداتك، وخطوات التقديم، وما تتوقعه." : "Your documents, application steps and what to expect."}</p>
    <div className="ez-catalog-bottom"><span>{formatAedLabel(PRICE_AED, arabic ? "ar" : "en")} <small>{arabic ? "لتجهيز الملف" : "file preparation"}</small></span><LocaleLink href={`/apply?to=${encodeURIComponent(country.name)}`} aria-label={arabic ? `قدّم على تأشيرة ${name}` : `Apply for ${name}`}>{arabic ? "ابدأ الطلب" : "Apply"}<ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" /></LocaleLink></div>
  </article>
}

export function DestinationsCatalog() {
  const arabic = useSiteLocale() === "ar"
  const [query, setQuery] = useState("")
  const filtered = destinations.filter(country => country.name.toLowerCase().includes(query.trim().toLowerCase()) || destinationNameAr(country.slug).includes(query.trim()))
  return <section className="ez-destination-catalog">
    <div className="ez-catalog-toolbar">
      <p aria-live="polite">{arabic ? `${filtered.length} وجهة في شنغن` : `${filtered.length} Schengen ${filtered.length === 1 ? "destination" : "destinations"}`}</p>
      <div className="ez-catalog-search"><Search size={19} aria-hidden="true" /><label htmlFor="destination-search" className="sr-only">{arabic ? "ابحث عن دولة" : "Search destinations"}</label><input id="destination-search" type="search" placeholder={arabic ? "إلى أين ترغب بالسفر؟" : "Where would you like to go?"} value={query} onChange={event => setQuery(event.target.value)} /></div>
    </div>
    {filtered.length ? <div data-site-stagger className="ez-catalog-grid">{filtered.map(country => <DestinationCard key={country.id} country={country} />)}</div> : <div className="ez-catalog-empty"><h2>{arabic ? "لم نجد هذه الوجهة" : "We couldn’t find that destination"}</h2><p>{arabic ? "جرّب اسم دولة أخرى أو استعرض كل الوجهات." : "Try another country name or browse all destinations."}</p><button onClick={() => setQuery("")}>{arabic ? "امسح البحث" : "Clear search"}</button></div>}
  </section>
}
