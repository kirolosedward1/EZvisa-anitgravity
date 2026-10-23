"use client"

// After payment: the questions the wizard no longer asks, in the app's order (trip details, passport, spouse,
// employment). Each step saves to /api/continue-application before moving on, so nothing is lost if the
// customer leaves halfway.
import { useState } from "react"
import type React from "react"
import { useRouter } from "next/navigation"
import { TripDetailsStep } from "@/components/apply/trip-details-step"
import { SpouseStep } from "@/components/apply/spouse-step"
import { EmploymentStep } from "@/components/apply/employment-step"
import { WizardBar } from "@/components/apply/wizard-bar"
import { ChoiceList, ChoiceRow, FieldError, WizardQuestion, wizardFieldClass, wizardLabelClass } from "@/components/apply/wizard-choices"
import { LangText } from "@/components/lang-text"
import { normalizePassport } from "@/lib/digits"
import { cn } from "@/lib/utils"
import type { DetailStep } from "@/lib/application-status"
import type { FormData, FormDataUpdate } from "@/lib/form-types"

const STEP_LABEL: Record<DetailStep, { en: string; ar: string }> = {
  trip: { en: "Trip", ar: "الرحلة" },
  passport: { en: "Passport", ar: "الجواز" },
  spouse: { en: "Spouse", ar: "الزوج أو الزوجة" },
  employment: { en: "Employment", ar: "العمل" },
}

const EMPTY: Partial<FormData> = {
  purposeOfTrip: "",
  travelStartDate: "",
  travelEndDate: "",
  datesFlexible: "",
  travelMonth: "",
  tripLength: "",
  travelingWith: "",
  hotelCategory: "",
  fundingSource: "",
  balanceRange: "",
  isFirstSchengenVisa: "",
  previousRefusals: "",
  refusalDetails: "",
  additionalCountries: [],
  previousTravel: [],
  preferredCities: [],
  itinerary: "",
  passportNumber: "",
  spouseFirstName: "",
  spouseLastName: "",
  spouseOccupation: "",
  employmentStatus: "",
  jobTitle: "",
  companyName: "",
  employmentStartDate: "",
  monthlySalary: "",
  averageMonthlyIncome: "",
}

const TRIP_KEYS = [
  "purposeOfTrip", "travelStartDate", "travelEndDate", "datesFlexible", "travelMonth", "tripLength", "travelingWith",
  "hotelCategory", "fundingSource", "balanceRange", "isFirstSchengenVisa", "previousRefusals", "refusalDetails",
  "willVisitOtherCountries", "additionalCountries", "itinerary",
] as const
const SPOUSE_KEYS = ["spouseFirstName", "spouseLastName", "spouseHasValidPassport", "spouseOccupation"] as const
const EMPLOYMENT_KEYS = ["employmentStatus", "jobTitle", "companyName", "employmentStartDate", "monthlySalary", "hasNOC", "averageMonthlyIncome"] as const

function pick(form: Partial<FormData>, keys: readonly string[]) {
  const record = form as Record<string, unknown>
  return Object.fromEntries(keys.map((key) => [key, record[key] ?? ""]))
}

export function ContinueForm({
  applicationId,
  steps,
  uploadHref,
  initial,
}: {
  applicationId: string
  steps: DetailStep[]
  uploadHref: string
  /** Answers already on the application (from the wizard or the app), to pre-fill each step. */
  initial: Partial<FormData>
}) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [tripScreen, setTripScreen] = useState(0)
  const [form, setForm] = useState<Partial<FormData>>({ ...EMPTY, ...initial })
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [passportErrors, setPassportErrors] = useState(false)
  const step = steps[index]
  const last = index >= steps.length - 1
  const formData = form as FormData

  const update = (data: FormDataUpdate) => setForm((current) => ({ ...current, ...data }))

  const save = async (payload: Record<string, unknown>) => {
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/continue-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, ...payload }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || "Could not save these details. Please try again.")
        return
      }
      if (last) {
        router.push(uploadHref)
        router.refresh()
        return
      }
      setIndex((current) => current + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setError("You seem to be offline. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  const back = () => {
    setError("")
    if (index > 0) setIndex((current) => current - 1)
  }

  const nextLabel = last ? { en: "Save and upload documents", ar: "احفظ وارفع المستندات" } : { en: "Save and continue", ar: "احفظ وتابع" }

  const submitPassport = (event: React.FormEvent) => {
    event.preventDefault()
    const answered = form.hasValidPassport === "no" || (form.hasValidPassport === "yes" && (form.passportNumber ?? "").trim().length >= 5)
    if (!answered) {
      setPassportErrors(true)
      return
    }
    void save({ hasValidPassport: form.hasValidPassport, passportNumber: form.hasValidPassport === "yes" ? form.passportNumber : "" })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-28 md:pt-32">
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <LangText en="Payment confirmed" ar="تم تأكيد الدفع" />
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          <LangText en="Continue your application" ar="أكمل طلبك" />
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          <LangText
            en="A few more details for your visa file. Each step is saved as you go."
            ar="بعض التفاصيل الإضافية لملف التأشيرة. يُحفظ كل جزء أولًا بأول."
          />
        </p>
      </div>

      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-[#E3E7EF]">
        {steps.map((item, i) => (
          <span
            key={item}
            aria-current={i === index ? "step" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 pb-2 text-[13px] font-medium",
              i === index ? "border-[#0436DC] text-[#0A0F1F]" : i < index ? "border-transparent text-[#0A0F1F]" : "border-transparent text-[#5B6475]",
            )}
          >
            {String(i + 1).padStart(2, "0")} <LangText en={STEP_LABEL[item].en} ar={STEP_LABEL[item].ar} />
          </span>
        ))}
      </div>

      <div className="mt-8 w-full max-w-[560px]">
        {error ? (
          <p className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {step === "trip" ? (
          <TripDetailsStep
            formData={formData}
            updateFormData={update}
            onNext={() => void save(pick(form, TRIP_KEYS))}
            onBack={back}
            isLoading={pending}
            screen={tripScreen}
            onScreenChange={setTripScreen}
          />
        ) : null}

        {step === "passport" ? (
          <form onSubmit={submitPassport} noValidate>
            <WizardQuestion
              title="Do you have a valid passport?"
              titleAr="هل لديك جواز سفر ساري المفعول؟"
              helper="It should be valid for at least 3 months after you return."
              helperAr="يجب أن يكون صالحًا لمدة ٣ أشهر على الأقل بعد عودتك."
            />
            <ChoiceList label="Valid passport">
              <ChoiceRow
                title="Yes"
                titleAr="نعم"
                description="I'll enter the passport number."
                descriptionAr="سأدخل رقم الجواز."
                selected={form.hasValidPassport === "yes"}
                onSelect={() => { update({ hasValidPassport: "yes" }); setPassportErrors(false) }}
              />
              <ChoiceRow
                title="No"
                titleAr="لا"
                description="We'll guide you on renewing it first."
                descriptionAr="سنرشدك إلى تجديده أولًا."
                selected={form.hasValidPassport === "no"}
                onSelect={() => { update({ hasValidPassport: "no" }); setPassportErrors(false) }}
              />
            </ChoiceList>
            {form.hasValidPassport === "yes" ? (
              <div className="mt-6">
                <label htmlFor="passportNumber" className={wizardLabelClass}>
                  <LangText en="Passport number" ar="رقم الجواز" />
                </label>
                <input
                  id="passportNumber"
                  value={form.passportNumber || ""}
                  onChange={(event) => { update({ passportNumber: normalizePassport(event.target.value) }); setPassportErrors(false) }}
                  inputMode="text"
                  placeholder="e.g. N1234567"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className={cn(wizardFieldClass, "h-14 uppercase")}
                />
              </div>
            ) : null}
            {passportErrors ? (
              <FieldError>
                <LangText
                  en={form.hasValidPassport === "yes" ? "Enter your passport number." : "Choose Yes or No."}
                  ar={form.hasValidPassport === "yes" ? "أدخل رقم الجواز." : "اختر نعم أو لا."}
                />
              </FieldError>
            ) : null}
            <WizardBar
              onBack={index > 0 ? back : undefined}
              showBack={index > 0}
              loading={pending}
              continueLabel={nextLabel.en}
              continueLabelAr={nextLabel.ar}
              loadingLabel="Saving"
              loadingLabelAr="جارٍ الحفظ"
            />
          </form>
        ) : null}

        {step === "spouse" ? (
          <SpouseStep
            formData={formData}
            updateFormData={update}
            onNext={() => void save(pick(form, SPOUSE_KEYS))}
            onBack={back}
            isLoading={pending}
            continueLabel={nextLabel.en}
            continueLabelAr={nextLabel.ar}
          />
        ) : null}

        {step === "employment" ? (
          <EmploymentStep
            formData={formData}
            updateFormData={update}
            onNext={() => void save(pick(form, EMPLOYMENT_KEYS))}
            onBack={back}
            isLoading={pending}
            continueLabel={nextLabel.en}
            continueLabelAr={nextLabel.ar}
          />
        ) : null}
      </div>
    </div>
  )
}
