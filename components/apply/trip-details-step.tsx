"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { BriefcaseBusiness, CircleEllipsis, GraduationCap, Plus, Stethoscope, TreePalm, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate } from "@/lib/form-types"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { ArabicDateText } from "@/components/arabic-date"
import { fixedDatesAccepted, formatDisplayDate, formatPageDate } from "@/lib/dates"
import { SCHENGEN_COUNTRIES, SCHENGEN_META } from "@/lib/countries"
import { TravelDatesField } from "@/components/apply/travel-dates-field"
import { WizardBar } from "@/components/apply/wizard-bar"
import { LangText } from "@/components/lang-text"
import { CountryFlag } from "@/components/country-flag"
import {
  ChoiceList,
  ChoiceRow,
  FieldError,
  WizardQuestion,
  wizardFieldClass,
  wizardLabelClass,
} from "@/components/apply/wizard-choices"

interface TripDetailsStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
  screen: number
  onScreenChange: (screen: number) => void
}

const purposes = [
  { value: "tourism", icon: TreePalm, en: "Tourism", ar: "سياحة", desc: "A holiday or a short visit.", descAr: "عطلة أو زيارة قصيرة." },
  { value: "business", icon: BriefcaseBusiness, en: "Business", ar: "عمل", desc: "Meetings or work travel.", descAr: "اجتماعات أو سفر عمل." },
  { value: "family", icon: Users, en: "Family visit", ar: "زيارة عائلية", desc: "Seeing family in Europe.", descAr: "زيارة العائلة في أوروبا." },
  { value: "medical", icon: Stethoscope, en: "Medical treatment", ar: "علاج", desc: "Care at a clinic or hospital.", descAr: "علاج في عيادة أو مستشفى." },
  { value: "education", icon: GraduationCap, en: "Education or training", ar: "دراسة أو تدريب", desc: "A course or a study trip.", descAr: "دورة أو رحلة دراسية." },
  { value: "other", icon: CircleEllipsis, en: "Other", ar: "سبب آخر", desc: "A reason not listed here.", descAr: "سبب غير موجود في القائمة." },
]

const companions = [
  { value: "alone", en: "Alone", ar: "بمفردي", desc: "Just you on this trip.", descAr: "أنت فقط في هذه الرحلة." },
  { value: "spouse", en: "With spouse", ar: "مع الزوج أو الزوجة", desc: "Your husband or wife is travelling too.", descAr: "الزوج أو الزوجة يسافر معك." },
  { value: "family", en: "With family", ar: "مع العائلة", desc: "Family members on the same trip.", descAr: "أفراد العائلة في الرحلة نفسها." },
  { value: "friends", en: "With friends", ar: "مع الأصدقاء", desc: "Friends travelling with you.", descAr: "أصدقاء يسافرون معك." },
  { value: "group", en: "With a tour group", ar: "مع مجموعة سياحية", desc: "An organised group tour.", descAr: "جولة مع مجموعة منظّمة." },
]

const hotels = [
  { value: "3-star", en: "3-star hotel", ar: "فندق 3 نجوم", desc: "A mid-range hotel.", descAr: "فندق متوسط." },
  { value: "4-star", en: "4-star hotel", ar: "فندق 4 نجوم", desc: "A premium hotel.", descAr: "فندق مميز." },
  { value: "5-star", en: "5-star hotel", ar: "فندق 5 نجوم", desc: "A luxury hotel.", descAr: "فندق فاخر." },
  { value: "sponsor", en: "Staying with a host", ar: "الإقامة عند مضيف", desc: "A sponsor's home.", descAr: "منزل الكفيل." },
]

const funding = [
  { value: "self", en: "Self-funded", ar: "على حسابي", desc: "Paid from your own savings.", descAr: "من مدخراتك." },
  { value: "sponsor", en: "Sponsored by family", ar: "كفالة عائلية", desc: "A relative is paying.", descAr: "أحد الأقارب يتحمّل التكلفة." },
  { value: "company", en: "Sponsored by an employer", ar: "كفالة جهة العمل", desc: "Your company is paying.", descAr: "شركتك تتحمّل التكلفة." },
]

const balances = [
  { value: "under-10000", en: "Under 10,000 AED", ar: "أقل من 10,000 درهم", desc: "Closing balance under 10,000.", descAr: "الرصيد الختامي أقل من 10,000." },
  { value: "10000-25000", en: "10,000 to 25,000 AED", ar: "من 10,000 إلى 25,000 درهم", desc: "A mid closing balance.", descAr: "رصيد ختامي متوسط." },
  { value: "25000-50000", en: "25,000 to 50,000 AED", ar: "من 25,000 إلى 50,000 درهم", desc: "A stronger closing balance.", descAr: "رصيد ختامي أعلى." },
  { value: "50000-plus", en: "50,000 AED or more", ar: "50,000 درهم أو أكثر", desc: "A high closing balance.", descAr: "رصيد ختامي مرتفع." },
]

const LAST_SCREEN = 9

function datesAreValid(formData: FormData) {
  const dates = fixedDatesAccepted(formData.travelStartDate, formData.travelEndDate)
  if (formData.datesFlexible === "yes") {
    return !!formData.travelMonth && !!formData.tripLength && dates
  }
  return formData.datesFlexible === "no" && dates
}

export function TripDetailsStep({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLoading,
  screen,
  onScreenChange,
}: TripDetailsStepProps) {
  const [direction, setDirection] = useState(1)
  const [showErrors, setShowErrors] = useState(false)
  const [refusalBlurred, setRefusalBlurred] = useState(false)
  const [ready, setReady] = useState(false)
  const [rtl, setRtl] = useState(false)
  const reduced = useReducedMotion()

  const [newCountry, setNewCountry] = useState("")
  const [newArrivalDate, setNewArrivalDate] = useState("")
  const [newDepartureDate, setNewDepartureDate] = useState("")
  const [dateError, setDateError] = useState("")

  const additionalCountries = formData.additionalCountries || []

  const skipScroll = useRef(true)

  useEffect(() => {
    setReady(true)
    setRtl(document.documentElement.dir === "rtl")
  }, [])

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false
      return
    }
    document.getElementById("wizard-form")?.scrollIntoView({ block: "start" })
  }, [screen])

  const go = (next: number) => {
    setShowErrors(false)
    setDirection(next > screen ? 1 : -1)
    onScreenChange(next)
  }

  const screenValid = () => {
    if (screen === 0) return !!formData.purposeOfTrip
    if (screen === 1) return datesAreValid(formData)
    if (screen === 2) return !!formData.travelingWith
    if (screen === 3) return !!formData.hotelCategory
    if (screen === 4) return !!formData.fundingSource
    if (screen === 5) return !!formData.balanceRange
    if (screen === 6) return !!formData.isFirstSchengenVisa
    if (screen === 7) return !!formData.previousRefusals && (formData.previousRefusals !== "yes" || !!formData.refusalDetails?.trim())
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!screenValid()) {
      setShowErrors(true)
      return
    }
    if (screen < LAST_SCREEN) {
      go(screen + 1)
      return
    }
    onNext()
  }

  const handleBack = () => {
    if (screen > 0) {
      go(screen - 1)
      return
    }
    onBack()
  }

  const select = (patch: FormDataUpdate) => {
    updateFormData(patch)
    setShowErrors(false)
  }

  const handleAddCountry = () => {
    if (!newCountry || !newArrivalDate || !newDepartureDate) return
    if (new Date(newDepartureDate) <= new Date(newArrivalDate)) {
      setDateError("order")
      return
    }
    if (additionalCountries.some((c) => c.country === newCountry)) {
      setDateError("duplicate")
      return
    }
    updateFormData({
      additionalCountries: [
        ...additionalCountries,
        { country: newCountry, arrivalDate: newArrivalDate, departureDate: newDepartureDate },
      ],
    })
    setNewCountry("")
    setNewArrivalDate("")
    setNewDepartureDate("")
    setDateError("")
  }

  const offset = (rtl ? -1 : 1) * direction * 12
  const enter = !ready ? false : reduced ? { opacity: 0 } : { opacity: 0, x: offset }
  const showRefusalError = (showErrors || refusalBlurred) && formData.previousRefusals === "yes" && !formData.refusalDetails?.trim()

  return (
    <form onSubmit={handleSubmit}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screen}
          initial={enter}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: offset * -1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {screen === 0 ? (
            <div>
              <WizardQuestion
                title="What is this trip for?"
                titleAr="ما الغرض من الرحلة؟"
                helper="Embassies use this as the reason for the visa."
                helperAr="تستخدم السفارات هذا السبب في طلب التأشيرة."
              />
              <ChoiceList label="Purpose of trip">
                {purposes.map((item) => (
                  <ChoiceRow
                    key={item.value}
                    title={item.en}
                    titleAr={item.ar}
                    description={item.desc}
                    descriptionAr={item.descAr}
                    icon={item.icon}
                    selected={formData.purposeOfTrip === item.value}
                    onSelect={() => select({ purposeOfTrip: item.value })}
                  />
                ))}
              </ChoiceList>
              {showErrors && !formData.purposeOfTrip ? (
                <FieldError>
                  <LangText en="Choose a purpose." ar="اختر الغرض من الرحلة." />
                </FieldError>
              ) : null}
            </div>
          ) : null}

          {screen === 1 ? (
            <div>
              <WizardQuestion
                title="When are you travelling?"
                titleAr="متى تسافر؟"
                helper="Pick a range, or a month if the dates can move."
                helperAr="اختر فترة، أو شهرًا إذا كانت المواعيد مرنة."
              />
              <TravelDatesField
                formData={formData}
                updateFormData={updateFormData}
                showErrors={showErrors}
                onClearErrors={() => setShowErrors(false)}
              />
            </div>
          ) : null}

          {screen === 2 ? (
            <div>
              <WizardQuestion
                title="Who is travelling with you?"
                titleAr="من يسافر معك؟"
                helper="This is who is on the trip with you."
                helperAr="من يرافقك في هذه الرحلة."
              />
              <ChoiceList label="Travel companions">
                {companions.map((item) => (
                  <ChoiceRow
                    key={item.value}
                    title={item.en}
                    titleAr={item.ar}
                    description={item.desc}
                    descriptionAr={item.descAr}
                    selected={formData.travelingWith === item.value}
                    onSelect={() =>
                      select(
                        item.value === "spouse"
                          ? { travelingWith: "spouse", maritalStatus: "married", spouseAccompanying: "yes" }
                          : {
                              travelingWith: item.value,
                              ...(formData.travelingWith === "spouse"
                                ? { spouseAccompanying: "no", maritalStatus: "single" }
                                : {}),
                            },
                      )
                    }
                  />
                ))}
              </ChoiceList>
              {showErrors && !formData.travelingWith ? (
                <FieldError>
                  <LangText en="Choose who is travelling with you." ar="اختر من يسافر معك." />
                </FieldError>
              ) : null}
            </div>
          ) : null}

          {screen === 3 ? (
            <div>
              <WizardQuestion
                title="Where will you stay?"
                titleAr="أين ستقيم؟"
                helper="We plan the accommodation around this."
                helperAr="نرتب الإقامة بناءً على هذا الاختيار."
              />
              <ChoiceList label="Accommodation">
                {hotels.map((item) => (
                  <ChoiceRow
                    key={item.value}
                    title={item.en}
                    titleAr={item.ar}
                    description={item.desc}
                    descriptionAr={item.descAr}
                    selected={formData.hotelCategory === item.value}
                    onSelect={() => select({ hotelCategory: item.value })}
                  />
                ))}
              </ChoiceList>
              {showErrors && !formData.hotelCategory ? (
                <FieldError>
                  <LangText en="Choose where you will stay." ar="اختر مكان الإقامة." />
                </FieldError>
              ) : null}
            </div>
          ) : null}

          {screen === 4 ? (
            <div>
              <WizardQuestion
                title="Who is paying for the trip?"
                titleAr="من يتحمّل تكلفة الرحلة؟"
                helper="This is the funding source on the application."
                helperAr="هذا مصدر تمويل الطلب."
              />
              <ChoiceList label="Funding source">
                {funding.map((item) => (
                  <ChoiceRow
                    key={item.value}
                    title={item.en}
                    titleAr={item.ar}
                    description={item.desc}
                    descriptionAr={item.descAr}
                    selected={formData.fundingSource === item.value}
                    onSelect={() => select({ fundingSource: item.value })}
                  />
                ))}
              </ChoiceList>
              {showErrors && !formData.fundingSource ? (
                <FieldError>
                  <LangText en="Choose who is paying for the trip." ar="اختر من يتحمّل التكلفة." />
                </FieldError>
              ) : null}
            </div>
          ) : null}

          {screen === 5 ? (
            <div>
              <WizardQuestion
                title="What is your approximate bank balance?"
                titleAr="ما رصيدك التقريبي في البنك؟"
                helper="An approximate range is enough."
                helperAr="يكفي نطاق تقريبي."
              />
              <ChoiceList label="Bank balance">
                {balances.map((item) => (
                  <ChoiceRow
                    key={item.value}
                    title={item.en}
                    titleAr={item.ar}
                    description={item.desc}
                    descriptionAr={item.descAr}
                    selected={formData.balanceRange === item.value}
                    onSelect={() => select({ balanceRange: item.value })}
                  />
                ))}
              </ChoiceList>
              {showErrors && !formData.balanceRange ? (
                <FieldError>
                  <LangText en="Choose a balance range." ar="اختر نطاق الرصيد." />
                </FieldError>
              ) : null}
            </div>
          ) : null}

          {screen === 6 ? (
            <div>
              <WizardQuestion
                title="Is this your first Schengen visa?"
                titleAr="هل هذه أول تأشيرة شنغن لك؟"
                helper="A previous visa can strengthen an application."
                helperAr="تأشيرة سابقة قد تدعم الطلب."
              />
              <ChoiceList label="First Schengen visa">
                <ChoiceRow
                  title="Yes"
                  titleAr="نعم"
                  description="This is my first Schengen visa."
                  descriptionAr="هذه أول تأشيرة شنغن لي."
                  selected={formData.isFirstSchengenVisa === "yes"}
                  onSelect={() => select({ isFirstSchengenVisa: "yes" })}
                />
                <ChoiceRow
                  title="No"
                  titleAr="لا"
                  description="I have held a Schengen visa before."
                  descriptionAr="حصلت على تأشيرة شنغن من قبل."
                  selected={formData.isFirstSchengenVisa === "no"}
                  onSelect={() => select({ isFirstSchengenVisa: "no" })}
                />
              </ChoiceList>
              {showErrors && !formData.isFirstSchengenVisa ? (
                <FieldError>
                  <LangText en="Choose yes or no." ar="اختر نعم أو لا." />
                </FieldError>
              ) : null}
            </div>
          ) : null}

          {screen === 7 ? (
            <div>
              <WizardQuestion
                title="Have you had a visa refusal?"
                titleAr="هل رُفض لك طلب تأشيرة من قبل؟"
                helper="A refusal does not stop the application."
                helperAr="الرفض السابق لا يمنع تقديم الطلب."
              />
              <ChoiceList label="Visa refusal">
                <ChoiceRow
                  title="Yes"
                  titleAr="نعم"
                  description="I have had a visa refused."
                  descriptionAr="رُفض لي طلب تأشيرة."
                  selected={formData.previousRefusals === "yes"}
                  onSelect={() => select({ previousRefusals: "yes" })}
                />
                <ChoiceRow
                  title="No"
                  titleAr="لا"
                  description="I have not had a visa refused."
                  descriptionAr="لم يُرفض لي طلب تأشيرة."
                  selected={formData.previousRefusals === "no"}
                  onSelect={() => {
                    select({ previousRefusals: "no", refusalDetails: "" })
                    setRefusalBlurred(false)
                  }}
                />
              </ChoiceList>
              {showErrors && !formData.previousRefusals ? (
                <FieldError>
                  <LangText en="Choose yes or no." ar="اختر نعم أو لا." />
                </FieldError>
              ) : null}
              {formData.previousRefusals === "yes" ? (
                <div className="mt-6 border-t border-[#E3E7EF] pt-6">
                  <label htmlFor="refusalDetails" className={wizardLabelClass}>
                    <LangText en="Refusal details" ar="تفاصيل الرفض" />
                  </label>
                  <textarea
                    id="refusalDetails"
                    value={formData.refusalDetails || ""}
                    onChange={(e) => select({ refusalDetails: e.target.value })}
                    onBlur={() => setRefusalBlurred(true)}
                    placeholder="Country, date, and the reason on the letter."
                    rows={4}
                    className={cn(wizardFieldClass, "min-h-28 py-3", showRefusalError && "border-[#B83200]")}
                  />
                  {showRefusalError ? (
                    <FieldError>
                      <LangText en="Add a short note about the refusal." ar="أضف ملاحظة قصيرة عن الرفض." />
                    </FieldError>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {screen === 8 ? (
            <div>
              <WizardQuestion
                title="Will you visit other Schengen countries?"
                titleAr="هل ستزور دول شنغن أخرى؟"
                helper="Add each extra country with the days you will be there."
                helperAr="أضف كل دولة إضافية مع أيام وجودك فيها."
              />
              <ChoiceList label="Other Schengen countries">
                <ChoiceRow
                  title="Yes"
                  titleAr="نعم"
                  description="I will visit more than one country."
                  descriptionAr="سأزور أكثر من دولة."
                  selected={formData.willVisitOtherCountries === "yes"}
                  onSelect={() => select({ willVisitOtherCountries: "yes" })}
                />
                <ChoiceRow
                  title="No"
                  titleAr="لا"
                  description="I will stay in one country."
                  descriptionAr="سأبقى في دولة واحدة."
                  selected={formData.willVisitOtherCountries === "no"}
                  onSelect={() => select({ willVisitOtherCountries: "no", additionalCountries: [] })}
                />
              </ChoiceList>

              {formData.willVisitOtherCountries === "yes" ? (
                <div className="mt-6 space-y-4 border-t border-[#E3E7EF] pt-6">
                  <ChoiceList label="Country to add">
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {SCHENGEN_COUNTRIES.filter(
                        (country) => country !== formData.destination && !additionalCountries.some((c) => c.country === country),
                      ).map((country) => (
                        <ChoiceRow
                          key={country}
                          title={country}
                          titleAr={SCHENGEN_META[country]?.ar || country}
                          description="Add this stop to the itinerary."
                          descriptionAr="أضف هذه المحطة إلى خط السير."
                          leading={<CountryFlag iso={SCHENGEN_META[country]?.iso} country={country} className="size-7" />}
                          selected={newCountry === country}
                          onSelect={() => {
                            setNewCountry(country)
                            setDateError("")
                          }}
                        />
                      ))}
                    </div>
                  </ChoiceList>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="arrivalDate" className={wizardLabelClass}>
                        <LangText en="Arrival" ar="الوصول" />
                      </label>
                      <CustomDatePicker
                        id="arrivalDate"
                        placeholder="Select date"
                        disabled={!newCountry}
                        min={formData.travelStartDate || undefined}
                        max={formData.travelEndDate || undefined}
                        value={newArrivalDate}
                        onChange={(value) => {
                          setNewArrivalDate(value)
                          setDateError("")
                          if (newDepartureDate && value && newDepartureDate <= value) setNewDepartureDate("")
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="departureDate" className={wizardLabelClass}>
                        <LangText en="Departure" ar="المغادرة" />
                      </label>
                      <CustomDatePicker
                        id="departureDate"
                        placeholder="Select date"
                        disabled={!newCountry || !newArrivalDate}
                        min={newArrivalDate || undefined}
                        max={formData.travelEndDate || undefined}
                        value={newDepartureDate}
                        onChange={(value) => {
                          setNewDepartureDate(value)
                          setDateError("")
                        }}
                      />
                    </div>
                  </div>
                  {dateError === "order" ? (
                    <FieldError>
                      <LangText en="Departure has to be after arrival." ar="يجب أن تكون المغادرة بعد الوصول." />
                    </FieldError>
                  ) : null}
                  {dateError === "duplicate" ? (
                    <FieldError>
                      <LangText en="That country is already on the itinerary." ar="هذه الدولة مضافة إلى خط السير." />
                    </FieldError>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleAddCountry}
                    disabled={!newCountry || !newArrivalDate || !newDepartureDate}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E3E7EF] text-[15px] font-medium text-[#0A0F1F] disabled:opacity-50"
                  >
                    <Plus className="size-4" aria-hidden />
                    <LangText en="Add country" ar="أضف الدولة" />
                  </button>
                  {additionalCountries.length > 0 ? (
                    <ul className="divide-y divide-[#E3E7EF] border-y border-[#E3E7EF]">
                      {additionalCountries.map((visit) => (
                        <li key={visit.country} className="flex items-center justify-between gap-3 py-3">
                          <CountryFlag iso={SCHENGEN_META[visit.country]?.iso} country={visit.country} className="size-7" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium text-[#0A0F1F]">
                              <LangText en={visit.country} ar={SCHENGEN_META[visit.country]?.ar || visit.country} />
                            </p>
                            <p className="text-[13px] text-[#5B6475]">
                              <span className="rtl:hidden" dir="ltr">
                                {formatDisplayDate(visit.arrivalDate)} – {formatDisplayDate(visit.departureDate)}
                              </span>
                              <span className="hidden rtl:inline">
                                <ArabicDateText text={formatPageDate(visit.arrivalDate, true)} />
                                {" – "}
                                <ArabicDateText text={formatPageDate(visit.departureDate, true)} />
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateFormData({
                                additionalCountries: additionalCountries.filter((c) => c.country !== visit.country),
                              })
                            }
                            className="grid size-10 shrink-0 place-items-center text-[#5B6475]"
                          >
                            <X className="size-4" aria-hidden />
                            <span className="sr-only">
                              <LangText en={`Remove ${visit.country}`} ar={`حذف ${SCHENGEN_META[visit.country]?.ar || visit.country}`} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {screen === 9 ? (
            <div>
              <WizardQuestion
                title="Anything else about the plan?"
                titleAr="هل هناك تفاصيل أخرى عن الخطة؟"
                helper="Optional. A short plan helps us draft your letter."
                helperAr="اختياري. خطة قصيرة تساعدنا في صياغة الخطاب."
              />
              <label htmlFor="itinerary" className={wizardLabelClass}>
                <LangText en="Travel plan" ar="خطة السفر" />
              </label>
              <textarea
                id="itinerary"
                value={formData.itinerary || ""}
                onChange={(e) => updateFormData({ itinerary: e.target.value })}
                placeholder="Paris for three days, then Rome."
                rows={5}
                className={cn(wizardFieldClass, "min-h-32 py-3")}
              />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <WizardBar
        onBack={screen > 0 ? handleBack : undefined}
        showBack={screen > 0}
        loading={isLoading}
        continueLabel="Continue"
        continueLabelAr="تابع"
        loadingLabel="Processing..."
        loadingLabelAr="جارٍ المعالجة..."
      />
    </form>
  )
}
