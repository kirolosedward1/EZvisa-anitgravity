import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, Briefcase } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ContinueApplicationForm } from "@/components/dashboard/continue-application-form"
import { getApplicationByToken } from "@/lib/applications"
import { continueAnswers, needsContinue, parseNotes, referenceOf } from "@/lib/shared/wizard-contract"

export const metadata: Metadata = {
  title: "Continue your application",
  robots: { index: false, follow: false },
}

export default async function TrackContinuePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const app = await getApplicationByToken(token)
  if (!app || !app.id) notFound()
  if (!needsContinue(app)) redirect(`/track/${token}`)

  const answers = continueAnswers(app)
  const hasValidPassport = parseNotes(app.additional_notes).wizard?.hasValidPassport ?? ""

  return (
    <>
      <SiteHeader forceBackground />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-2xl mx-auto flex flex-col gap-6">
          <Link href={`/track/${token}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to your case
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
                  Passport and employment. Then upload your documents.
                </p>
              </div>
            </div>

            <ContinueApplicationForm applicationId={app.id} trackingToken={token} initial={answers} hasValidPassport={hasValidPassport} returnTo={`/track/${token}`} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
