"use client"

// Step 1: Personal Information. Fields, order, option lists and validation come from the website ↔ app contract
// (lib/shared/wizard-contract.ts), so the app's wizard (mobile/lib/questions.ts) asks exactly the same things.
// The passport NUMBER is asked after payment ("Continue application"); validity and expiry are asked here.
import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Info, Loader2, ArrowLeft } from "lucide-react"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CountryFlag } from "@/components/apply/country-flag"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate } from "@/lib/form-types"
import { trackEvent } from "@/lib/analytics"
import {
  SCHENGEN, UAE_NATIONALITIES, SCHENGEN_VISA_REQUIRED, OTHER_NATIONALITY, DEFAULT_RESIDENCE, UAE_EMIRATES, MARITAL,
  validatePersonal, adultMax, iso, type Errors,
} from "@/lib/shared/wizard-contract"

interface NationalityStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  isLoading?: boolean
}

// Shared style constants
const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 md:backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none shadow-sm"
const selectStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 md:backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none pr-10 shadow-sm"
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActiveStyles =
  "h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer border border-transparent scale-[1.01]"
const toggleInactiveStyles =
  "h-12 rounded-xl font-medium text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground hover:border-border flex items-center justify-center cursor-pointer"
const errorStyles = "border-destructive bg-destructive/5 focus:ring-destructive/10"

const ALL_NATIONALITIES = [...SCHENGEN_VISA_REQUIRED].sort((a, b) => a.localeCompare(b))

export function NationalityStep({ formData, updateFormData, onNext, isLoading }: NationalityStepProps) {
  const [nationalityOpen, setNationalityOpen] = useState(false)
  const [showAllNationalities, setShowAllNationalities] = useState(false)
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || "ontouchstart" in window)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const errors: Errors = useMemo(() => validatePersonal(formData), [formData])
  const isFormValid = Object.keys(errors).length === 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      setShowErrors(true)
      // Auto-scroll to the first field with an error
      setTimeout(() => {
        const firstError = document.querySelector(".border-destructive")
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
      return
    }
    onNext()
  }

  const set = (data: FormDataUpdate) => {
    updateFormData(data)
    setShowErrors(false)
  }
  const errorClass = (field: keyof FormData) => (showErrors && errors[field] ? errorStyles : "")
  const errorText = (field: keyof FormData) =>
    showErrors && errors[field] ? (
      <p className="text-xs text-red-600 mt-1" role="alert">
        {errors[field]}
      </p>
    ) : null

  const nationalityList = showAllNationalities ? ALL_NATIONALITIES : UAE_NATIONALITIES

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        This information helps us tailor your cover letter and strengthen your return-to-home justification.
      </p>

      {showErrors && !isFormValid && (
        <div
          className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-foreground text-sm"
          role="alert"
          aria-live="polite"
        >
          <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{Object.values(errors)[0] ?? "Please fill in all required fields before continuing."}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Destination Country (Schengen) */}
        <div>
          <label className={labelStyles}>Destination Country (Schengen) *</label>
          <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={destinationOpen}
                className={cn(inputStyles, "w-full justify-between font-medium", errorClass("destination"))}
              >
                {formData.destination ? (
                  <div className="flex items-center gap-2">
                    <CountryFlag country={formData.destination} />
                    <span className="font-medium text-foreground">{formData.destination}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">Select destination country</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-1 bg-popover/95 md:backdrop-blur-md border border-border/80 shadow-2xl rounded-xl">
              <Command>
                <CommandInput placeholder="Search country..." autoFocus={!isMobile} className="border-none focus:ring-0" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {SCHENGEN.map((country) => (
                      <CommandItem
                        key={country}
                        value={country}
                        className="rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                        onSelect={() => {
                          set({ destination: country })
                          setDestinationOpen(false)
                          trackEvent("destination_selected", { destination: country })
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4 text-blue-600", formData.destination === country ? "opacity-100" : "opacity-0")} />
                        <CountryFlag country={country} className="mr-2" />
                        <span className="text-foreground">{country}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errorText("destination")}
        </div>

        {/* Nationality: the top UAE resident nationalities, then "Other nationality" opens the full visa-required list */}
        <div>
          <label className={labelStyles}>Nationality *</label>
          <Popover
            open={nationalityOpen}
            onOpenChange={(open) => {
              setNationalityOpen(open)
              if (!open) setShowAllNationalities(false)
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={nationalityOpen}
                className={cn(inputStyles, "w-full justify-between font-medium", errorClass("nationality"))}
              >
                {formData.nationality ? (
                  <div className="flex items-center gap-2">
                    <CountryFlag country={formData.nationality} />
                    <span className="font-medium text-foreground">{formData.nationality}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">Select nationality</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-1 bg-popover/95 md:backdrop-blur-md border border-border/80 shadow-2xl rounded-xl">
              <Command>
                <CommandInput placeholder="Search nationality..." autoFocus={!isMobile} className="border-none focus:ring-0" />
                <CommandList>
                  <CommandEmpty>No nationality found.</CommandEmpty>
                  <CommandGroup>
                    {showAllNationalities && (
                      <CommandItem
                        value="Back to common nationalities"
                        className="rounded-lg text-primary font-medium cursor-pointer"
                        onSelect={() => setShowAllNationalities(false)}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to common nationalities
                      </CommandItem>
                    )}
                    {nationalityList.map((country) => (
                      <CommandItem
                        key={country}
                        value={country}
                        className="rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                        onSelect={() => {
                          if (country === OTHER_NATIONALITY) {
                            setShowAllNationalities(true)
                            return
                          }
                          set({ nationality: country })
                          setNationalityOpen(false)
                          setShowAllNationalities(false)
                          trackEvent("nationality_selected", { nationality: country })
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4 text-blue-600", formData.nationality === country ? "opacity-100" : "opacity-0")} />
                        {country === OTHER_NATIONALITY ? (
                          <span className="text-primary font-medium">{country}</span>
                        ) : (
                          <>
                            <CountryFlag country={country} className="mr-2" />
                            <span className="text-foreground">{country}</span>
                          </>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errorText("nationality")}
          <p className="text-xs text-muted-foreground mt-1.5">Only nationalities that need a Schengen visa are listed.</p>
        </div>

        {/* Country of Residence (UAE only, from the shared contract) */}
        <div>
          <span className={labelStyles}>Country of Residence *</span>
          <div className={cn(inputStyles, "w-full flex items-center gap-2 font-medium")} aria-label={`Country of Residence: ${DEFAULT_RESIDENCE}`}>
            <CountryFlag country={DEFAULT_RESIDENCE} />
            <span className="font-medium text-foreground">{formData.countryOfResidence || DEFAULT_RESIDENCE}</span>
          </div>
        </div>

        {/* City of Residence = emirate */}
        <div>
          <label htmlFor="cityOfResidence" className={labelStyles}>
            City of Residence *
          </label>
          <select
            id="cityOfResidence"
            value={formData.cityOfResidence || ""}
            onChange={(e) => set({ cityOfResidence: e.target.value })}
            required
            className={cn(selectStyles, "w-full", errorClass("cityOfResidence"), !formData.cityOfResidence && "text-muted-foreground/60")}
          >
            <option value="" disabled>Select emirate</option>
            {UAE_EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {errorText("cityOfResidence")}
        </div>

        {/* Emirates ID - Next to City of Residence */}
        {formData.countryOfResidence === "United Arab Emirates" && (
          <div>
            <label className={labelStyles}>Do you have an Emirates ID? *</label>
            <div className="flex gap-3 mt-1">
              <button type="button" className={cn("flex-1", formData.hasEmiratesId === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ hasEmiratesId: "yes" })}>
                Yes
              </button>
              <button type="button" className={cn("flex-1", formData.hasEmiratesId === "no" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ hasEmiratesId: "no" })}>
                No
              </button>
            </div>
            {errorText("hasEmiratesId")}
          </div>
        )}

        {/* Divider */}
        <div className="md:col-span-2 my-2">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* First Name */}
        <div>
          <label htmlFor="firstName" className={labelStyles}>
            First Name *
          </label>
          <input
            id="firstName"
            autoComplete="given-name"
            value={formData.firstName || ""}
            onChange={(e) => set({ firstName: e.target.value })}
            placeholder="Enter first name"
            required
            className={cn(inputStyles, "w-full", errorClass("firstName"))}
          />
          <p className="text-xs text-muted-foreground mt-1.5">As on your passport.</p>
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className={labelStyles}>
            Last Name *
          </label>
          <input
            id="lastName"
            autoComplete="family-name"
            value={formData.lastName || ""}
            onChange={(e) => set({ lastName: e.target.value })}
            placeholder="Enter last name"
            required
            className={cn(inputStyles, "w-full", errorClass("lastName"))}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelStyles}>
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={formData.email || ""}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="your.email@example.com"
            required
            className={cn(inputStyles, "w-full", errorClass("email"))}
          />
          {errorText("email")}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelStyles}>
            Phone Number *
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formData.phone || ""}
            onChange={(e) => set({ phone: e.target.value.replace(/[^\d+\-() ]/g, "") })}
            placeholder="+971 50 123 4567"
            required
            aria-required="true"
            aria-invalid={showErrors && !!errors.phone}
            aria-describedby={showErrors && errors.phone ? "phone-error" : undefined}
            className={cn(inputStyles, "w-full", errorClass("phone"))}
          />
          {showErrors && errors.phone && (
            <p id="phone-error" className="text-xs text-red-600 mt-1" role="alert">
              {errors.phone}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="whatsappOptIn"
              checked={formData.whatsappOptIn !== false}
              onChange={(e) => updateFormData({ whatsappOptIn: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-[#25D366]"
            />
            <label htmlFor="whatsappOptIn" className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer select-none">
              <svg className="w-3.5 h-3.5 text-[#25D366] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span>Receive application updates via WhatsApp</span>
            </label>
          </div>
        </div>

        {/* Date of Birth (18+) */}
        <div>
          <label htmlFor="dateOfBirth" className={labelStyles}>
            Date of Birth *
          </label>
          <input
            id="dateOfBirth"
            type="date"
            max={iso(adultMax())}
            value={formData.dateOfBirth || ""}
            onChange={(e) => set({ dateOfBirth: e.target.value })}
            required
            className={cn(inputStyles, "w-full", errorClass("dateOfBirth"))}
          />
          {errorText("dateOfBirth")}
        </div>

        {/* Valid Passport */}
        <div>
          <label className={labelStyles}>Do you have a valid passport? *</label>
          <div className="flex gap-3 mt-1">
            <button type="button" className={cn("flex-1", formData.hasValidPassport === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ hasValidPassport: "yes" })}>
              Yes
            </button>
            <button
              type="button"
              className={cn("flex-1", formData.hasValidPassport === "no" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => set({ hasValidPassport: "no", passportNumber: "", passportExpiry: "" })}
            >
              No
            </button>
          </div>
          {showErrors && errors.hasValidPassport && formData.hasValidPassport !== "no" && errorText("hasValidPassport")}
          {formData.hasValidPassport === "yes" && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2.5 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/20">
              <Info className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Your passport should have at least 6 months validity from your travel date. We will ask for the passport number after payment.</span>
            </p>
          )}
          {formData.hasValidPassport === "no" && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2.5 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20" role="alert">
              <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <span>You need a valid passport (at least 6 months validity from your travel date) before applying.</span>
            </p>
          )}
        </div>

        {/* Passport Expiry Date (only with a valid passport) */}
        {formData.hasValidPassport === "yes" && (
          <div>
            <label htmlFor="passportExpiry" className={labelStyles}>
              Passport Expiry Date *
            </label>
            <CustomDatePicker
              id="passportExpiry"
              placeholder="Select expiry date"
              min={iso(new Date())}
              value={formData.passportExpiry || ""}
              onChange={(val) => set({ passportExpiry: val })}
              className={cn(errorClass("passportExpiry"))}
            />
            {errorText("passportExpiry")}
          </div>
        )}

        {/* Marital Status */}
        <div>
          <label htmlFor="maritalStatus" className={labelStyles}>
            Marital Status *
          </label>
          <select
            id="maritalStatus"
            value={formData.maritalStatus || ""}
            onChange={(e) => {
              const v = e.target.value as FormData["maritalStatus"]
              set({ maritalStatus: v, ...(v !== "married" ? { spouseAccompanying: "" } : {}) })
            }}
            className={cn(selectStyles, "w-full", errorClass("maritalStatus"))}
            required
          >
            <option value="">Select status</option>
            {MARITAL.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errorText("maritalStatus")}
        </div>

        {/* Spouse Accompanying */}
        {formData.maritalStatus === "married" && (
          <div>
            <label className={labelStyles}>Will your spouse accompany you? *</label>
            <div className="flex gap-3 mt-1">
              <button type="button" className={cn("flex-1", formData.spouseAccompanying === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ spouseAccompanying: "yes" })}>
                Yes
              </button>
              <button type="button" className={cn("flex-1", formData.spouseAccompanying === "no" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ spouseAccompanying: "no" })}>
                No
              </button>
            </div>
            {errorText("spouseAccompanying")}
          </div>
        )}
      </div>

      <div className="md:flex md:justify-end fixed md:static bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 md:backdrop-blur-lg border-t border-border/80 md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none z-20">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto h-14 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </form>
  )
}
