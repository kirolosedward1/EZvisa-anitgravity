"use client"

import { ArrowUpRight } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { destinations } from "@/lib/destinations"
import { LangText } from "@/components/lang-text"
import { countryNameAr } from "@/lib/countries"
import { useSiteLocale } from "@/components/locale-provider"

const descriptions: Record<string, [string, string]> = {
  france: ["Paris, Provence & everything between", "باريس وبروفانس وما بينهما"],
  italy: ["A little art. A little dolce vita.", "الفن ومتعة الحياة الإيطالية"],
  switzerland: ["Fresh air. A different perspective.", "هواء نقي وآفاق جديدة"],
  spain: ["Take the long way home", "استمتع بكل محطة في الطريق"],
}

export function PopularDestinations() {
  const arabic = useSiteLocale() === "ar"
  const popular = ["france", "italy", "switzerland", "spain"].map(slug => destinations.find(d => d.slug === slug)!)
  return (
    <section className="ez-destinations">
      <div data-site-reveal="rise" className="ez-section-heading">
        <h2><LangText en="Same passport." ar="جوازك نفسه." /><br /><em><LangText en="A whole new story." ar="وحكاية جديدة." /></em></h2>
        <div><p><LangText en="One visa. 29 countries to explore." ar="تأشيرة واحدة. 29 دولة لتستكشفها." /></p><LocaleLink href="/destinations" className="ez-text-link"><LangText en="Explore all destinations" ar="استكشف كل الوجهات" /></LocaleLink></div>
      </div>
      <div data-site-stagger className="ez-destination-grid">
        {popular.map(country => (
          <LocaleLink key={country.id} href={`/destinations/${country.slug}`} data-site-reveal="rise" className="ez-destination-card">
            <div className="ez-destination-image"><img src={country.image} alt={arabic ? countryNameAr(country.name) : country.name} loading="lazy" /></div>
            <div className="ez-destination-info"><div className="ez-destination-name"><h3>{arabic ? countryNameAr(country.name) : country.name}</h3><ArrowUpRight size={22} aria-hidden="true" /></div><p>{descriptions[country.slug][arabic ? 1 : 0]}</p></div>
          </LocaleLink>
        ))}
      </div>
    </section>
  )
}
