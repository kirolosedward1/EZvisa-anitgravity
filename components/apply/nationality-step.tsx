"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { LangText } from "@/components/lang-text"
import { useMessage } from "@/components/use-message"
import { WizardBar } from "@/components/apply/wizard-bar"
import {
  ChoiceList,
  ChoiceRow,
  FieldError,
  WizardQuestion,
  wizardFieldClass,
  wizardLabelClass,
} from "@/components/apply/wizard-choices"
import { TravellerSelect } from "@/components/apply/traveller-select"
import { priceForTravellers } from "@/lib/currency"
import type { FormData, FormDataUpdate } from "@/lib/form-types"
import { TRAVELLER_NONE } from "@/lib/travellers-client"
import type { Traveller } from "@/lib/shared/wizard-contract"
import { cn } from "@/lib/utils"
import { isValidCalendarDate } from "@/lib/dates"
import { UserRound } from "lucide-react"
import { normalizePassport, toWesternDigits } from "@/lib/digits"

interface NationalityStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
  /** Signed-in customer's saved travellers (lib/travellers.ts). Empty or absent: the drop-down is not shown. */
  travellers?: Traveller[]
  /** A saved traveller was picked (null = "Someone else"). The page fills the form (lib/travellers-client.ts). */
  onPickTraveller?: (traveller: Traveller | null) => void
  /** Shown when the picked traveller's nationality replaced the one chosen on the destination step. */
  travellerNotice?: { nationality: string; nationalityAr?: string } | null
}

const fieldClass = cn(wizardFieldClass, "h-[52px]")

function isValidEmail(email: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) return false
  const parts = email.split("@")
  if (parts.length !== 2) return false
  const [localPart, domain] = parts
  if (!localPart || !domain.includes(".")) return false
  const invalidDomains = ["gmial.com", "yahooo.com", "hotmial.com", "gmai.com"]
  return !invalidDomains.includes(domain.toLowerCase())
}

function isValidPhone(phone: string) {
  const digitsOnly = toWesternDigits(phone).replace(/[^\d]/g, "")
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false
  if (/^(\d)\1+$/.test(digitsOnly)) return false
  if (digitsOnly.length >= 8) {
    const sequential = digitsOnly
      .split("")
      .every((digit, index, arr) => index === 0 || Number.parseInt(digit) === Number.parseInt(arr[index - 1]) + 1)
    if (sequential) return false
  }
  return true
}

/** The visible prefix is always +971. Digits are stored as "+971 5xxxxxxx". */
function localPhone(phone: string) {
  const trimmed = toWesternDigits(phone).trim()
  if (trimmed.startsWith("+971")) return trimmed.slice(4).replace(/[^\d]/g, "")
  return trimmed.replace(/[^\d]/g, "")
}

function composePhone(local: string) {
  const digits = toWesternDigits(local).replace(/[^\d]/g, "")
  return digits ? `+971 ${digits}` : ""
}

/** UAE numbers are usually written 050 123 4567 or pasted with 971 / 00971: keep only the national number after
 *  +971 ("+971 0501234567" is not a valid international number). Applied when the step is submitted. */
function nationalNumber(local: string) {
  let digits = toWesternDigits(local).replace(/[^\d]/g, "")
  if (digits.startsWith("00971")) digits = digits.slice(5)
  else if (digits.startsWith("971") && digits.length >= 11) digits = digits.slice(3)
  return digits.replace(/^0/, "")
}

/** Local calendar date (YYYY-MM-DD); toISOString() is UTC and is a day behind in the UAE before 04:00. */
function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function NationalityStep({ formData, updateFormData, onNext, onBack, isLoading, travellers = [], onPickTraveller, travellerNotice }: NationalityStepProps) {
  const [showErrors, setShowErrors] = useState(false)
  const [maxDob, setMaxDob] = useState("")
  const passportPlaceholder = useMessage("apply.passportPlaceholderN")
  const seeded = useRef(false)
  const dobDigits = useRef("")
  const withSpouse = formData.spouseAccompanying === "yes"
  const spousePrice = priceForTravellers("yes")
  const phone = composePhone(nationalNumber(localPhone(formData.phone || "")))

  useEffect(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 18)
    setMaxDob(localIso(date))
  }, [])

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const patch: FormDataUpdate = {}
    if (formData.passportNumber.trim() && formData.hasValidPassport !== "yes") patch.hasValidPassport = "yes"
    if (formData.spouseAccompanying !== "yes") {
      if (!formData.maritalStatus) patch.maritalStatus = "single"
      if (formData.spouseAccompanying !== "no") patch.spouseAccompanying = "no"
    }
    if (Object.keys(patch).length) updateFormData(patch)
  }, [formData.hasValidPassport, formData.maritalStatus, formData.passportNumber, formData.spouseAccompanying, updateFormData])

  const errors = {
    firstName: !formData.firstName.trim(),
    lastName: !formData.lastName.trim(),
    passport: !formData.passportNumber.trim(),
    phone: !phone || !isValidPhone(phone),
    email: !formData.email.trim() || !isValidEmail(formData.email.trim()),
    // The form is noValidate, so the input's max isn't enforced by the browser: check the date and 18+ here.
    dateOfBirth: !isValidCalendarDate(formData.dateOfBirth) || formData.dateOfBirth < "1900-01-01" || (!!maxDob && formData.dateOfBirth > maxDob),
  }
  const isFormValid = !Object.values(errors).some(Boolean)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isFormValid) {
      setShowErrors(true)
      requestAnimationFrame(() => {
        document.querySelector("[data-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
      return
    }
    if (phone !== formData.phone) updateFormData({ phone })
    onNext()
  }

  const set = (patch: FormDataUpdate) => {
    updateFormData(patch)
    setShowErrors(false)
  }

  const invalid = (key: keyof typeof errors) => (showErrors && errors[key] ? "true" : undefined)
  const invalidClass = (key: keyof typeof errors) =>
    showErrors && errors[key] ? "border-[#B83200] focus:border-[#B83200] focus:shadow-none" : ""

  return (
    <form onSubmit={handleSubmit} noValidate>
      <WizardQuestion
        title="Who is travelling?"
        titleAr="من المسافر؟"
        helper="Enter details exactly as they appear in your passport."
        helperAr="أدخل البيانات كما تظهر في جواز سفرك."
      />

      {travellers.length ? (
        <div className="mb-7">
          <TravellerSelect
            travellers={travellers}
            value={formData.travellerId ?? ""}
            onChange={(t) => {
              onPickTraveller?.(t)
              setShowErrors(false)
            }}
            helper={{
              en: "Pick a saved traveller to fill in the details below. You can still edit them.",
              ar: "اختر مسافرًا محفوظًا لتعبئة البيانات أدناه. يمكنك تعديلها لاحقًا.",
            }}
          />
          {formData.travellerId && formData.travellerId !== TRAVELLER_NONE ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary" role="status">
              <UserRound className="size-3.5" aria-hidden />
              <LangText en="Filled from your saved travellers" ar="تمت التعبئة من المسافرين المحفوظين" />
            </p>
          ) : null}
          {travellerNotice ? (
            <p className="mt-3 rounded-[10px] bg-secondary px-3 py-2 text-[13px] leading-5 text-[#3A4150]" role="status">
              <LangText
                en={`Nationality updated to ${travellerNotice.nationality} from the saved traveller.`}
                ar={`تم تحديث الجنسية إلى ${travellerNotice.nationalityAr || travellerNotice.nationality} من المسافر المحفوظ.`}
              />
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div data-invalid={invalid("firstName")} className="min-w-0">
          <label htmlFor="firstName" className={wizardLabelClass}>
            <LangText en="First name" ar="الاسم الأول" />
          </label>
          <input
            id="firstName"
            autoComplete="given-name"
            value={formData.firstName || ""}
            onChange={(event) => set({ firstName: event.target.value })}
            aria-invalid={invalid("firstName")}
            className={cn(fieldClass, invalidClass("firstName"))}
          />
          {showErrors && errors.firstName ? (
            <FieldError>
              <LangText en="Enter your first name." ar="أدخل الاسم الأول." />
            </FieldError>
          ) : null}
        </div>
        <div data-invalid={invalid("lastName")} className="min-w-0">
          <label htmlFor="lastName" className={wizardLabelClass}>
            <LangText en="Last name" ar="اسم العائلة" />
          </label>
          <input
            id="lastName"
            autoComplete="family-name"
            value={formData.lastName || ""}
            onChange={(event) => set({ lastName: event.target.value })}
            aria-invalid={invalid("lastName")}
            className={cn(fieldClass, invalidClass("lastName"))}
          />
          {showErrors && errors.lastName ? (
            <FieldError>
              <LangText en="Enter your last name." ar="أدخل اسم العائلة." />
            </FieldError>
          ) : null}
        </div>
      </div>

      <div className="mt-7" data-invalid={invalid("passport")}>
        <label htmlFor="passportNumber" className={wizardLabelClass}>
          <LangText en="Passport number" ar="رقم الجواز" />
        </label>
        <input
          id="passportNumber"
          value={formData.passportNumber || ""}
          onChange={(event) => {
            const passportNumber = normalizePassport(event.target.value)
            set({ passportNumber, hasValidPassport: passportNumber.trim() ? "yes" : undefined })
          }}
          inputMode="text"
          placeholder={passportPlaceholder}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={invalid("passport")}
          className={cn(fieldClass, "uppercase", invalidClass("passport"))}
        />
        {showErrors && errors.passport ? (
          <FieldError>
            <LangText en="Enter your passport number." ar="أدخل رقم الجواز." />
          </FieldError>
        ) : null}
      </div>

      <div className="mt-7" data-invalid={invalid("phone")}>
        <label htmlFor="phone" className={wizardLabelClass}>
          <LangText en="Phone" ar="الهاتف" />
        </label>
        <div
          className={cn(
            "flex h-[52px] items-center rounded-[10px] border border-[#E3E7EF] bg-[#FFFFFF] focus-within:border-[#0436DC] focus-within:shadow-[0_0_0_3px_rgba(4,54,220,0.12)]",
            showErrors && errors.phone && "border-[#B83200] focus-within:border-[#B83200] focus-within:shadow-none",
          )}
        >
          <span className="ps-4 text-[15px] text-[#0A0F1F]" dir="ltr">
            +971
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            dir="ltr"
            value={localPhone(formData.phone || "")}
            onChange={(event) => set({ phone: composePhone(event.target.value) })}
            placeholder="50 123 4567"
            aria-invalid={invalid("phone")}
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-[15px] text-[#0A0F1F] outline-none placeholder:text-[#5B6475]"
          />
        </div>
        {showErrors && errors.phone ? (
          <FieldError>
            <LangText
              en={phone ? "Enter a valid phone number." : "Enter your phone number."}
              ar={phone ? "أدخل رقم هاتف صحيحًا." : "أدخل رقم الهاتف."}
            />
          </FieldError>
        ) : null}
      </div>

      <div className="mt-7">
        <span id="travelling-with" className={wizardLabelClass}>
          <LangText en="Travelling with" ar="المسافرون" />
        </span>
        <ChoiceList label="Travelling with">
          <ChoiceRow
            indicator="radio"
            title="Just me"
            titleAr="أنا فقط"
            description="One applicant"
            descriptionAr="متقدم واحد"
            selected={!withSpouse}
            onSelect={() =>
              set({
                maritalStatus: "single",
                spouseAccompanying: "no",
                ...(formData.travelingWith === "spouse" ? { travelingWith: "alone" } : {}),
              })
            }
          />
          <ChoiceRow
            indicator="radio"
            title="With my spouse"
            titleAr="مع الزوج أو الزوجة"
            description={`Two applicants, ${spousePrice} AED. Spouse details after payment.`}
            descriptionAr={`متقدمان، ${spousePrice} درهم. بيانات الزوج أو الزوجة بعد الدفع.`}
            selected={withSpouse}
            onSelect={() => set({ maritalStatus: "married", spouseAccompanying: "yes", travelingWith: "spouse" })}
          />
        </ChoiceList>
      </div>

      {/* Saved on the application. The trip step does not ask for these. */}
      <div className="mt-7" data-invalid={invalid("email")}>
        <label htmlFor="email" className={wizardLabelClass}>
          <LangText en="Email" ar="البريد الإلكتروني" />
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={formData.email || ""}
          onChange={(event) => set({ email: event.target.value })}
          aria-invalid={invalid("email")}
          className={cn(fieldClass, invalidClass("email"))}
        />
        {showErrors && errors.email ? (
          <FieldError>
            <LangText
              en={formData.email.trim() ? "Enter a valid email address." : "Enter your email."}
              ar={formData.email.trim() ? "أدخل بريدًا إلكترونيًا صحيحًا." : "أدخل البريد الإلكتروني."}
            />
          </FieldError>
        ) : null}
      </div>

      <div className="mt-7" data-invalid={invalid("dateOfBirth")}>
        <label htmlFor="dateOfBirth" className={wizardLabelClass}>
          <LangText en="Date of birth" ar="تاريخ الميلاد" />
        </label>
        <input
          id="dateOfBirth"
          type="date"
          max={maxDob || undefined}
          value={formData.dateOfBirth || ""}
          onBeforeInput={(event) => {
            const data = event.nativeEvent.data
            if (!data || toWesternDigits(data) === data) return
            event.preventDefault()
            const digits = (dobDigits.current + toWesternDigits(data).replace(/\D/g, "")).slice(-8)
            dobDigits.current = digits
            if (digits.length === 8) {
              set({ dateOfBirth: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` })
              dobDigits.current = ""
            }
          }}
          onChange={(event) => {
            dobDigits.current = ""
            set({ dateOfBirth: toWesternDigits(event.target.value) })
          }}
          aria-invalid={invalid("dateOfBirth")}
          className={cn(fieldClass, invalidClass("dateOfBirth"))}
        />
        {showErrors && errors.dateOfBirth ? (
          <FieldError>
            {formData.dateOfBirth && maxDob && formData.dateOfBirth > maxDob ? (
              <LangText en="The main applicant must be 18 or older." ar="يجب أن يكون مقدم الطلب الرئيسي 18 عاماً أو أكثر." />
            ) : (
              <LangText en="Enter your date of birth." ar="أدخل تاريخ الميلاد." />
            )}
          </FieldError>
        ) : null}
      </div>

      <WizardBar
        onBack={onBack}
        loading={isLoading}
        continueLabel="Continue to Review & Pay"
        continueLabelAr="تابع إلى المراجعة والدفع"
        loadingLabel="Please wait"
        loadingLabelAr="لحظات"
      />
    </form>
  )
}
