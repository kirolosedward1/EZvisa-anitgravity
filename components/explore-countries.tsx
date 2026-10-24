import Image from "next/image"
import { LocaleLink } from "@/components/locale-link"
import { ArrowRight } from "lucide-react"
import { PreparationLine, ReadyLine } from "@/components/ready-line"
import { CountryFlag } from "@/components/country-flag"
import { destinations } from "@/lib/destinations"
import { SCHENGEN_META } from "@/lib/countries"
import { LangText } from "@/components/lang-text"

/** Six Schengen countries that are not in the popular row (France, Italy, Spain, Germany, Switzerland). */
const EXPLORE = ["Greece", "Netherlands", "Austria", "Portugal", "Czech Republic", "Hungary"]

export function ExploreCountries() {
  const cards = EXPLORE.map((name) => destinations.find((destination) => destination.name === name)).filter(
    (destination): destination is NonNullable<typeof destination> => Boolean(destination),
  )

  return (
    <section className="bg-secondary/50 py-16 md:py-20" aria-labelledby="explore-countries-heading">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex flex-col gap-2">
            <h2 id="explore-countries-heading" className="text-foreground">
              <LangText en="Explore countries" ar="استكشف الدول" />
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              <PreparationLine />
            </p>
          </div>
          <LocaleLink
            href="/destinations"
            className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:self-auto"
          >
            <LangText en="View all countries" ar="عرض كل الدول" />
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          </LocaleLink>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((country) => (
            <li key={country.slug}>
              <LocaleLink
                href={`/destinations/${country.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-2.5 pe-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={country.image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <CountryFlag iso={SCHENGEN_META[country.name]?.iso} title={country.name} className="size-4" />
                    <span className="truncate"><LangText en={country.name} ar={SCHENGEN_META[country.name]?.ar ?? country.name} /></span>
                  </span>
                  <ReadyLine className="text-xs text-muted-foreground" />
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </span>
              </LocaleLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
