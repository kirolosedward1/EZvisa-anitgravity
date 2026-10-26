"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { LocaleLink, useLocalizedHref } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { WizardBar } from "@/components/apply/wizard-bar"
import { wizardFieldClass, wizardLabelClass } from "@/components/apply/wizard-choices"
import { VisaCentrePlace } from "@/components/visa-centre-place"
import { validateAppointmentSlot } from "@/lib/appointment"
import { todayIsoUae } from "@/lib/dates"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"
import { appointmentCentreOptions } from "@/lib/visa-centres"

type Screen = "question" | "when" | "later"
type Choice = "has_one" | "not_yet"

const ERROR_KEY: Record<string, CustomerKey> = {
  past_date: "appt.past",
  invalid_date: "appt.invalid",
  centre: "appt.centre",
  not_downloaded: "appt.downloadStep",
  unpaid: "status.paymentDue",
}

export function AppointmentForm({
  applicationId,
  destination,
  dossierHref,
  initialScreen,
}: {
  applicationId: string
  destination: string
  dossierHref: string
  initialScreen: Screen
}) {
  const locale = useSiteLocale()
  const t = (key: CustomerKey) => customerText(locale, key)
  const router = useRouter()
  const localize = useLocalizedHref()
  const options = appointmentCentreOptions(destination)
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [centreId, setCentreId] = useState(options.length ? "" : "other")
  const [customCentre, setCustomCentre] = useState("")
  const [customAddress, setCustomAddress] = useState("")
  const [reference, setReference] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const selected = options.find((item) => item.id === centreId)
  const centre = centreId === "other" ? customCentre.trim() : selected?.centre || ""
  const address = centreId === "other" ? customAddress.trim() : selected?.address || ""

  async function save(body: Record<string, string>) {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, ...body }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
      if (!res.ok) {
        const key = data.code ? ERROR_KEY[data.code] : undefined
        setError(key ? customerText(locale, key) : data.error || t("appt.invalid"))
        setLoading(false)
        return
      }
      router.push(localize(`/dashboard?id=${applicationId}`))
      router.refresh()
    } catch {
      setError(t("appt.invalid"))
      setLoading(false)
    }
  }

  function onContinue() {
    if (screen === "question") {
      if (choice === "has_one") setScreen("when")
      if (choice === "not_yet") setScreen("later")
      return
    }
    const slot = validateAppointmentSlot(date, time)
    if (slot === "past_date") {
      setError(t("appt.past"))
      return
    }
    if (slot) {
      setError(t("appt.invalid"))
      return
    }
    if (!centre) {
      setError(t("appt.centre"))
      return
    }
    void save({ action: "has_one", date, time, centre, address, reference })
  }

  const continueDisabled =
    loading ||
    (screen === "question" && !choice) ||
    (screen === "when" && (!date || !time || !centre))

  return (
    <div className="bg-[#FFFFFF] text-[#0A0F1F]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-[var(--site-header-height)]">
        <nav className="flex gap-6 overflow-x-auto border-b border-[#E3E7EF]" aria-label={t("step.progress")}>
          <LocaleLink href={dossierHref} className="whitespace-nowrap border-b-2 border-transparent pb-2 text-[13px] font-medium text-[#5B6475]">
            <span className="tabular-nums">01</span> {t("appt.downloadStep")}
          </LocaleLink>
          <span aria-current="step" className="whitespace-nowrap border-b-2 border-[#0436DC] pb-2 text-[13px] font-medium text-[#0A0F1F]">
            <span className="tabular-nums">02</span> {t("step.appointment")}
          </span>
        </nav>

        <div className="mt-8 w-full max-w-[560px]">
          {screen === "question" ? (
            <>
              <h1 className="wizard-question text-[#0A0F1F]">{t("appt.question")}</h1>
              <div role="radiogroup" aria-label={t("appt.question")} className="mt-6 flex flex-col gap-3">
                <ChoiceCard title={t("appt.yes")} selected={choice === "has_one"} onSelect={() => setChoice("has_one")} />
                <ChoiceCard title={t("appt.notYet")} selected={choice === "not_yet"} onSelect={() => setChoice("not_yet")} />
              </div>
            </>
          ) : null}

          {screen === "when" ? (
            <>
              <h1 className="wizard-question text-[#0A0F1F]">{t("appt.when")}</h1>
              <div className="mt-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={wizardLabelClass}>{t("appt.date")}</span>
                    <input
                      type="date"
                      required
                      min={todayIsoUae()}
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className={cn(wizardFieldClass, "h-[52px]")}
                    />
                  </label>
                  <label className="block">
                    <span className={wizardLabelClass}>{t("appt.time")}</span>
                    <input
                      type="time"
                      required
                      step={60}
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className={cn(wizardFieldClass, "h-[52px]")}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={wizardLabelClass}>{t("appt.centre")}</span>
                  {options.length ? (
                    <select
                      value={centreId}
                      onChange={(event) => setCentreId(event.target.value)}
                      className={cn(wizardFieldClass, "h-[52px]")}
                    >
                      <option value="">{t("appt.centre")}</option>
                      {options.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.centre}
                        </option>
                      ))}
                      <option value="other">{t("appt.other")}</option>
                    </select>
                  ) : null}
                  {centreId === "other" ? (
                    <input
                      value={customCentre}
                      onChange={(event) => setCustomCentre(event.target.value)}
                      className={cn(wizardFieldClass, "mt-3 h-[52px]", !options.length && "mt-0")}
                    />
                  ) : null}
                </label>
                {centreId === "other" ? (
                  <label className="block">
                    <span className={wizardLabelClass}>
                      {t("appt.address")} <span className="font-normal text-[#5B6475]">({t("appt.optional")})</span>
                    </span>
                    <input
                      value={customAddress}
                      onChange={(event) => setCustomAddress(event.target.value)}
                      className={cn(wizardFieldClass, "h-[52px]")}
                    />
                  </label>
                ) : null}
                {centre ? (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3">
                    <VisaCentrePlace centre={centre} address={address} locale={locale} />
                  </div>
                ) : null}
                <label className="block">
                  <span className={wizardLabelClass}>
                    {t("appt.reference")} <span className="font-normal text-[#5B6475]">({t("appt.optional")})</span>
                  </span>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    className={cn(wizardFieldClass, "h-[52px]")}
                  />
                </label>
              </div>
            </>
          ) : null}

          {screen === "later" ? (
            <>
              <h1 className="wizard-question text-[#0A0F1F]">{t("appt.notYet")}</h1>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void save({ action: "help_requested" })}
                  className="w-full rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-5 text-start disabled:opacity-50"
                >
                  <span className="block text-base font-semibold text-[#0A0F1F]">{t("appt.helpTitle")}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[#5B6475]">{t("appt.helpLine")}</span>
                  <span className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground sm:w-auto">
                    {t("appt.requestHelp")}
                    <ArrowRight className="size-6 rounded-full bg-primary-foreground p-[5px] text-primary" />
                  </span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void save({ action: "later" })}
                  className="flex min-h-16 w-full items-center rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-5 text-start text-base font-semibold text-[#0A0F1F] disabled:opacity-50"
                >
                  {t("appt.later")}
                </button>
              </div>
            </>
          ) : null}

          {error ? <p className="mt-3 text-sm text-[#B83200]">{error}</p> : null}
        </div>
      </div>
      <WizardBar
        onBack={() => {
          if (screen === "question") router.push(localize(dossierHref))
          else {
            setError("")
            setScreen("question")
          }
        }}
        showContinue={screen !== "later"}
        continueType="button"
        onContinue={onContinue}
        disabled={continueDisabled}
        loading={loading}
        arrow
        continueLabel={customerText("en", "appt.continue")}
        continueLabelAr={customerText("ar", "appt.continue")}
      />
    </div>
  )
}

function ChoiceCard({ title, selected, onSelect }: { title: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-20 w-full items-center rounded-2xl bg-[#FFFFFF] px-5 py-5 text-start text-base font-semibold text-[#0A0F1F]",
        selected ? "border-2 border-[#0436DC]" : "border border-[#E5E7EB]",
      )}
    >
      {title}
    </button>
  )
}
