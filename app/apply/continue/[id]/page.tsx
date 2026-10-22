"use client"

// Continue application (after payment): the passport number and the employment answers, asked after payment exactly as
// in the EZvisa app (mobile/app/continue/[id].tsx). Saved with the signed-in user's session into the same
// additional_notes keys (wizard + the website's employment keys) and the passport_number column. While the case is in
// review the database keeps only the notes, so the number is then kept in additional_notes.wizard (same as the app).
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { EmploymentStep } from "@/components/apply/employment-step"
import { createBrowserClient } from "@/lib/supabase/client"
import { continueAnswers, isPaidStatus, parseNotes } from "@/lib/wizard-rules"
import { cn } from "@/lib/utils"
import type { FormData, FormDataUpdate } from "@/lib/form-types"

type Row = { id: string; email: string; application_status: string | null; payment_status: string | null; passport_number: string | null; additional_notes: string | null; destination_country: string | null }
type State = { kind: "loading" } | { kind: "signin" } | { kind: "missing" } | { kind: "unpaid"; row: Row } | { kind: "closed"; row: Row } | { kind: "form"; row: Row }
const KEYS = ["passportNumber", "employmentStatus", "jobTitle", "companyName", "employmentStartDate", "monthlySalary", "hasNOC", "averageMonthlyIncome"] as const
const OPEN = ["draft", "submitted", "reviewing"]

export default function ContinueApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: "loading" })
  const [form, setForm] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let on = true
    ;(async () => {
      const sb = createBrowserClient()
      const { data: auth } = await sb.auth.getUser()
      const email = auth.user?.email?.toLowerCase()
      if (!email) return on && setState({ kind: "signin" })
      const { data } = await sb.from("visa_applications").select("id, email, application_status, payment_status, passport_number, additional_notes, destination_country").eq("id", id).eq("email", email).maybeSingle<Row>()
      if (!on) return
      if (!data) return setState({ kind: "missing" })
      if (!isPaidStatus(data.payment_status)) return setState({ kind: "unpaid", row: data })
      if (!OPEN.includes(data.application_status ?? "submitted")) return setState({ kind: "closed", row: data })
      const w = continueAnswers(data)
      const n = parseNotes(data.additional_notes)
      setForm(Object.fromEntries(KEYS.map((k) => [k, String(w[k] || n[k] || "")])))
      setState({ kind: "form", row: data })
    })().catch(() => on && setState({ kind: "missing" }))
    return () => {
      on = false
    }
  }, [id])

  const row = state.kind === "form" ? state.row : null
  const wizard = (row ? parseNotes(row.additional_notes).wizard ?? {} : {}) as Record<string, unknown>
  const needsPassport = wizard.hasValidPassport !== "no"
  const passportMissing = needsPassport && !form.passportNumber?.trim()

  const save = async () => {
    setTried(true)
    if (!row || passportMissing) return
    setSaving(true)
    setError(null)
    try {
      const emp = form.employmentStatus === "employed"
      const biz = form.employmentStatus === "business" || form.employmentStatus === "freelancer"
      // Only the answers that apply to the chosen status are kept (same clean-up as the app).
      const clean = {
        passportNumber: (form.passportNumber ?? "").trim().toUpperCase(),
        employmentStatus: form.employmentStatus ?? "",
        jobTitle: emp ? (form.jobTitle ?? "").trim() : "",
        companyName: emp || biz ? (form.companyName ?? "").trim() : "",
        employmentStartDate: emp ? form.employmentStartDate ?? "" : "",
        monthlySalary: emp ? form.monthlySalary ?? "" : "",
        hasNOC: emp ? form.hasNOC ?? "" : "",
        averageMonthlyIncome: biz ? (form.averageMonthlyIncome ?? "").trim() : "",
      }
      const sb = createBrowserClient()
      const { data: cur, error: readError } = await sb.from("visa_applications").select("additional_notes").eq("id", row.id).eq("email", row.email).single()
      if (readError) throw readError
      const n = parseNotes(cur.additional_notes)
      const notes = { ...n, wizard: { ...(n.wizard ?? {}), ...clean }, employmentStatus: clean.employmentStatus, jobTitle: clean.jobTitle, companyName: clean.companyName, monthlySalary: clean.monthlySalary }
      const { data, error: writeError } = await sb.from("visa_applications").update({ additional_notes: JSON.stringify(notes), passport_number: clean.passportNumber || null }).eq("id", row.id).eq("email", row.email).select("id")
      if (writeError) throw writeError
      if (!data?.length) throw new Error("Your application is already in review, so it can't be changed here. Please message us on WhatsApp.")
      router.push(`/dashboard?id=${row.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <SiteHeader />
      <div className="container mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 pb-16 pt-28 md:pt-36">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">After payment</span>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">Continue your application</h1>
          {row?.destination_country && <p className="text-base leading-relaxed text-muted-foreground">{row.destination_country} · #EZ-{row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}</p>}
        </div>

        {state.kind === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading your application…
          </div>
        )}
        {state.kind === "signin" && (
          <Notice text="Sign in with the email you applied with to continue.">
            <Button asChild className="rounded-full px-5">
              <Link href={`/login?next=${encodeURIComponent(`/apply/continue/${id}`)}`}>Sign in</Link>
            </Button>
          </Notice>
        )}
        {state.kind === "missing" && <Notice text="We couldn't find this application on your account." dashboard />}
        {state.kind === "unpaid" && <Notice text="These questions open after payment." dashboard />}
        {state.kind === "closed" && <Notice text="This application can't be changed any more." dashboard />}

        {state.kind === "form" && (
          <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            {needsPassport && (
              <div>
                <label htmlFor="passportNumber" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Passport Number *
                </label>
                <input
                  id="passportNumber"
                  type="text"
                  value={form.passportNumber ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value.toUpperCase() }))}
                  placeholder="e.g. A1234567"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className={cn(
                    "h-14 w-full rounded-xl border border-input bg-background px-4 text-base uppercase text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10",
                    tried && passportMissing && "border-destructive bg-destructive/5",
                  )}
                />
                {tried && passportMissing && <p className="mt-1 text-xs text-destructive">Please enter your passport number</p>}
              </div>
            )}
            <EmploymentStep
              formData={form as unknown as FormData}
              updateFormData={(d: FormDataUpdate) => setForm((f) => ({ ...f, ...(d as Record<string, string>) }))}
              onNext={save}
              onBack={() => router.push(`/dashboard?id=${id}`)}
              isLoading={saving}
              submitLabel="Save"
              backLabel="Later"
            />
            {error && (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Notice({ text, dashboard, children }: { text: string; dashboard?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
      {children}
      {dashboard && (
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      )}
    </div>
  )
}
