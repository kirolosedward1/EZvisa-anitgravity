"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { CitizenshipPicker } from "@/components/citizenship-picker"
import { CountryFlag } from "@/components/country-flag"
import { LangText } from "@/components/lang-text"
import { WizardBar } from "@/components/apply/wizard-bar"
import {
  ChoiceList,
  ChoiceRow,
  FieldError,
  WizardQuestion,
  wizardFieldClass,
  wizardLabelClass,
} from "@/components/apply/wizard-choices"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { priceForTravellers } from "@/lib/currency"
import { SCHENGEN_COUNTRIES, SCHENGEN_META } from "@/lib/countries"
import type { FormData, FormDataUpdate } from "@/lib/form-types"
import { trackEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

interface NationalityStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

const fieldClass = cn(wizardFieldClass, "h-[52px]")

function isValidEmail(email: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) return false
  const parts = email.split("@")
  if (parts.length !== 2) return false
  const [localPart, domain] = parts
  if (localPart.length < 2 || !domain.includes(".")) return false
  const invalidDomains = ["gmial.com", "yahooo.com", "hotmial.com", "gmai.com"]
  return !invalidDomains.includes(domain.toLowerCase())
}

function isValidPhone(phone: string) {
  const digitsOnly = phone.replace(/[^\d]/g, "")
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
  const trimmed = phone.trim()
  if (trimmed.startsWith("+971")) return trimmed.slice(4).replace(/[^\d]/g, "")
  return trimmed.replace(/[^\d]/g, "")
}

function composePhone(local: string) {
  const digits = local.replace(/[^\d]/g, "")
  return digits ? `+971 ${digits}` : ""
}

export function NationalityStep({ formData, updateFormData, onNext, onBack, isLoading }: NationalityStepProps) {
  const [showErrors, setShowErrors] = useState(false)
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [maxDob, setMaxDob] = useState("")
  const [touchKeyboard, setTouchKeyboard] = useState(false)
  const seeded = useRef(false)
  const withSpouse = formData.spouseAccompanying === "yes"
  const spousePrice = priceForTravellers("yes")
  const phone = composePhone(localPhone(formData.phone || ""))

  useEffect(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 18)
    setMaxDob(date.toISOString().slice(0, 10))
    setTouchKeyboard(window.matchMedia("(pointer: coarse)").matches)
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
    nationality: !formData.nationality,
    passport: !formData.passportNumber.trim(),
    phone: !phone || !isValidPhone(phone),
    email: !formData.email.trim() || !isValidEmail(formData.email.trim()),
    dateOfBirth: !formData.dateOfBirth,
    destination: !formData.destination,
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

      <div className="mt-7" data-invalid={invalid("nationality")}>
        <span className={wizardLabelClass}>
          <LangText en="Nationality" ar="الجنسية" />
        </span>
        <CitizenshipPicker
          value={formData.nationality}
          placeholder="Select nationality"
          placeholderAr="اختر الجنسية"
          onChange={(iso) => {
            set({ nationality: iso })
            trackEvent("nationality_selected", { nationality: iso })
          }}
          className={cn(
            "h-[52px] rounded-[10px] border-[#E3E7EF] bg-[#FFFFFF] px-4 text-[15px] font-normal shadow-none hover:bg-[#FFFFFF]",
            invalidClass("nationality"),
          )}
        />
        {showErrors && errors.nationality ? (
          <FieldError>
            <LangText en="Choose your nationality." ar="اختر الجنسية." />
          </FieldError>
        ) : null}
      </div>

      <div className="mt-7" data-invalid={invalid("passport")}>
        <label htmlFor="passportNumber" className={wizardLabelClass}>
          <LangText en="Passport number" ar="رقم الجواز" />
        </label>
        <input
          id="passportNumber"
          value={formData.passportNumber || ""}
          onChange={(event) => {
            const passportNumber = event.target.value.toUpperCase()
            set({ passportNumber, hasValidPassport: passportNumber.trim() ? "yes" : undefined })
          }}
          placeholder="e.g. N1234567"
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
            inputMode="tel"
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
            onSelect={() => set({ maritalStatus: "single", spouseAccompanying: "no" })}
          />
          <ChoiceRow
            indicator="radio"
            title="With my spouse"
            titleAr="مع الزوج أو الزوجة"
            description={`Two applicants, AED ${spousePrice}`}
            descriptionAr={`متقدمان، ${spousePrice} درهم`}
            selected={withSpouse}
            onSelect={() => set({ maritalStatus: "married", spouseAccompanying: "yes" })}
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
          onChange={(event) => set({ dateOfBirth: event.target.value })}
          aria-invalid={invalid("dateOfBirth")}
          className={cn(fieldClass, invalidClass("dateOfBirth"))}
        />
        {showErrors && errors.dateOfBirth ? (
          <FieldError>
            <LangText en="Enter your date of birth." ar="أدخل تاريخ الميلاد." />
          </FieldError>
        ) : null}
      </div>

      <div className="mt-7" data-invalid={invalid("destination")}>
        <span className={wizardLabelClass}>
          <LangText en="Destination" ar="الوجهة" />
        </span>
        <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={destinationOpen}
              aria-invalid={invalid("destination")}
              className={cn(
                "h-[52px] w-full justify-between rounded-[10px] border-[#E3E7EF] bg-[#FFFFFF] px-4 text-[15px] font-normal shadow-none hover:bg-[#FFFFFF]",
                invalidClass("destination"),
              )}
            >
              {formData.destination ? (
                <span className="flex min-w-0 items-center gap-2">
                  <CountryFlag iso={SCHENGEN_META[formData.destination]?.iso} title={formData.destination} />
                  <span className="truncate text-[#0A0F1F]">
                    <LangText en={formData.destination} ar={SCHENGEN_META[formData.destination]?.ar || formData.destination} />
                  </span>
                </span>
              ) : (
                <span className="font-normal text-[#5B6475]">
                  <LangText en="Select destination" ar="اختر الوجهة" />
                </span>
              )}
              <ChevronsUpDown className="ms-2 size-4 shrink-0 text-[#5B6475]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." autoFocus={!touchKeyboard} />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {SCHENGEN_COUNTRIES.map((country) => (
                    <CommandItem
                      key={country}
                      value={country}
                      onSelect={() => {
                        set({ destination: country })
                        setDestinationOpen(false)
                        trackEvent("destination_selected", { destination: country })
                      }}
                    >
                      <Check className={cn("me-2 size-4", formData.destination === country ? "opacity-100" : "opacity-0")} />
                      <span className="me-2">
                        <CountryFlag iso={SCHENGEN_META[country]?.iso} title={country} />
                      </span>
                      <LangText en={country} ar={SCHENGEN_META[country]?.ar || country} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {showErrors && errors.destination ? (
          <FieldError>
            <LangText en="Choose a destination." ar="اختر الوجهة." />
          </FieldError>
        ) : null}
      </div>

      <WizardBar
        onBack={onBack}
        loading={isLoading}
        continueLabel={withSpouse ? "Continue" : "Continue to Review & Pay"}
        continueLabelAr={withSpouse ? "تابع" : "تابع إلى المراجعة والدفع"}
        loadingLabel="Please wait"
        loadingLabelAr="لحظات"
      />
    </form>
  )
}
