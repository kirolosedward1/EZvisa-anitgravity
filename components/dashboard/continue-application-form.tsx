"use client"

// After payment: passport number + employment details, the same fields and rules as the app's Continue screen
// (mobile/app/continue/[id].tsx), saved through POST /api/continue-application.
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { EMPLOYMENT, SALARY, emptyAnswers, validateEmployment, validatePassportNumber, iso, type WizardAnswers, type Errors } from "@/lib/shared/wizard-contract"

type Answers = Pick<WizardAnswers, "passportNumber" | "employmentStatus" | "jobTitle" | "companyName" | "employmentStartDate" | "monthlySalary" | "hasNOC" | "averageMonthlyIncome">

const inputStyles =
  "h-14 rounded-xl border border-border/80 bg-background px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 placeholder:font-normal hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none shadow-sm w-full"
const selectStyles = cn(inputStyles, "appearance-none cursor-pointer pr-10")
const labelStyles = "text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
const toggleActive = "h-12 rounded-xl font-semibold text-sm bg-primary text-primary-foreground shadow-sm flex items-center justify-center cursor-pointer border border-transparent"
const toggleInactive = "h-12 rounded-xl font-medium text-sm bg-background text-muted-foreground border border-border/80 hover:bg-secondary hover:text-foreground flex items-center justify-center cursor-pointer"
const errorStyles = "border-destructive bg-destructive/5"

export function ContinueApplicationForm({ applicationId, trackingToken, initial, hasValidPassport, returnTo }: {
  applicationId: string
  trackingToken?: string
  initial: Partial<Answers>
  hasValidPassport: string
  returnTo: string
}) {
  const router = useRouter()
  const [f, setF] = useState<Answers>({
    passportNumber: initial.passportNumber ?? "",
    employmentStatus: initial.employmentStatus ?? "",
    jobTitle: initial.jobTitle ?? "",
    companyName: initial.companyName ?? "",
    employmentStartDate: initial.employmentStartDate ?? "",
    monthlySalary: initial.monthlySalary ?? "",
    hasNOC: initial.hasNOC ?? "",
    averageMonthlyIncome: initial.averageMonthlyIncome ?? "",
  })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const errors: Errors = useMemo(
    () => ({ ...validatePassportNumber({ hasValidPassport: hasValidPassport as WizardAnswers["hasValidPassport"], passportNumber: f.passportNumber }), ...validateEmployment({ ...emptyAnswers, ...f }) }),
    [f, hasValidPassport],
  )
  const valid = Object.keys(errors).length === 0
  const emp = f.employmentStatus === "employed"
  const biz = f.employmentStatus === "business" || f.employmentStatus === "freelancer"
  const set = (p: Partial<Answers>) => setF((x) => ({ ...x, ...p }))
  const show = (k: keyof Answers) => (tried || !!String(f[k] ?? "").trim()) && errors[k]
  const errorText = (k: keyof Answers) => (show(k) ? <p className="text-xs text-red-600 mt-1" role="alert">{errors[k]}</p> : null)

  const save = async () => {
    setTried(true)
    if (!valid) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/continue-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, trackingToken, ...f }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.message || "Could not save your details")
      router.push(returnTo)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your details")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {hasValidPassport !== "no" && (
        <div>
          <label htmlFor="passportNumber" className={labelStyles}>Passport Number *</label>
          <input
            id="passportNumber"
            value={f.passportNumber}
            onChange={(e) => set({ passportNumber: e.target.value.toUpperCase() })}
            placeholder="e.g. A1234567"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={cn(inputStyles, "uppercase", show("passportNumber") && errorStyles)}
          />
          {errorText("passportNumber")}
        </div>
      )}

      <div>
        <label htmlFor="employmentStatus" className={labelStyles}>Employment Status *</label>
        <select
          id="employmentStatus"
          value={f.employmentStatus}
          onChange={(e) => {
            const v = e.target.value as Answers["employmentStatus"]
            set({ employmentStatus: v, ...(v !== "employed" ? { hasNOC: "" } : {}) })
          }}
          className={cn(selectStyles, show("employmentStatus") && errorStyles)}
        >
          <option value="">Select employment status</option>
          {EMPLOYMENT.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {errorText("employmentStatus")}
      </div>

      {emp && (
        <div className="grid gap-6 md:grid-cols-2 p-6 bg-secondary/40 rounded-2xl border border-border/60">
          <div>
            <label htmlFor="jobTitle" className={labelStyles}>Job Title *</label>
            <input id="jobTitle" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} placeholder="Enter job title" className={cn(inputStyles, show("jobTitle") && errorStyles)} />
            {errorText("jobTitle")}
          </div>
          <div>
            <label htmlFor="companyName" className={labelStyles}>Company Name *</label>
            <input id="companyName" value={f.companyName} onChange={(e) => set({ companyName: e.target.value })} placeholder="Enter company name" className={cn(inputStyles, show("companyName") && errorStyles)} />
            {errorText("companyName")}
          </div>
          <div>
            <label htmlFor="employmentStartDate" className={labelStyles}>Employment Start Date *</label>
            <CustomDatePicker id="employmentStartDate" placeholder="Select start date" max={iso(new Date())} value={f.employmentStartDate} onChange={(v) => set({ employmentStartDate: v })} className={cn(show("employmentStartDate") && errorStyles)} />
            {errorText("employmentStartDate")}
          </div>
          <div>
            <label htmlFor="monthlySalary" className={labelStyles}>Monthly Salary Range *</label>
            <select id="monthlySalary" value={f.monthlySalary} onChange={(e) => set({ monthlySalary: e.target.value })} className={cn(selectStyles, show("monthlySalary") && errorStyles)}>
              <option value="">Select range</option>
              {SALARY.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errorText("monthlySalary")}
          </div>
          <div className="md:col-span-2">
            <label className={labelStyles}>Do you have a No Objection Certificate? (Optional)</label>
            <div className="flex gap-3">
              <button type="button" className={cn("flex-1", f.hasNOC === "yes" ? toggleActive : toggleInactive)} onClick={() => set({ hasNOC: "yes" })}>Yes</button>
              <button type="button" className={cn("flex-1", f.hasNOC === "no" ? toggleActive : toggleInactive)} onClick={() => set({ hasNOC: "no" })}>No</button>
            </div>
          </div>
        </div>
      )}

      {biz && (
        <div className="grid gap-6 md:grid-cols-2 p-6 bg-secondary/40 rounded-2xl border border-border/60">
          <div>
            <label htmlFor="companyName" className={labelStyles}>Company Name *</label>
            <input id="companyName" value={f.companyName} onChange={(e) => set({ companyName: e.target.value })} placeholder="Enter company name" className={cn(inputStyles, show("companyName") && errorStyles)} />
            {errorText("companyName")}
          </div>
          <div>
            <label htmlFor="averageMonthlyIncome" className={labelStyles}>Average Monthly Income *</label>
            <input id="averageMonthlyIncome" value={f.averageMonthlyIncome} onChange={(e) => set({ averageMonthlyIncome: e.target.value })} placeholder="e.g., 15,000 AED" className={cn(inputStyles, show("averageMonthlyIncome") && errorStyles)} />
            {errorText("averageMonthlyIncome")}
          </div>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      <Button type="submit" disabled={busy || (tried && !valid)} className="h-12 rounded-xl font-semibold">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save and continue"
        )}
      </Button>
    </form>
  )
}
