"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { datesInOrder, INVALID_DATE_MESSAGE, RETURN_AFTER_DEPARTURE } from "@/lib/dates"
import type { DetailStep } from "@/lib/application-status"

function minDeparture() {
  const date = new Date()
  date.setDate(date.getDate() + 15)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function ContinueForm({
  applicationId,
  steps,
  uploadHref,
}: {
  applicationId: string
  steps: DetailStep[]
  uploadHref: string
}) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [hasPassport, setHasPassport] = useState("")
  const [passportNumber, setPassportNumber] = useState("")
  const [employment, setEmployment] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const step = steps[index]

  const save = async (finished: boolean) => {
    setPending(true)
    setError("")
    const response = await fetch("/api/continue-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: applicationId,
        travelStartDate: start,
        travelEndDate: end,
        hasValidPassport: hasPassport,
        passportNumber,
        employmentStatus: employment,
      }),
    })
    const data = await response.json().catch(() => ({}))
    setPending(false)
    if (!response.ok) {
      setError(data.error || "Could not save these details.")
      return
    }
    if (!finished) {
      setIndex((current) => current + 1)
      return
    }
    router.push(uploadHref)
    router.refresh()
  }

  const next = () => {
    if (step === "dates") {
      if (!start || !end) {
        setError(INVALID_DATE_MESSAGE)
        return
      }
      if (!datesInOrder(start, end)) {
        setError(RETURN_AFTER_DEPARTURE)
        return
      }
    }
    if (step === "passport" && hasPassport !== "no" && passportNumber.trim().length < 5) {
      setError("Enter your passport number, or say you do not have a valid passport.")
      return
    }
    if (step === "employment" && !employment) {
      setError("Choose your employment status.")
      return
    }
    setError("")
    const finished = index >= steps.length - 1
    void save(finished)
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-primary">
          Step {index + 1} of {steps.length}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Continue application</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Payment is confirmed. Add the details we still need before you upload documents.
        </p>
      </div>

      {step === "dates" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="departure">
              Departure date
            </label>
            <CustomDatePicker id="departure" value={start} min={minDeparture()} onChange={setStart} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="return">
              Return date
            </label>
            <CustomDatePicker id="return" value={end} min={start || minDeparture()} onChange={setEnd} />
          </div>
        </div>
      )}

      {step === "passport" && (
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground">
            Do you have a valid passport?
            <select
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3"
              value={hasPassport}
              onChange={(event) => setHasPassport(event.target.value)}
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          {hasPassport !== "no" && (
            <label className="text-sm font-medium text-foreground">
              Passport number
              <input
                className="ltr-isolate mt-2 h-12 w-full rounded-xl border border-input bg-background px-3"
                value={passportNumber}
                onChange={(event) => setPassportNumber(event.target.value.toUpperCase())}
              />
            </label>
          )}
        </div>
      )}

      {step === "employment" && (
        <label className="text-sm font-medium text-foreground">
          Employment status
          <select
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3"
            value={employment}
            onChange={(event) => setEmployment(event.target.value)}
          >
            <option value="">Select employment status</option>
            <option value="employed">Employed</option>
            <option value="business">Business owner</option>
            <option value="freelancer">Freelancer</option>
            <option value="student">Student</option>
            <option value="unemployed">Unemployed</option>
            <option value="retired">Retired</option>
          </select>
        </label>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" className="h-12 rounded-xl" onClick={next} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {index >= steps.length - 1 ? "Save and upload documents" : "Continue"}
      </Button>
    </div>
  )
}
