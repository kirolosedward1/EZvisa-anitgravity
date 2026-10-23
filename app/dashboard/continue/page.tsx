import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, Briefcase } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ContinueApplicationForm } from "@/components/dashboard/continue-application-form"
import { getSessionUser, getOwnApplication } from "@/lib/applications"
import { continueAnswers, needsContinue, parseNotes, referenceOf } from "@/lib/shared/wizard-contract"

export const metadata: Metadata = {
  title: "Continue your application | EZvisa",
  robots: { index: false, follow: false },
}

export default async function ContinueApplicationPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/continue${id ? `?id=${id}` : ""}`)}`)
  if (!id) redirect("/dashboard")

  const app = await getOwnApplication(user, id)
  if (!app || !app.id) redirect("/dashboard")
  if (!needsContinue(app)) redirect(`/dashboard?id=${app.id}`)

  const answers = continueAnswers(app)
  const hasValidPassport = parseNotes(app.additional_notes).wizard?.hasValidPassport ?? ""

  return (
    <>
      <SiteHeader forceBackground />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-2xl mx-auto flex flex-col gap-6">
          <Link href={`/dashboard?id=${app.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Link>

          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {referenceOf(app.id)} · {app.destination_country}
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Continue application</h1>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  Passport and employment. Then upload your documents. The same step you would see in the EZvisa app.
                </p>
              </div>
            </div>

            <ContinueApplicationForm applicationId={app.id} initial={answers} hasValidPassport={hasValidPassport} returnTo={`/dashboard?id=${app.id}`} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
