"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { LocaleLink, useLocalizedHref } from "@/components/locale-link"
import { ArrowRight, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_COUNTRIES, SCHENGEN_META, countryNameAr, countryToSlug, getCountryUrl } from "@/lib/countries"
import { useSiteLocale } from "@/components/locale-provider"
import { destinations } from "@/lib/destinations"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"
import { FixedCTAButton } from "@/components/fixed-cta-button"
import { DocumentSplit } from "@/components/documents/document-split"
import { CountryFacts } from "@/components/documents/country-facts"
interface DocumentRequirementsPageProps {
  initialCountry: string
  children?: ReactNode
}

// Documents that help in particular situations, on top of the core file.
const SITUATIONAL = [
  { title: "Previous Schengen visas", titleAr: "تأشيرات شنغن السابقة", body: "Copies of any Schengen visas you've held before.", bodyAr: "نسخ من أي تأشيرات شنغن حصلت عليها سابقًا." },
  { title: "Travelling with your spouse", titleAr: "السفر مع الزوج أو الزوجة", body: "Marriage certificate, attested and translated into English if needed.", bodyAr: "عقد الزواج، مصدّق ومترجَم إلى الإنجليزية إذا لزم." },
  { title: "Travelling with children", titleAr: "السفر مع الأطفال", body: "Birth certificates, and a consent letter from a parent who isn't travelling.", bodyAr: "شهادات الميلاد، وخطاب موافقة من الوالد الذي لا يسافر." },
  { title: "Self-employed or a business owner", titleAr: "عمل حر أو صاحب عمل", body: "Trade licence and company bank statements instead of a salary certificate.", bodyAr: "الرخصة التجارية وكشوف حساب الشركة بدل شهادة الراتب." },
  { title: "Someone else pays for the trip", titleAr: "شخص آخر يتحمّل تكاليف الرحلة", body: "A sponsorship letter with the sponsor's passport, residence visa and bank statements.", bodyAr: "خطاب كفالة مع جواز الكفيل وتأشيرة إقامته وكشوف حسابه." },
]

export function DocumentRequirementsPage({ initialCountry, children }: DocumentRequirementsPageProps) {
  const arabic = useSiteLocale() === "ar"
  const router = useRouter()
  const localize = useLocalizedHref()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const country = initialCountry
  const place = arabic ? countryNameAr(country) : country
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
    if (next !== country) router.push(localize(getCountryUrl(next)))
  }

  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={arabic ? `تأشيرة ${place} السياحية` : `${country} tourist visa`}
          title={arabic ? `متطلبات تأشيرة ${place} للمقيمين في الإمارات` : `${country} visa requirements for UAE residents`}
          description={
            arabic
              ? `المستندات التي تحتاجها للتقدّم لتأشيرة سياحية إلى ${place} من الإمارات، والمستندات التي نجهّزها لك.`
              : `The documents you need to apply for a ${country} tourist visa from the UAE, and the ones we prepare for you.`
          }
          backgroundImage={destination?.image || `/images/countries/${slug}.jpg`}
        >
          <div className="flex justify-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full justify-between rounded-full border-border bg-background px-4 font-normal sm:w-72">
                <span className="flex items-center gap-2.5">
                  <CountryFlag iso={SCHENGEN_META[country]?.iso} title={place} />
                  <span className="font-medium text-foreground">{place}</span>
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  {arabic ? "تغيير" : "Change"}
                  <ChevronDown className="size-4" aria-hidden="true" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder={arabic ? "ابحث عن دولة" : "Search country"} autoFocus={!isMobile} />
                <CommandList className="max-h-96">
                  <CommandEmpty>{arabic ? "لم يُعثر على دولة." : "No country found."}</CommandEmpty>
                  <CommandGroup>
                    {SCHENGEN_COUNTRIES.map((name) => (
                      <CommandItem key={name} value={`${name} ${countryNameAr(name)}`} onSelect={() => handleCountryChange(name)} className="cursor-pointer py-2.5">
                        <span className="flex w-full items-center gap-3">
                          <CountryFlag iso={SCHENGEN_META[name]?.iso} title={arabic ? countryNameAr(name) : name} />
                          <span className="flex-1">{arabic ? countryNameAr(name) : name}</span>
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
              <h2 className="text-balance text-foreground">{arabic ? "المستندات المطلوبة" : "Required documents"}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {arabic
                  ? `تطلب ${place} المستندات الأساسية نفسها كبقية دول شنغن. تقدّم أنت المستندات في القائمة الأولى، ونجهّز نحن ما في القائمة الثانية.`
                  : `${country} asks for the same core documents as other Schengen countries. You provide the documents in the first list, and we prepare the ones in the second.`}
              </p>
            </div>
            <DocumentSplit country={country} />
          </div>
        </section>

        {/* Situational */}
        <section className="border-t border-border/70 py-20 md:py-24">
          <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div className="flex flex-col items-start gap-4">
              <h2 className="text-balance text-foreground">{arabic ? "مستندات إضافية" : "Additional documents"}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {arabic
                  ? "قد تحتاج حسب ظروفك إلى بعض المستندات التالية. سنؤكد لك ما ينطبق عليك بعد مراجعة طلبك."
                  : "Depending on your circumstances, you may also need some of the following. We'll confirm which apply to you after reviewing your application."}
              </p>
            </div>
            <ul className="flex flex-col">
              {SITUATIONAL.map((item) => (
                <li key={item.title} className="flex flex-col gap-1 border-t border-border/70 py-4 first:border-0 first:pt-0">
                  <span className="font-medium text-foreground">{arabic ? item.titleAr : item.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{arabic ? item.bodyAr : item.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {destination && (
          <section className="pb-4">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <LocaleLink
                href={`/destinations/${destination.slug}`}
                className="group flex items-center justify-between gap-4 rounded-3xl border border-border/70 px-6 py-5 transition-colors hover:bg-secondary/50"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">{arabic ? `دليل تأشيرة ${place}` : `${country} visa guide`}</span>
                  <span className="text-sm text-muted-foreground">{arabic ? "أين ومتى تقدّم، وإجابات الأسئلة الشائعة." : "Where and when to apply, and answers to common questions."}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180" aria-hidden="true" />
              </LocaleLink>
            </div>
          </section>
        )}

        {children}
      </div>
      <Footer />
      <FixedCTAButton country={country} />
    </>
  )
}
