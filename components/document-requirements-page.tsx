"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_COUNTRIES, SCHENGEN_META, countryToSlug, getCountryUrl } from "@/lib/countries"
import { destinations } from "@/lib/destinations"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { FixedCTAButton } from "@/components/fixed-cta-button"
import { DocumentSplit } from "@/components/documents/document-split"
import { CountryFacts } from "@/components/documents/country-facts"
import { ContactSection } from "@/components/contact-section"

interface DocumentRequirementsPageProps {
  initialCountry: string
}

// Documents that help in particular situations, on top of the core file.
const SITUATIONAL = [
  { title: "Previous Schengen visas", body: "Copies of earlier visas show a history of travelling and returning." },
  { title: "Travelling with your spouse", body: "Marriage certificate, attested and translated into English if needed." },
  { title: "Travelling with children", body: "Birth certificates, and a consent letter from a parent who isn't travelling." },
  { title: "Self-employed or a business owner", body: "Trade licence and company bank statements instead of a salary certificate." },
  { title: "Someone else pays for the trip", body: "A sponsorship letter with the sponsor's passport, residence visa and bank statements." },
]

export function DocumentRequirementsPage({ initialCountry }: DocumentRequirementsPageProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const country = initialCountry
  const slug = countryToSlug(country)
  const destination = destinations.find((d) => d.slug === slug)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
    setIsMobile(window.innerWidth < 768 || "ontouchstart" in window)
  }, [])

  // Push the Crisp chat bubble up on mobile so it doesn't cover the fixed apply button.
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "crisp-offset-style"
    style.textContent = `
      @media (max-width: 1023px) {
        .crisp-client .cc-1brb6[data-full-view=false] .cc-unoo,
        #crisp-chatbox .cc-1brb6[data-full-view=false] .cc-unoo,
        .crisp-client .cc-1brb6 .cc-unoo,
        .crisp-client a[data-cfs-tooltip],
        .crisp-client .crisp-1swadhx {
          bottom: 80px !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  const handleCountryChange = (next: string) => {
    setOpen(false)
    if (next !== country) router.push(getCountryUrl(next))
  }

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={`${country} tourist visa`}
          title={`Documents for a ${country} visa from the UAE.`}
          description={`What the ${country} visa centre asks for, what you bring yourself, and what we prepare for you.`}
          backgroundImage={destination?.image || `/images/countries/${slug}.jpg`}
        >
          <div className="flex justify-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full justify-between rounded-full border-border bg-background px-4 font-normal sm:w-72">
                <span className="flex items-center gap-2.5">
                  <CountryFlag iso={SCHENGEN_META[country]?.iso} title={country} />
                  <span className="font-medium text-foreground">{country}</span>
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  Change
                  <ChevronDown className="size-4" aria-hidden="true" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search country" autoFocus={!isMobile} />
                <CommandList className="max-h-96">
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {SCHENGEN_COUNTRIES.map((name) => (
                      <CommandItem key={name} value={name} onSelect={() => handleCountryChange(name)} className="cursor-pointer py-2.5">
                        <span className="flex w-full items-center gap-3">
                          <CountryFlag iso={SCHENGEN_META[name]?.iso} title={name} />
                          <span className="flex-1">{name}</span>
                          {name === country && <Check className="size-4 text-primary" aria-hidden="true" />}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          </div>
        </InnerHero>

        <CountryFacts slug={slug} />

        {/* The core file */}
        <section className="py-20 md:py-24">
          <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <h2 className="text-balance text-foreground">The file for {country}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                The {country} embassy asks for the same core documents as the rest of the Schengen area. Bring the ones on the
                left; the ones on the right are written and booked for your trip.
              </p>
            </div>
            <DocumentSplit country={country} />
          </div>
        </section>

        {/* Situational */}
        <section className="border-t border-border/70 py-20 md:py-24">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">If your situation is different</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                We&apos;ll tell you which of these apply once we&apos;ve read your answers. You don&apos;t need to work it out before you start.
              </p>
            </div>
            <ul className="flex flex-col">
              {SITUATIONAL.map((item) => (
                <li key={item.title} className="flex flex-col gap-1 border-t border-border/70 py-4 first:border-0 first:pt-0">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{item.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {destination && (
          <section className="pb-4">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <Link
                href={`/destinations/${destination.slug}`}
                className="group flex items-center justify-between gap-4 rounded-3xl border border-border/70 px-6 py-5 transition-colors hover:bg-secondary/50"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">The full {country} visa guide</span>
                  <span className="text-sm text-muted-foreground">Where to apply, when to apply, and common questions.</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        <ContactSection />
      </div>
      <Footer />
      <FixedCTAButton country={country} />
    </>
  )
}
