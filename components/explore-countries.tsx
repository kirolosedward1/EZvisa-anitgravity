import Image from "next/image"
import Link from "next/link"
import { PreparationLine, ReadyLine } from "@/components/ready-line"
import { destinations } from "@/lib/destinations"
import { Button } from "@/components/ui/button"

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
            Explore countries
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            <PreparationLine />
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {cards.map((country) => (
            <Link
              key={country.slug}
              href={`/destinations/${country.slug}`}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="relative block aspect-[4/3]">
                <Image
                  src={country.image}
                  alt={`${country.name} destination`}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </span>
              <span className="flex flex-col gap-1 p-3">
                <span className="font-semibold text-foreground">{country.name}</span>
                <ReadyLine className="text-xs text-muted-foreground" />
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild className="rounded-full px-5">
            <Link href="/destinations">View all countries</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
