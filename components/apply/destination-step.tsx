"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { CitizenshipPicker } from "@/components/citizenship-picker"
import { CountryFlag } from "@/components/country-flag"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"
import { useMessage } from "@/components/use-message"
import { WizardBar } from "@/components/apply/wizard-bar"
import { FieldError, WizardQuestion, wizardLabelClass } from "@/components/apply/wizard-choices"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SCHENGEN_COUNTRIES, SCHENGEN_META } from "@/lib/countries"
import type { FormData, FormDataUpdate } from "@/lib/form-types"
import { trackEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

interface DestinationStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  isLoading?: boolean
}

const pickerClass =
  "h-[52px] w-full justify-between rounded-[10px] border-[#E3E7EF] bg-[#FFFFFF] px-4 text-[15px] font-normal shadow-none hover:bg-[#FFFFFF]"
const invalidBorder = "border-[#B83200] focus:border-[#B83200] focus:shadow-none"

/**
 * Step 1 of the wizard: nationality and destination. Trip details (purpose, dates, hotel, budget) are asked after
 * payment on the Continue application page, like in the EZvisa app.
 */
export function DestinationStep({ formData, updateFormData, onNext, isLoading }: DestinationStepProps) {
  const [showErrors, setShowErrors] = useState(false)
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [touchKeyboard, setTouchKeyboard] = useState(false)
  const countrySearch = useMessage("apply.searchCountry")

  useEffect(() => {
    setTouchKeyboard(window.matchMedia("(pointer: coarse)").matches)
  }, [])

  const errors = { nationality: !formData.nationality, destination: !formData.destination }
  const valid = !errors.nationality && !errors.destination

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid) {
      setShowErrors(true)
      return
    }
    onNext()
  }

  const set = (patch: FormDataUpdate) => {
    updateFormData(patch)
    setShowErrors(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <WizardQuestion
        title="Where are you going?"
        titleAr="إلى أين تسافر؟"
        helper="Your nationality and destination decide which embassy handles your visa and what it asks for."
        helperAr="جنسيتك ووجهتك تحددان السفارة المختصة وما تطلبه من مستندات."
      />

      <div data-invalid={showErrors && errors.nationality ? "true" : undefined}>
        <span className={wizardLabelClass}>
          <LangText en="Your nationality" ar="جنسيتك" />
        </span>
        <CitizenshipPicker
          value={formData.nationality}
          placeholder="Select nationality"
          placeholderAr="اختر الجنسية"
          onChange={(iso) => {
            set({ nationality: iso })
            trackEvent("nationality_selected", { nationality: iso })
          }}
          className={cn(pickerClass, showErrors && errors.nationality && invalidBorder)}
        />
        {showErrors && errors.nationality ? (
          <FieldError>
            <LangText en="Choose your nationality." ar="اختر الجنسية." />
          </FieldError>
        ) : null}
      </div>

      <div className="mt-7" data-invalid={showErrors && errors.destination ? "true" : undefined}>
        <span className={wizardLabelClass}>
          <LangText en="Destination country" ar="دولة الوجهة" />
        </span>
        <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={destinationOpen}
              aria-invalid={showErrors && errors.destination ? "true" : undefined}
              className={cn(pickerClass, showErrors && errors.destination && invalidBorder)}
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
              <CommandInput placeholder={countrySearch} autoFocus={!touchKeyboard} />
              <CommandList>
                <CommandEmpty>
                  <Msg id="apply.noCountry" />
                </CommandEmpty>
                <CommandGroup>
                  {SCHENGEN_COUNTRIES.map((country) => (
                    <CommandItem
                      key={country}
                      value={`${country} ${SCHENGEN_META[country]?.ar ?? ""} ${SCHENGEN_META[country]?.iso ?? ""}`}
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
        <p className="mt-3 text-[13px] leading-relaxed text-[#5B6475]">
          <LangText
            en="You’ll add your trip dates and full travel plan after payment."
            ar="ستضيف تواريخ رحلتك وخطة السفر الكاملة بعد الدفع."
          />
        </p>
      </div>

      <WizardBar
        showBack={false}
        loading={isLoading}
        continueLabel="Continue"
        continueLabelAr="تابع"
        loadingLabel="Please wait"
        loadingLabelAr="لحظات"
      />
    </form>
  )
}
