"use client"

import { useEffect, useState } from "react"
import { ContinueApplicationNotification } from "@/components/continue-application-notification"
import { ArrowRight } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { CITIZENSHIP_OPTIONS, citizenshipLabelAr, toCitizenshipIso } from "@/lib/nationalities"
import { SCHENGEN, HOMEPAGE_NATIONALITIES } from "@/lib/shared/wizard-contract"
import { Globi } from "@/components/globi/globi"
import { CountryPicker } from "@/components/country-picker"
import { CountryFlag } from "@/components/country-flag"
import { countryNameAr, SCHENGEN_META } from "@/lib/countries"
import { destinations } from "@/lib/destinations"

export function HeroSection() {
  const arabic = useSiteLocale() === "ar"
  const [nationality, setNationality] = useState("")
  const [destination, setDestination] = useState("")
  const t = (en: string, ar: string) => arabic ? ar : en

  useEffect(() => {
    setNationality(toCitizenshipIso(localStorage.getItem("hero-from-country") || "") || "")
    setDestination(localStorage.getItem("hero-to-country") || "")
    const sync = (event: Event) => setNationality(toCitizenshipIso((event as CustomEvent<{nationality: string}>).detail.nationality) || "")
    window.addEventListener("nationalityChange", sync)
    return () => window.removeEventListener("nationalityChange", sync)
  }, [])

  function changeNationality(value: string) {
    setNationality(value)
    localStorage.setItem("hero-from-country", value)
    window.dispatchEvent(new CustomEvent("nationalityChange", { detail: { nationality: value } }))
  }

  const params = new URLSearchParams()
  if (nationality) params.set("from", nationality)
  if (destination) params.set("to", destination)

  const selectedCountry = destinations.find(country => country.name === destination)

  return (
    <section id="hero" className="ez-hero">
      <div className="ez-welcome">
        <div className="ez-welcome-copy">
          <h1 data-site-reveal="rise">{t("Your Schengen visa,", "تأشيرة شنغن،")}<br /><em>{t("made simple.", "ببساطة.")}</em></h1>
          <p data-site-reveal="rise" data-site-delay="80" className="ez-hero-description">{t("You dream up the trip. We’ll prepare your Schengen paperwork. Five documents, one specialist team, and a little help from Globi.", "خطّط لرحلتك، واترك لنا أوراق شنغن. خمسة مستندات، وفريق مختص، والقليل من المساعدة من غلوبي.")}</p>
          <ContinueApplicationNotification inline />
          <div className="ez-application-wrap" id="application-start" data-ui>
            <div className="ez-application-bar">
              <CountryPicker label={t("Passport nationality", "جنسية جواز سفرك")} placeholder={t("Choose…", "اختر…")}
                featuredValues={HOMEPAGE_NATIONALITIES.map(toCitizenshipIso)}
                searchLabel={t("Search nationalities…", "ابحث عن الجنسية…")} value={nationality} onChange={changeNationality}
                options={CITIZENSHIP_OPTIONS.map(c => ({ value: c.iso, iso: c.iso, label: arabic ? citizenshipLabelAr(c.iso) || c.name : c.name, keywords: [c.name, citizenshipLabelAr(c.iso)] }))} />
              <CountryPicker label={t("Destination", "الوجهة")} placeholder={t("Choose…", "اختر…")}
                searchLabel={t("Search destinations…", "ابحث عن وجهة…")} value={destination}
                onChange={value => { setDestination(value); localStorage.setItem("hero-to-country", value) }}
                options={SCHENGEN.map(c => ({ value: c, iso: SCHENGEN_META[c].iso, label: arabic ? countryNameAr(c) : c, keywords: [c, countryNameAr(c)] }))} />
              <LocaleLink className="ez-start-button" href={`/apply${params.size ? `?${params}` : ""}`}>
                <span>{t("Start application", "ابدأ طلبك")}</span>
                <ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" />
              </LocaleLink>
            </div>
            <div className="ez-application-note">
              <p className="ez-application-timing">{t("File prepared in 1–2 days after we receive your details.", "نجهّز ملفك خلال يوم إلى يومين بعد استلام بياناتك.")}</p>
              <LocaleLink href="/pricing">{t("What’s included", "تفاصيل الخدمة")}</LocaleLink>
            </div>
          </div>
        </div>
        <div data-site-reveal="fade" data-site-delay="120" className="ez-welcome-character">
          <div className="ez-globi-intro"><span>{t("Hi, I’m Globi.", "مرحبًا، أنا غلوبي.")}</span><span>{t("Let’s get you going.", "لنبدأ رحلتك.")}</span></div>
          <Globi pose="welcome" />
          <div className="ez-journey-note" aria-live="polite">
            <span className="ez-journey-origin"><span aria-hidden="true"><CountryFlag iso="AE" className="size-7" /></span>{t("UAE", "الإمارات")}</span><ArrowRight size={22} aria-hidden="true" className="rtl:rotate-180" />
            {selectedCountry ? (
              <LocaleLink href={`/destinations/${selectedCountry.slug}`}>
                <span aria-hidden="true" className="ez-journey-flag"><CountryFlag iso={SCHENGEN_META[selectedCountry.name]?.iso} className="size-7" /></span>
                <span className="ez-journey-country">
                  {arabic ? countryNameAr(destination) : destination}
                </span>
              </LocaleLink>
            ) : <span>{t("To your next adventure", "إلى مغامرتك القادمة")}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
