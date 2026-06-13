"use client"

import type React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Info, Loader2, Globe, User } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate, FieldValue } from "@/lib/form-types"

interface NationalityStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  isLoading?: boolean
}

const nationalityCountries = [
  { name: "Egypt", flag: "🇪🇬" },
  { name: "India", flag: "🇮🇳" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Pakistan", flag: "🇵🇰" },
  { name: "Russian Federation", flag: "🇷🇺" },
  { name: "Syria", flag: "🇸🇾" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Bangladesh", flag: "🇧🇩" },
]

const residenceCountries = [
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Kuwait", flag: "🇰🇼" },
  { name: "Bahrain", flag: "🇧🇭" },
  { name: "Oman", flag: "🇴🇲" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "Jordan", flag: "🇯🇴" },
]

const schengenCountries = [
  { name: "Austria", flag: "🇦🇹" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Bulgaria", flag: "🇧🇬" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Estonia", flag: "🇪🇪" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Hungary", flag: "🇭🇺" },
  { name: "Iceland", flag: "🇮🇸" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Latvia", flag: "🇱🇻" },
  { name: "Liechtenstein", flag: "🇱🇮" },
  { name: "Lithuania", flag: "🇱🇹" },
  { name: "Luxembourg", flag: "🇱🇺" },
  { name: "Malta", flag: "🇲🇹" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Slovakia", flag: "🇸🇰" },
  { name: "Slovenia", flag: "🇸🇮" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
]

// Shared style constants
const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none shadow-sm"
const selectStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none pr-10 shadow-sm"
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActiveStyles =
  "h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer border border-transparent scale-[1.01]"
const toggleInactiveStyles =
  "h-12 rounded-xl font-medium text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground hover:border-border flex items-center justify-center cursor-pointer"

export function NationalityStep({ formData, updateFormData, onNext, isLoading }: NationalityStepProps) {
  const [nationalityOpen, setNationalityOpen] = useState(false)
  const [residenceOpen, setResidenceOpen] = useState(false)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      setShowErrors(true)
      return
    }
    onNext()
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) return false
    
    const parts = email.split("@")
    if (parts.length !== 2) return false
    
    const [localPart, domain] = parts
    if (localPart.length < 2 || !domain.includes(".")) return false
    
    const domainLower = domain.toLowerCase()
    const invalidDomains = ["gmial.com", "yahooo.com", "hotmial.com", "gmai.com"]
    if (invalidDomains.includes(domainLower)) return false
    
    return true
  }

  const isValidPhone = (phone: string) => {
    const cleaned = phone.trim()
    const digitsOnly = cleaned.replace(/[^\d]/g, "")
    
    if (digitsOnly.length < 7 || digitsOnly.length > 15) return false

    const allSameDigit = /^(\d)\1+$/.test(digitsOnly)
    if (allSameDigit) return false

    if (digitsOnly.length >= 8) {
      const isSequential = digitsOnly
        .split("")
        .every((digit, i, arr) => i === 0 || Number.parseInt(digit) === Number.parseInt(arr[i - 1]) + 1)
      if (isSequential) return false
    }

    return true
  }

  const isFormValid =
    formData.nationality &&
    formData.destination &&
    formData.countryOfResidence &&
    formData.cityOfResidence &&
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    isValidEmail(formData.email) &&
    formData.phone &&
    isValidPhone(formData.phone) &&
    formData.hasValidPassport &&
    formData.maritalStatus &&
    (formData.maritalStatus !== "married" ||
      formData.spouseAccompanying === "yes" ||
      formData.spouseAccompanying === "no") &&
    (formData.countryOfResidence !== "United Arab Emirates" || formData.hasEmiratesId === "yes" || formData.hasEmiratesId === "no")

  const getErrorClass = (fieldValue: FieldValue) => {
    return showErrors && !fieldValue ? "border-destructive bg-destructive/5 focus:ring-destructive/10" : ""
  }

  const handleFieldChange = (field: string, value: string) => {
    updateFormData({ [field]: value })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            {!isValidEmail(formData.email || "") && formData.email ? (
              <span>Please enter a valid email address. Check for typos in the domain.</span>
            ) : formData.phone && !isValidPhone(formData.phone) ? (
              <span>Please enter a valid phone number (8-15 digits, not all same or sequential).</span>
            ) : (
              <span>Please fill in all required fields before continuing.</span>
            )}
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
                className={cn(
                  inputStyles,
                  "w-full justify-between font-medium",
                  getErrorClass(formData.destination),
                )}
              >
                {formData.destination ? (
                  <div className="flex items-center gap-2">
                    <span className="relative w-5 h-5 rounded-full overflow-hidden inline-block flex-shrink-0 border border-border/50 shadow-sm">
                      <Image
                        src={`/flags/${formData.destination.toLowerCase().replace(/\s+/g, "-")}.png`}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </span>
                    <span className="font-medium text-foreground">{formData.destination}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">Select destination country</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-1 bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl">
              <Command>
                <CommandInput placeholder="Search country..." autoFocus={!isMobile} className="border-none focus:ring-0" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {schengenCountries.map((country) => (
                      <CommandItem
                        key={country.name}
                        value={country.name}
                        className="rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                        onSelect={() => {
                          updateFormData({ destination: country.name })
                          setDestinationOpen(false)
                          setShowErrors(false)
                        }}
                      >
                        <Check
                          className={cn(
                             "mr-2 h-4 w-4 text-blue-600",
                            formData.destination === country.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="relative w-5 h-5 rounded-full overflow-hidden inline-block mr-2 flex-shrink-0 border border-border/50">
                          <Image
                            src={`/flags/${country.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </span>
                        <span className="text-foreground">{country.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Nationality */}
        <div>
          <label className={labelStyles}>Nationality *</label>
          <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={nationalityOpen}
                className={cn(
                  inputStyles,
                  "w-full justify-between font-medium",
                  getErrorClass(formData.nationality),
                )}
              >
                {formData.nationality ? (
                  <div className="flex items-center gap-2">
                    <span className="relative w-5 h-5 rounded-full overflow-hidden inline-block flex-shrink-0 border border-border/50 shadow-sm">
                      <Image
                        src={`/flags/${formData.nationality.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </span>
                    <span className="font-medium text-foreground">{formData.nationality}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">Select nationality</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-1 bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl">
              <Command>
                <CommandInput placeholder="Search nationality..." autoFocus={!isMobile} className="border-none focus:ring-0" />
                <CommandList>
                  <CommandEmpty>No nationality found.</CommandEmpty>
                  <CommandGroup>
                    {nationalityCountries.map((country) => (
                      <CommandItem
                        key={country.name}
                        value={country.name}
                        className="rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                        onSelect={() => {
                          updateFormData({ nationality: country.name })
                          setNationalityOpen(false)
                          setShowErrors(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-blue-600",
                            formData.nationality === country.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="relative w-5 h-5 rounded-full overflow-hidden inline-block mr-2 flex-shrink-0 border border-border/50">
                          <Image
                            src={`/flags/${country.name.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </span>
                        <span className="text-foreground">{country.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Country of Residence */}
        <div>
          <label className={labelStyles}>Country of Residence *</label>
          <Popover open={residenceOpen} onOpenChange={setResidenceOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={residenceOpen}
                className={cn(
                  inputStyles,
                  "w-full justify-between font-medium",
                  getErrorClass(formData.countryOfResidence),
                )}
              >
                {formData.countryOfResidence ? (
                  <div className="flex items-center gap-2">
                    <span className="relative w-5 h-5 rounded-full overflow-hidden inline-block flex-shrink-0 border border-border/50 shadow-sm">
                      <Image
                        src={`/flags/${formData.countryOfResidence.toLowerCase().replace(/\s+/g, "-")}.png`}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </span>
                    <span className="font-medium text-foreground">{formData.countryOfResidence}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">Select country</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-1 bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl">
              <Command>
                <CommandInput placeholder="Search country..." autoFocus={!isMobile} className="border-none focus:ring-0" />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {residenceCountries.map((country) => (
                      <CommandItem
                        key={country.name}
                        value={country.name}
                        className="rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                        onSelect={() => {
                          updateFormData({ countryOfResidence: country.name })
                          setResidenceOpen(false)
                          setShowErrors(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-blue-600",
                            formData.countryOfResidence === country.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="relative w-5 h-5 rounded-full overflow-hidden inline-block mr-2 flex-shrink-0 border border-border/50">
                          <Image
                            src={`/flags/${country.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </span>
                        <span className="text-foreground">{country.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* City of Residence */}
        <div>
          <label htmlFor="cityOfResidence" className={labelStyles}>
            City of Residence *
          </label>
          <input
            id="cityOfResidence"
            value={formData.cityOfResidence || ""}
            onChange={(e) => {
              handleFieldChange("cityOfResidence", e.target.value)
              setShowErrors(false)
            }}
            placeholder="Enter city"
            required
            className={cn(inputStyles, "w-full", getErrorClass(formData.cityOfResidence))}
          />
        </div>

        {/* Emirates ID - Next to City of Residence */}
        {formData.countryOfResidence === "United Arab Emirates" && (
          <div>
            <label className={labelStyles}>Do you have an Emirates ID? *</label>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                className={cn("flex-1", formData.hasEmiratesId === "yes" ? toggleActiveStyles : toggleInactiveStyles)}
                onClick={() => {
                  updateFormData({ hasEmiratesId: "yes" })
                  setShowErrors(false)
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className={cn("flex-1", formData.hasEmiratesId === "no" ? toggleActiveStyles : toggleInactiveStyles)}
                onClick={() => {
                  updateFormData({ hasEmiratesId: "no" })
                  setShowErrors(false)
                }}
              >
                No
              </button>
            </div>
          </div>
        )}

        {/* Contact Information Section */}
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
            value={formData.firstName || ""}
            onChange={(e) => {
              handleFieldChange("firstName", e.target.value)
              setShowErrors(false)
            }}
            placeholder="Enter first name"
            required
            className={cn(inputStyles, "w-full", getErrorClass(formData.firstName))}
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className={labelStyles}>
            Last Name *
          </label>
          <input
            id="lastName"
            value={formData.lastName || ""}
            onChange={(e) => {
              handleFieldChange("lastName", e.target.value)
              setShowErrors(false)
            }}
            placeholder="Enter last name"
            required
            className={cn(inputStyles, "w-full", getErrorClass(formData.lastName))}
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
            value={formData.email || ""}
            onChange={(e) => {
              handleFieldChange("email", e.target.value)
              setShowErrors(false)
            }}
            placeholder="your.email@example.com"
            required
            className={cn(inputStyles, "w-full", getErrorClass(formData.email))}
          />
          {showErrors && formData.email && !isValidEmail(formData.email) && (
            <p className="text-xs text-red-600 mt-1">Please enter a valid email address</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelStyles}>
            Phone Number *
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d+\-() ]/g, "")
              handleFieldChange("phone", value)
              setShowErrors(false)
            }}
            placeholder="+971 50 123 4567"
            required
            aria-required="true"
            aria-invalid={showErrors && !isValidPhone(formData.phone || "")}
            aria-describedby={showErrors && !isValidPhone(formData.phone || "") ? "phone-error" : undefined}
            className={cn(inputStyles, "w-full", getErrorClass(formData.phone))}
          />
          {showErrors && formData.phone && !isValidPhone(formData.phone) && (
            <p id="phone-error" className="text-xs text-red-600 mt-1" role="alert">
              Please enter a valid phone number (8-15 digits)
            </p>
          )}
        </div>

        {/* Valid Passport */}
        <div>
          <label className={labelStyles}>Do you have a valid passport? *</label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              className={cn("flex-1", formData.hasValidPassport === "yes" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => {
                updateFormData({ hasValidPassport: "yes" })
                setShowErrors(false)
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={cn("flex-1", formData.hasValidPassport === "no" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => {
                updateFormData({ hasValidPassport: "no" })
                setShowErrors(false)
              }}
            >
              No
            </button>
          </div>
          {formData.hasValidPassport === "yes" && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2.5 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/20">
              <Info className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Your passport should have at least 6 months validity from your travel date.</span>
            </p>
          )}
          {formData.hasValidPassport === "no" && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2.5 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20">
              <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <span>You will need to obtain a valid passport before applying for a visa.</span>
            </p>
          )}
        </div>

        {/* Marital Status */}
        <div>
          <label htmlFor="maritalStatus" className={labelStyles}>
            Marital Status *
          </label>
          <select
            id="maritalStatus"
            value={formData.maritalStatus || ""}
            onChange={(e) => {
              handleFieldChange("maritalStatus", e.target.value)
              setShowErrors(false)
            }}
            className={cn(selectStyles, "w-full", getErrorClass(formData.maritalStatus))}
            required
          >
            <option value="">Select status</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>

        {/* Spouse Accompanying */}
        {formData.maritalStatus === "married" && (
          <div>
            <label className={labelStyles}>Will your spouse accompany you? *</label>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                className={cn(
                  "flex-1",
                  formData.spouseAccompanying === "yes" ? toggleActiveStyles : toggleInactiveStyles,
                )}
                onClick={() => {
                  updateFormData({ spouseAccompanying: "yes" })
                  setShowErrors(false)
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1",
                  formData.spouseAccompanying === "no" ? toggleActiveStyles : toggleInactiveStyles,
                )}
                onClick={() => {
                  updateFormData({ spouseAccompanying: "no" })
                  setShowErrors(false)
                }}
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="md:flex md:justify-end fixed md:static bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border/80 md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none z-10">
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
            "Continue to Employment"
          )}
        </Button>
      </div>
    </form>
  )
}
