"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate, FieldValue } from "@/lib/form-types"

interface SpouseStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none shadow-sm"
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActiveStyles =
  "h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer border border-transparent scale-[1.01]"
const toggleInactiveStyles =
  "h-12 rounded-xl font-medium text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground hover:border-border flex items-center justify-center cursor-pointer"

export function SpouseStep({ formData, updateFormData, onNext, onBack, isLoading }: SpouseStepProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window)
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

  const handleFieldChange = (field: keyof FormData, value: string) => {
    updateFormData({ [field]: value })
    setShowErrors(false)
  }

  const isFormValid =
    formData.spouseFirstName &&
    formData.spouseLastName &&
    formData.spouseHasValidPassport

  const getErrorClass = (fieldValue: FieldValue) => {
    return showErrors && !fieldValue ? "border-destructive bg-destructive/5 focus:ring-destructive/10" : ""
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Helper Text */}
      <div className="flex items-start gap-3.5 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl shadow-sm">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Please provide your spouse's information for the visa application.
        </p>
      </div>

      {/* Error Message */}
      {showErrors && !isFormValid && (
        <div
          className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-foreground text-sm"
          role="alert"
          aria-live="polite"
        >
          <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <span>Please fill in all required spouse information before continuing.</span>
        </div>
      )}

      {/* Spouse Information Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* First Name */}
        <div>
          <label htmlFor="spouseFirstName" className={labelStyles}>
            Spouse First Name *
          </label>
          <input
            id="spouseFirstName"
            value={formData.spouseFirstName || ""}
            onChange={(e) => handleFieldChange("spouseFirstName", e.target.value)}
            placeholder="Enter first name"
            required
            className={cn(inputStyles, "w-full", getErrorClass(formData.spouseFirstName))}
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="spouseLastName" className={labelStyles}>
            Spouse Last Name *
          </label>
          <input
            id="spouseLastName"
            value={formData.spouseLastName || ""}
            onChange={(e) => handleFieldChange("spouseLastName", e.target.value)}
            placeholder="Enter last name"
            required
            className={cn(inputStyles, "w-full", getErrorClass(formData.spouseLastName))}
          />
        </div>

        {/* Valid Passport */}
        <div className="md:col-span-2">
          <label className={labelStyles}>Does your spouse have a valid passport? *</label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              className={cn(
                "flex-1",
                formData.spouseHasValidPassport === "yes" ? toggleActiveStyles : toggleInactiveStyles
              )}
              onClick={() => {
                updateFormData({ spouseHasValidPassport: "yes" })
                setShowErrors(false)
              }}
            >
              Yes
            </button>
            <button
              type="button"
              className={cn(
                "flex-1",
                formData.spouseHasValidPassport === "no" ? toggleActiveStyles : toggleInactiveStyles
              )}
              onClick={() => {
                updateFormData({ spouseHasValidPassport: "no" })
                setShowErrors(false)
              }}
            >
              No
            </button>
          </div>
          {formData.spouseHasValidPassport === "yes" && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2.5 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/20">
              <Info className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Your spouse's passport should have at least 6 months validity from your travel date.</span>
            </p>
          )}
          {formData.spouseHasValidPassport === "no" && (
            <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2.5 bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/20">
              <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <span>Your spouse will need to obtain a valid passport before applying for a visa.</span>
            </p>
          )}
        </div>

        {/* Occupation */}
        <div className="md:col-span-2">
          <label htmlFor="spouseOccupation" className={labelStyles}>
            Spouse Occupation (Optional)
          </label>
          <input
            id="spouseOccupation"
            value={formData.spouseOccupation || ""}
            onChange={(e) => handleFieldChange("spouseOccupation", e.target.value)}
            placeholder="Enter occupation"
            className={cn(inputStyles, "w-full")}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="md:flex md:justify-between md:gap-4 fixed md:static bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border/80 md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none z-10 flex gap-3">
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
            "Continue"
          )}
        </Button>
      </div>
    </form>
  )
}
