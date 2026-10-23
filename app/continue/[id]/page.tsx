import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ContinueForm } from "@/app/continue/[id]/continue-form"
import { createServerClient } from "@/lib/supabase/server"
import { docsMissingCount, getStatusLabel, isPaid, missingDetailSteps } from "@/lib/application-status"
import { getDemoApplicationByToken } from "@/lib/demo-data"
import type { VisaApplication } from "@/lib/types/visa-application"
import { SupportApplication } from "@/components/support-application"
import type { FormData } from "@/lib/form-types"

export const metadata = { title: "Continue application", robots: { index: false, follow: false } }

/** Answers already saved on the row (wizard notes from the website or the app, then the columns), to pre-fill. */
function savedAnswers(app: VisaApplication): Partial<FormData> {
  let notes: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(app.additional_notes || "{}")
    if (parsed && typeof parsed === "object") notes = parsed
  } catch {
    notes = {}
  }
  const wizard = (notes.wizard && typeof notes.wizard === "object" ? notes.wizard : {}) as Partial<FormData>
  return {
    ...wizard,
    purposeOfTrip: wizard.purposeOfTrip || app.travel_purpose || "",
    travelStartDate: wizard.travelStartDate || app.entry_date || "",
    travelEndDate: wizard.travelEndDate || app.exit_date || "",
    passportNumber: wizard.passportNumber || app.passport_number || "",
    destination: app.destination_country || wizard.destination || "",
    spouseAccompanying: notes.spouseAccompanying === "yes" || wizard.spouseAccompanying === "yes" ? "yes" : "no",
    employmentStatus: (wizard.employmentStatus || notes.employmentStatus || "") as FormData["employmentStatus"],
    // Saved travellers the wizard / spouse step were filled from (the spouse drop-down leaves the main applicant out).
    travellerId: typeof notes.travellerId === "string" ? notes.travellerId : "",
    spouseTravellerId: typeof notes.spouseTravellerId === "string" ? notes.spouseTravellerId : "",
  }
}

export default async function ContinuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const demo = id.startsWith("demo-") ? getDemoApplicationByToken(id) : null
  let app: VisaApplication | null = demo

  if (!demo) {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user?.email) redirect(`/login?next=/continue/${id}`)
    const { data } = await supabase.from("visa_applications").select("*").eq("id", id).eq("email", auth.user.email).maybeSingle()
    app = data
  }

  if (!app) redirect("/dashboard")
  if (!isPaid(app)) redirect(`/dashboard?id=${id}&pay=1#pay`)

  const steps = missingDetailSteps(app)
  const token = app.tracking_token || ""
  if (steps.length === 0) {
    redirect(docsMissingCount(app) > 0 && token ? `/track/${token}/upload` : `/dashboard?id=${id}`)
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFFFFF]">
      <SiteHeader />
      <main id="main-content">
        <SupportApplication id={app.id ?? id} country={app.destination_country} status={getStatusLabel(app).label} step="continue" />
        <ContinueForm
          applicationId={id}
          steps={steps}
          uploadHref={token ? `/track/${token}/upload` : `/dashboard?id=${id}`}
          initial={savedAnswers(app)}
        />
      </main>
    </div>
  )
}
