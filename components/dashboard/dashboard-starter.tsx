"use client"

import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { CountryPicker } from "@/components/country-picker"
import { CITIZENSHIP_OPTIONS, citizenshipLabelAr, toCitizenshipIso } from "@/lib/nationalities"
import { countryNameAr, SCHENGEN_META } from "@/lib/countries"
import { HOMEPAGE_NATIONALITIES, SCHENGEN } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"

/** The empty dashboard's starter: the homepage's nationality and destination pickers, leading into /apply. */
export function DashboardStarter() {
  const arabic = useSiteLocale() === "ar"
  const t = (key: CustomerKey) => customerText(arabic ? "ar" : "en", key)
  const [nationality, setNationality] = useState("")
  const [destination, setDestination] = useState("")

  useEffect(() => {
    setNationality(toCitizenshipIso(localStorage.getItem("hero-from-country") || "") || "")
    setDestination(localStorage.getItem("hero-to-country") || "")
  }, [])

  const params = new URLSearchParams()
  if (nationality) params.set("from", nationality)
  if (destination) params.set("to", destination)

  return (
    <div className="ez-application-bar ez-dash-starter">
      <CountryPicker
        label={t("start.nationality")}
        placeholder={t("start.choose")}
        featuredValues={HOMEPAGE_NATIONALITIES.map(toCitizenshipIso)}
        searchLabel={t("start.searchNationality")}
        value={nationality}
        onChange={(value) => { setNationality(value); localStorage.setItem("hero-from-country", value) }}
        options={CITIZENSHIP_OPTIONS.map((c) => ({ value: c.iso, iso: c.iso, label: arabic ? citizenshipLabelAr(c.iso) || c.name : c.name, keywords: [c.name, citizenshipLabelAr(c.iso)] }))}
      />
      <CountryPicker
        label={t("start.destination")}
        placeholder={t("start.choose")}
        searchLabel={t("start.searchDestination")}
        value={destination}
        onChange={(value) => { setDestination(value); localStorage.setItem("hero-to-country", value) }}
        options={SCHENGEN.map((c) => ({ value: c, iso: SCHENGEN_META[c].iso, label: arabic ? countryNameAr(c) : c, keywords: [c, countryNameAr(c)] }))}
      />
      <LocaleLink className="ez-start-button" href={`/apply${params.size ? `?${params}` : ""}`}>
        <span>{t("start.button")}</span>
        <ArrowRight size={18} className="rtl:rotate-180" aria-hidden="true" />
      </LocaleLink>
    </div>
  )
}
