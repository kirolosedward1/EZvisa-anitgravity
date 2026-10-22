"use client"

// Trip Details step: option lists and validation come from the website ↔ app contract (lib/shared/wizard-contract.ts).
import type React from "react"
import { Button } from "@/components/ui/button"
import { Plus, X, AlertCircle, Loader2, Info } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate } from "@/lib/form-types"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { SCHENGEN, PURPOSES, COMPANIONS, FUNDING, BALANCE, HOTELS, validateTrip, earliestDeparture, iso, tripDays, MAX_STAY_DAYS, type Errors } from "@/lib/shared/wizard-contract"

interface TripDetailsStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 md:backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 shadow-sm"
const selectStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 md:backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none pr-10 shadow-sm"
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActiveStyles =
  "h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer border border-transparent scale-[1.01]"
const toggleInactiveStyles =
  "h-12 rounded-xl font-medium text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground hover:border-border flex items-center justify-center cursor-pointer"
const errorStyles = "border-destructive bg-destructive/5 focus:ring-destructive/10"

export function TripDetailsStep({ formData, updateFormData, onNext, onBack, isLoading }: TripDetailsStepProps) {
  const [newCountry, setNewCountry] = useState("")
  const [newArrivalDate, setNewArrivalDate] = useState("")
  const [newDepartureDate, setNewDepartureDate] = useState("")
  const [dateError, setDateError] = useState("")
  const [showErrors, setShowErrors] = useState(false)

  const additionalCountries = formData.additionalCountries || []
  const tripDuration = tripDays(formData)

  const errors: Errors = useMemo(() => validateTrip(formData), [formData])
  const isFormValid = Object.keys(errors).length === 0

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
      {showErrors && !isFormValid && (
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-foreground text-sm" role="alert" aria-live="polite">
          <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{Object.values(errors)[0] ?? "Please fill in all required travel details before continuing."}</span>
          </div>
        </div>
      )}

      {/* Purpose of Trip */}
      <div>
        <label htmlFor="purposeOfTrip" className={labelStyles}>
          Purpose of Trip *
        </label>
        <select
          id="purposeOfTrip"
          value={formData.purposeOfTrip || ""}
          onChange={(e) => set({ purposeOfTrip: e.target.value })}
          className={cn(selectStyles, "w-full", errorClass("purposeOfTrip"))}
        >
          <option value="">Select purpose of trip</option>
          {PURPOSES.map((purpose) => (
            <option key={purpose.value} value={purpose.value}>
              {purpose.label}
            </option>
          ))}
        </select>
        {errorText("purposeOfTrip")}
      </div>

      {/* Travel Dates */}
      <div className="grid gap-6 md:grid-cols-2 p-6 bg-muted/20 rounded-2xl border border-border/60">
        <div>
          <label htmlFor="travelStartDate" className={labelStyles}>
            Intended Departure Date *
          </label>
          <CustomDatePicker
            id="travelStartDate"
            placeholder="Select departure date"
            min={iso(earliestDeparture())}
            value={formData.travelStartDate || ""}
            onChange={(val) => set({ travelStartDate: val })}
            className={cn(errorClass("travelStartDate"))}
          />
          <p className="text-xs text-muted-foreground mt-1.5">At least 15 days from today.</p>
          {errorText("travelStartDate")}
        </div>

        <div>
          <label htmlFor="travelEndDate" className={labelStyles}>
            Intended Return Date *
          </label>
          <CustomDatePicker
            id="travelEndDate"
            placeholder="Select return date"
            min={formData.travelStartDate || iso(new Date())}
            value={formData.travelEndDate || ""}
            onChange={(val) => set({ travelEndDate: val })}
            className={cn(errorClass("travelEndDate"))}
          />
          {errorText("travelEndDate")}
        </div>

        {tripDuration > 0 && (
          <div className="md:col-span-2 text-sm text-muted-foreground flex items-center gap-2.5 bg-blue-500/5 p-3.5 rounded-xl border border-blue-500/20">
            <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />
            <span>
              Total Stay Duration: <strong>{tripDuration} days</strong>.
              {tripDuration > MAX_STAY_DAYS && (
                <span className="text-destructive block mt-1 font-medium">
                  Schengen tourist visas permit a maximum stay of {MAX_STAY_DAYS} days.
                </span>
              )}
            </span>
          </div>
        )}

        {/* Date Flexibility */}
        <div className="md:col-span-2">
          <label className={labelStyles}>Are your travel dates flexible? *</label>
          <div className="flex gap-3 mt-1">
            <button type="button" className={cn("flex-1", formData.datesFlexible === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ datesFlexible: "yes" })}>
              Yes
            </button>
            <button type="button" className={cn("flex-1", formData.datesFlexible === "no" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ datesFlexible: "no" })}>
              No
            </button>
          </div>
          {errorText("datesFlexible")}
        </div>
      </div>

      {/* Companions and Accommodation Preferences */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="travelingWith" className={labelStyles}>
            Who are you traveling with? *
          </label>
          <select
            id="travelingWith"
            value={formData.travelingWith || ""}
            onChange={(e) => set({ travelingWith: e.target.value })}
            className={cn(selectStyles, "w-full", errorClass("travelingWith"))}
          >
            <option value="">Select companion option</option>
            {COMPANIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorText("travelingWith")}
        </div>

        <div>
          <label htmlFor="hotelCategory" className={labelStyles}>
            Accommodation Preferences *
          </label>
          <select
            id="hotelCategory"
            value={formData.hotelCategory || ""}
            onChange={(e) => set({ hotelCategory: e.target.value })}
            className={cn(selectStyles, "w-full", errorClass("hotelCategory"))}
          >
            <option value="">Select hotel category</option>
            {HOTELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorText("hotelCategory")}
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
            onChange={(e) => set({ fundingSource: e.target.value })}
            className={cn(selectStyles, "w-full", errorClass("fundingSource"))}
          >
            <option value="">Select funding source</option>
            {FUNDING.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorText("fundingSource")}
        </div>

        <div>
          <label htmlFor="balanceRange" className={labelStyles}>
            Approx. Bank Balance Range *
          </label>
          <select
            id="balanceRange"
            value={formData.balanceRange || ""}
            onChange={(e) => set({ balanceRange: e.target.value })}
            className={cn(selectStyles, "w-full", errorClass("balanceRange"))}
          >
            <option value="">Select balance range</option>
            {BALANCE.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorText("balanceRange")}
        </div>
      </div>

      {/* Visa History & Refusals */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelStyles}>Is this your first Schengen Visa? *</label>
          <div className="flex gap-3 mt-1">
            <button type="button" className={cn("flex-1", formData.isFirstSchengenVisa === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ isFirstSchengenVisa: "yes" })}>
              Yes
            </button>
            <button type="button" className={cn("flex-1", formData.isFirstSchengenVisa === "no" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ isFirstSchengenVisa: "no" })}>
              No
            </button>
          </div>
          {errorText("isFirstSchengenVisa")}
        </div>

        <div>
          <label className={labelStyles}>Have you ever had a visa refusal? *</label>
          <div className="flex gap-3 mt-1">
            <button type="button" className={cn("flex-1", formData.previousRefusals === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ previousRefusals: "yes" })}>
              Yes
            </button>
            <button type="button" className={cn("flex-1", formData.previousRefusals === "no" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ previousRefusals: "no", refusalDetails: "" })}>
              No
            </button>
          </div>
          {errorText("previousRefusals")}
        </div>

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
              onChange={(e) => set({ refusalDetails: e.target.value })}
              placeholder="e.g., Rejected by France in Nov 2025 due to insufficient justification of travel purpose..."
              rows={3}
              required
              className={cn(inputStyles, "w-full h-auto py-4 resize-none", errorClass("refusalDetails"))}
            />
            {errorText("refusalDetails")}
          </div>
        )}
      </div>

      {/* Visiting Other Countries Connector */}
      <div className="space-y-4">
        <div className="max-w-md">
          <label className={labelStyles}>Will you be visiting other Schengen countries?</label>
          <div className="flex gap-3 mt-1">
            <button type="button" className={cn("flex-1", formData.willVisitOtherCountries === "yes" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ willVisitOtherCountries: "yes" })}>
              Yes
            </button>
            <button type="button" className={cn("flex-1", formData.willVisitOtherCountries === "no" ? toggleActiveStyles : toggleInactiveStyles)} onClick={() => set({ willVisitOtherCountries: "no", additionalCountries: [] })}>
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
                aria-label="Additional country"
              >
                <option value="">Select a country</option>
                {SCHENGEN
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
                    min={formData.travelStartDate || iso(new Date())}
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

              {dateError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 p-3 rounded-xl border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>{dateError}</span>
                </div>
              )}

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
                        {new Date(countryVisit.arrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                        to{" "}
                        {new Date(countryVisit.departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCountry(countryVisit.country)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2 hover:bg-destructive/5 rounded-lg"
                      aria-label={`Remove ${countryVisit.country}`}
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
          onChange={(e) => set({ itinerary: e.target.value })}
          placeholder="Example: Day 1-3: Paris (Hotel XYZ), Day 4-6: Rome (Hotel ABC)..."
          rows={5}
          className={cn(inputStyles, "w-full h-auto py-4 resize-none")}
        />
      </div>

      {/* Action Buttons */}
      <div className="md:flex md:justify-between md:pt-4 fixed md:static bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 md:backdrop-blur-lg border-t border-border/80 md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none z-20 flex justify-between gap-3">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          disabled={isLoading}
          className="flex-1 md:flex-none h-14 rounded-xl font-semibold text-base border border-border bg-background/40 hover:bg-background/80 text-foreground hover:text-foreground transition-all duration-300 active:scale-95 px-8"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 md:flex-none h-14 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue to Review & Payment"
          )}
        </Button>
      </div>
    </form>
  )
}
