import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ContinueForm } from "@/app/continue/[id]/continue-form"
import { createServerClient } from "@/lib/supabase/server"
import { docsMissingCount, isPaid, missingDetailSteps } from "@/lib/application-status"
import { getDemoApplicationByToken } from "@/lib/demo-data"
import type { VisaApplication } from "@/lib/types/visa-application"

export const metadata = { title: "Continue application", robots: { index: false, follow: false } }

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
    <>
      <SiteHeader />
      <main id="main-content" className="bg-background px-4 py-16">
        <ContinueForm applicationId={id} steps={steps} uploadHref={token ? `/track/${token}/upload` : `/dashboard?id=${id}`} />
      </main>
      <Footer />
    </>
  )
}
