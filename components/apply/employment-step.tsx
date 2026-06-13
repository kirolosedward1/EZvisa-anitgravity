"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate, FieldValue } from "@/lib/form-types"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"

interface EmploymentStepProps {
  formData: FormData
  updateFormData: (data: FormDataUpdate) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 shadow-sm"
const selectStyles =
  "h-14 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-4 text-base font-medium text-foreground transition-all duration-300 appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-background/80 focus:border-blue-500 focus:bg-background focus:ring-4 focus:ring-blue-500/10 focus:outline-none pr-10 shadow-sm"
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActiveStyles =
  "h-12 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer border border-transparent scale-[1.01]"
const toggleInactiveStyles =
  "h-12 rounded-xl font-medium text-sm transition-all duration-300 bg-background/40 text-muted-foreground border border-border/80 hover:bg-background/90 hover:text-foreground hover:border-border flex items-center justify-center cursor-pointer"

export function EmploymentStep({ formData, updateFormData, onNext, onBack, isLoading }: EmploymentStepProps) {
  const [showErrors, setShowErrors] = useState(false)

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

  // Conditional validation based on status
  const isFormValid =
    formData.employmentStatus &&
    (formData.employmentStatus !== "employed" ||
      (formData.jobTitle && formData.companyName && formData.employmentStartDate && formData.monthlySalary)) &&
    ((formData.employmentStatus !== "business" && formData.employmentStatus !== "freelancer") ||
      (formData.companyName && formData.averageMonthlyIncome))

  const getErrorClass = (fieldValue: FieldValue) => {
    return showErrors && !fieldValue ? "border-destructive bg-destructive/5 focus:ring-destructive/10" : ""
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Employment details help us strengthen your visa application and create a compelling cover letter.
      </p>

      {showErrors && !isFormValid && (
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-foreground text-sm">
          <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <span>Please fill in all required fields for your selected employment status.</span>
        </div>
      )}

      <div>
        <label htmlFor="employmentStatus" className={labelStyles}>
          Employment Status *
        </label>
        <select
          id="employmentStatus"
          value={formData.employmentStatus || ""}
          onChange={(e) => handleFieldChange("employmentStatus", e.target.value as any)}
          className={cn(selectStyles, "w-full", getErrorClass(formData.employmentStatus))}
        >
          <option value="">Select employment status</option>
          <option value="employed">Employed</option>
          <option value="business">Business Owner</option>
          <option value="freelancer">Freelancer</option>
          <option value="student">Student</option>
          <option value="unemployed">Unemployed</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {formData.employmentStatus === "employed" && (
        <div className="grid gap-6 md:grid-cols-2 p-6 bg-muted/20 rounded-2xl border border-border/60">
          <div>
            <label htmlFor="jobTitle" className={labelStyles}>
              Job Title *
            </label>
            <input
              id="jobTitle"
              value={formData.jobTitle || ""}
              onChange={(e) => handleFieldChange("jobTitle", e.target.value)}
              placeholder="Enter job title"
              className={cn(inputStyles, "w-full", getErrorClass(formData.jobTitle))}
            />
          </div>

          <div>
            <label htmlFor="companyName" className={labelStyles}>
              Company Name *
            </label>
            <input
              id="companyName"
              value={formData.companyName || ""}
              onChange={(e) => handleFieldChange("companyName", e.target.value)}
              placeholder="Enter company name"
              className={cn(inputStyles, "w-full", getErrorClass(formData.companyName))}
            />
          </div>

          <div>
            <label htmlFor="employmentStartDate" className={labelStyles}>
              Employment Start Date *
            </label>
            <CustomDatePicker
              id="employmentStartDate"
              placeholder="Select start date"
              max={new Date().toISOString().split("T")[0]}
              value={formData.employmentStartDate || ""}
              onChange={(val) => handleFieldChange("employmentStartDate", val)}
              className={cn(getErrorClass(formData.employmentStartDate))}
            />
          </div>

          <div>
            <label htmlFor="monthlySalary" className={labelStyles}>
              Monthly Salary Range *
            </label>
            <select
              id="monthlySalary"
              value={formData.monthlySalary || ""}
              onChange={(e) => handleFieldChange("monthlySalary", e.target.value)}
              className={cn(selectStyles, "w-full", getErrorClass(formData.monthlySalary))}
            >
              <option value="">Select range</option>
              <option value="under-5000">Under 5,000 AED</option>
              <option value="5000-10000">5,000 - 10,000 AED</option>
              <option value="10000-15000">10,000 - 15,000 AED</option>
              <option value="15000-plus">15,000+ AED</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelStyles}>Do you have a No Objection Certificate?</label>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                className={cn("flex-1", formData.hasNOC === "yes" ? toggleActiveStyles : toggleInactiveStyles)}
                onClick={() => handleFieldChange("hasNOC", "yes")}
              >
                Yes
              </button>
              <button
                type="button"
                className={cn("flex-1", formData.hasNOC === "no" ? toggleActiveStyles : toggleInactiveStyles)}
                onClick={() => handleFieldChange("hasNOC", "no")}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {(formData.employmentStatus === "business" || formData.employmentStatus === "freelancer") && (
        <div className="grid gap-6 md:grid-cols-2 p-6 bg-muted/20 rounded-2xl border border-border/60">
          <div>
            <label htmlFor="companyName" className={labelStyles}>
              Company Name *
            </label>
            <input
              id="companyName"
              value={formData.companyName || ""}
              onChange={(e) => handleFieldChange("companyName", e.target.value)}
              placeholder="Enter company name"
              className={cn(inputStyles, "w-full", getErrorClass(formData.companyName))}
            />
          </div>

          <div>
            <label htmlFor="averageMonthlyIncome" className={labelStyles}>
              Average Monthly Income *
            </label>
            <input
              id="averageMonthlyIncome"
              type="text"
              placeholder="e.g., 15,000 AED"
              value={formData.averageMonthlyIncome || ""}
              onChange={(e) => handleFieldChange("averageMonthlyIncome", e.target.value)}
              className={cn(inputStyles, "w-full", getErrorClass(formData.averageMonthlyIncome))}
            />
          </div>
        </div>
      )}

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
            "Continue to Trip Details"
          )}
        </Button>
      </div>
    </form>
  )
}
