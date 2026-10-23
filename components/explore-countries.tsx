import Image from "next/image"
import { PreparationLine, ReadyLine } from "@/components/ready-line"
import { destinations } from "@/lib/destinations"
import { Button } from "@/components/ui/button"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { countryNameAr } from "@/components/country-name"
import { message } from "@/messages"

/** Six Schengen countries that are not in the popular row (France, Italy, Spain, Germany, Switzerland). */
const EXPLORE = ["Greece", "Netherlands", "Austria", "Portugal", "Czech Republic", "Hungary"]

export function ExploreCountries() {
  const cards = EXPLORE.map((name) => destinations.find((destination) => destination.name === name)).filter(
    (destination): destination is NonNullable<typeof destination> => Boolean(destination),
  )

  return (
    <section className="bg-background py-16 md:py-20" aria-labelledby="explore-countries-heading">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h2 id="explore-countries-heading" className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            <Msg id="explore.heading" />
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            <PreparationLine />
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {cards.map((country) => (
            <LocaleLink
              key={country.slug}
              href={`/destinations/${country.slug}`}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="relative block aspect-[4/3]">
                <Image
                  src={country.image}
                  alt={`${message("en", "explore.imageAlt", { country: country.name })} / ${message("ar", "explore.imageAlt", { country: countryNameAr(country.name) })}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </span>
              <span className="flex flex-col gap-1 p-3">
                <span className="font-semibold text-foreground">
                  <span className="rtl:hidden">{country.name}</span>
                  <span className="hidden rtl:inline">{countryNameAr(country.name)}</span>
                </span>
                <ReadyLine className="text-xs text-muted-foreground" />
              </span>
            </LocaleLink>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild className="rounded-full px-5">
            <LocaleLink href="/destinations"><Msg id="explore.viewAll" /></LocaleLink>
          </Button>
        </div>
      </div>
    </section>
  )
}
