"use client"

import type React from "react"
import { Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate, FieldValue } from "@/lib/form-types"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { datesInOrder, isValidCalendarDate, schengenStayDays } from "@/lib/dates"
import { TravelDatesField } from "@/components/apply/travel-dates-field"
import { WizardBar } from "@/components/apply/wizard-bar"

interface TripDetailsStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

const tripPurposes = [
  { value: "tourism", label: "Tourism" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family Visit" },
  { value: "medical", label: "Medical Treatment" },
  { value: "education", label: "Education/Training" },
  { value: "other", label: "Other" },
]

const schengenCountries = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
]

const companionOptions = [
  { value: "alone", label: "Traveling Alone" },
  { value: "spouse", label: "With Spouse" },
  { value: "family", label: "With Family" },
  { value: "friends", label: "With Friends" },
  { value: "group", label: "With Tour Group" },
]

const fundingOptions = [
  { value: "self", label: "Self-funded (Personal savings)" },
  { value: "sponsor", label: "Sponsored (By family/friend)" },
  { value: "company", label: "Sponsored (By employer/company)" },
]

const balanceOptions = [
  { value: "under-10000", label: "Under 10,000 AED" },
  { value: "10000-25000", label: "10,000 - 25,000 AED" },
  { value: "25000-50000", label: "25,000 - 50,000 AED" },
  { value: "50000-plus", label: "50,000+ AED" },
]

const hotelOptions = [
  { value: "3-star", label: "3-Star Hotel / Mid-range" },
  { value: "4-star", label: "4-Star Hotel / Premium" },
  { value: "5-star", label: "5-Star Hotel / Luxury" },
  { value: "sponsor", label: "Staying with Host (Sponsor Home)" },
]

const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 shadow-sm"
const selectStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 px-4 text-base font-medium text-foreground transition-all duration-300 appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none pr-10 shadow-sm"
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActiveStyles =
  "h-12 rounded-xl font-semibold text-sm bg-[#0436DC] text-white flex items-center justify-center cursor-pointer border border-transparent"
const toggleInactiveStyles =
  "h-12 rounded-xl font-medium text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground hover:border-border flex items-center justify-center cursor-pointer"

export function TripDetailsStep({ formData, updateFormData, onNext, onBack, isLoading }: TripDetailsStepProps) {
  const [newCountry, setNewCountry] = useState("")
  const [newArrivalDate, setNewArrivalDate] = useState("")
  const [newDepartureDate, setNewDepartureDate] = useState("")
  const [dateError, setDateError] = useState("")
  const [showErrors, setShowErrors] = useState(false)

  const additionalCountries = formData.additionalCountries || []

  const tripDuration = schengenStayDays(formData.travelStartDate, formData.travelEndDate)

  const handleFieldChange = (field: keyof FormData, value: any) => {
    updateFormData({ [field]: value })
    setShowErrors(false)
  }

  const handleArrivalDateChange = (value: string) => {
    setNewArrivalDate(value)
    setDateError("")
    if (newDepartureDate && value && new Date(newDepartureDate) <= new Date(value)) {
      setNewDepartureDate("")
      setDateError("Departure date must be after arrival date")
    }
  }

  const handleDepartureDateChange = (value: string) => {
    if (newArrivalDate && value && new Date(value) <= new Date(newArrivalDate)) {
      setDateError("Departure date must be after arrival date")
      return
    }
    setDateError("")
    setNewDepartureDate(value)
  }

  const handleAddCountry = () => {
    if (newCountry && newArrivalDate && newDepartureDate) {
      if (new Date(newDepartureDate) <= new Date(newArrivalDate)) {
        setDateError("Departure date must be after arrival date")
        return
      }
      const existingCountry = additionalCountries.find((c) => c.country === newCountry)
      if (existingCountry) {
        setDateError(`${newCountry} is already added to your itinerary`)
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
  }

  const handleRemoveCountry = (country: string) => {
    updateFormData({
      additionalCountries: additionalCountries.filter((c) => c.country !== country),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      setShowErrors(true)
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

  const flexibleDates = formData.datesFlexible === "yes"
  const isDatesValid = flexibleDates
    ? !!formData.travelMonth &&
      !!formData.tripLength &&
      isValidCalendarDate(formData.travelStartDate) &&
      isValidCalendarDate(formData.travelEndDate) &&
      tripDuration > 1 &&
      tripDuration <= 90
    : formData.datesFlexible === "no" &&
      isValidCalendarDate(formData.travelStartDate) &&
      isValidCalendarDate(formData.travelEndDate) &&
      datesInOrder(formData.travelStartDate, formData.travelEndDate) &&
      tripDuration > 1 &&
      tripDuration <= 90

  const isFormValid =
    formData.purposeOfTrip &&
    isDatesValid &&
    formData.datesFlexible &&
    formData.isFirstSchengenVisa &&
    formData.previousRefusals &&
    (formData.previousRefusals !== "yes" || formData.refusalDetails) &&
    formData.travelingWith &&
    formData.fundingSource &&
    formData.balanceRange &&
    formData.hotelCategory

  const getErrorClass = (fieldValue: FieldValue) => {
    return showErrors && !fieldValue ? "border-[#B83200]" : ""
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-44 md:pb-0">
      {/* Purpose of Trip */}
      <div>
        <label htmlFor="purposeOfTrip" className={labelStyles}>
          Purpose of Trip *
        </label>
        <select
          id="purposeOfTrip"
          value={formData.purposeOfTrip || ""}
          onChange={(e) => handleFieldChange("purposeOfTrip", e.target.value)}
          className={cn(selectStyles, "w-full", getErrorClass(formData.purposeOfTrip))}
        >
          <option value="">Select purpose of trip</option>
          {tripPurposes.map((purpose) => (
            <option key={purpose.value} value={purpose.value}>
              {purpose.label}
            </option>
          ))}
        </select>
      </div>

      <TravelDatesField
        formData={formData}
        updateFormData={updateFormData}
        showErrors={showErrors}
        onClearErrors={() => setShowErrors(false)}
      />

      {/* Companions and Accommodation Preferences */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Traveling With */}
        <div>
          <label htmlFor="travelingWith" className={labelStyles}>
            Who are you traveling with? *
          </label>
          <select
            id="travelingWith"
            value={formData.travelingWith || ""}
            onChange={(e) => handleFieldChange("travelingWith", e.target.value)}
            className={cn(selectStyles, "w-full", getErrorClass(formData.travelingWith))}
          >
            <option value="">Select companion option</option>
            {companionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hotel Category */}
        <div>
          <label htmlFor="hotelCategory" className={labelStyles}>
            Accommodation Preferences *
          </label>
          <select
            id="hotelCategory"
            value={formData.hotelCategory || ""}
            onChange={(e) => handleFieldChange("hotelCategory", e.target.value)}
            className={cn(selectStyles, "w-full", getErrorClass(formData.hotelCategory))}
          >
            <option value="">Select hotel category</option>
            {hotelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Funding Details */}
      <div className="grid gap-6 md:grid-cols-2 p-6 bg-muted/20 rounded-2xl border border-border/60">
        <div>
          <label htmlFor="fundingSource" className={labelStyles}>
            Funding Source *
          </label>
          <select
            id="fundingSource"
            value={formData.fundingSource || ""}
            onChange={(e) => handleFieldChange("fundingSource", e.target.value)}
            className={cn(selectStyles, "w-full", getErrorClass(formData.fundingSource))}
          >
            <option value="">Select funding source</option>
            {fundingOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="balanceRange" className={labelStyles}>
            Approx. Bank Balance Range *
          </label>
          <select
            id="balanceRange"
            value={formData.balanceRange || ""}
            onChange={(e) => handleFieldChange("balanceRange", e.target.value)}
            className={cn(selectStyles, "w-full", getErrorClass(formData.balanceRange))}
          >
            <option value="">Select balance range</option>
            {balanceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visa History & Refusals */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* First Schengen Visa */}
        <div>
          <label className={labelStyles}>Is this your first Schengen Visa? *</label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              className={cn("flex-1", formData.isFirstSchengenVisa === "yes" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => handleFieldChange("isFirstSchengenVisa", "yes")}
            >
              Yes
            </button>
            <button
              type="button"
              className={cn("flex-1", formData.isFirstSchengenVisa === "no" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => handleFieldChange("isFirstSchengenVisa", "no")}
            >
              No
            </button>
          </div>
        </div>

        {/* Previous Refusals */}
        <div>
          <label className={labelStyles}>Have you ever had a visa refusal? *</label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              className={cn("flex-1", formData.previousRefusals === "yes" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => handleFieldChange("previousRefusals", "yes")}
            >
              Yes
            </button>
            <button
              type="button"
              className={cn("flex-1", formData.previousRefusals === "no" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => {
                updateFormData({ previousRefusals: "no", refusalDetails: "" })
                setShowErrors(false)
              }}
            >
              No
            </button>
          </div>
        </div>

        {/* Refusal Details Textarea (Conditional) */}
        {formData.previousRefusals === "yes" && (
          <div className="md:col-span-2 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-2">
            <label htmlFor="refusalDetails" className={labelStyles}>
              Refusal Details *
            </label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please specify the country, date, and reason stated in the refusal letter. We will formulate a mitigation explanation in your cover letter.
            </p>
            <textarea
              id="refusalDetails"
              value={formData.refusalDetails || ""}
              onChange={(e) => handleFieldChange("refusalDetails", e.target.value)}
              placeholder="e.g., Rejected by France in Nov 2025 due to insufficient justification of travel purpose..."
              rows={3}
              required
              className={cn(inputStyles, "w-full h-auto py-4 resize-none", getErrorClass(formData.refusalDetails))}
            />
          </div>
        )}
      </div>

      {/* Visiting Other Countries Connector */}
      <div className="space-y-4">
        <div className="max-w-md">
          <label className={labelStyles}>Will you be visiting other Schengen countries?</label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              className={cn("flex-1", formData.willVisitOtherCountries === "yes" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => handleFieldChange("willVisitOtherCountries", "yes")}
            >
              Yes
            </button>
            <button
              type="button"
              className={cn("flex-1", formData.willVisitOtherCountries === "no" ? toggleActiveStyles : toggleInactiveStyles)}
              onClick={() => {
                updateFormData({ 
                  willVisitOtherCountries: "no",
                  additionalCountries: [] 
                })
                setShowErrors(false)
              }}
            >
              No
            </button>
          </div>
        </div>

        {formData.willVisitOtherCountries === "yes" && (
          <>
            <div>
              <label className={labelStyles}>Additional Countries to Visit</label>
              <p className="text-sm text-muted-foreground mt-1">
                Add other Schengen countries you plan to visit during your trip
              </p>
            </div>

            <div className="p-6 bg-muted/20 rounded-2xl border border-border/60 space-y-4">
              <select
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className={cn(selectStyles, "w-full")}
              >
                <option value="">Select a country</option>
                {schengenCountries
                  .filter((country) => !additionalCountries.find((c) => c.country === country) && country !== formData.destination)
                  .map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
              </select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="arrivalDate" className={labelStyles}>
                    Arrival Date
                  </label>
                  <CustomDatePicker
                    id="arrivalDate"
                    placeholder={!newCountry ? "Select a country first" : "Select arrival date"}
                    disabled={!newCountry}
                    min={formData.travelStartDate || new Date().toISOString().split("T")[0]}
                    max={formData.travelEndDate || undefined}
                    value={newArrivalDate}
                    onChange={handleArrivalDateChange}
                  />
                </div>
                <div>
                  <label htmlFor="departureDate" className={labelStyles}>
                    Departure Date
                  </label>
                  <CustomDatePicker
                    id="departureDate"
                    placeholder={
                      !newCountry
                        ? "Select a country first"
                        : !newArrivalDate
                        ? "Select arrival date first"
                        : "Select departure date"
                    }
                    disabled={!newCountry || !newArrivalDate}
                    min={
                      newArrivalDate
                        ? new Date(new Date(newArrivalDate).getTime() + 86400000).toISOString().split("T")[0]
                        : ""
                    }
                    max={formData.travelEndDate || undefined}
                    value={newDepartureDate}
                    onChange={handleDepartureDateChange}
                  />
                </div>
              </div>

              {dateError && <p className="text-[12px] leading-4 text-[#B83200]">{dateError}</p>}

              <button
                type="button"
                onClick={handleAddCountry}
                disabled={!newCountry || !newArrivalDate || !newDepartureDate || !!dateError}
                className={cn(toggleInactiveStyles, "w-full disabled:opacity-50 h-12 rounded-xl flex items-center justify-center")}
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Add Country
              </button>
            </div>

            {additionalCountries.length > 0 && (
              <div className="space-y-3">
                {additionalCountries.map((countryVisit) => (
                  <div
                    key={countryVisit.country}
                    className="flex items-center justify-between bg-background/50 border border-border/65 rounded-xl p-4 hover:border-blue-500/30 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-foreground">{countryVisit.country}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(countryVisit.arrivalDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        →{" "}
                        {new Date(countryVisit.departureDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCountry(countryVisit.country)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 hover:bg-destructive/5 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Itinerary */}
      <div>
        <label htmlFor="itinerary" className={labelStyles}>
          Travel Itinerary (Optional)
        </label>
        <p className="text-sm text-muted-foreground mb-2">
          Provide details about your planned activities, accommodations, and schedule
        </p>
        <textarea
          id="itinerary"
          value={formData.itinerary || ""}
          onChange={(e) => handleFieldChange("itinerary", e.target.value)}
          placeholder="Example: Day 1-3: Paris (Hotel XYZ), Day 4-6: Rome (Hotel ABC)..."
          rows={5}
          className={cn(inputStyles, "w-full h-auto py-4 resize-none")}
        />
      </div>

      {/* Action Buttons */}
      <WizardBar
        onBack={onBack}
        loading={isLoading}
        continueLabel="Continue to Review & Pay"
        continueLabelAr="تابع إلى المراجعة والدفع"
        loadingLabel="Processing..."
        loadingLabelAr="جارٍ المعالجة..."
      />
    </form>
  )
}
