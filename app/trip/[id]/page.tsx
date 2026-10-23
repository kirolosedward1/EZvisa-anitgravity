import { redirect } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { createServerClient } from "@/lib/supabase/server"
import { getStatusLabel, isPaid } from "@/lib/application-status"
import { getDemoApplicationByToken } from "@/lib/demo-data"
import { PreparationLine } from "@/components/ready-line"
import type { VisaApplication } from "@/lib/types/visa-application"
import { SupportApplication } from "@/components/support-application"

export const metadata = { title: "Trip plan", robots: { index: false, follow: false } }

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const demo = id.startsWith("demo-") ? getDemoApplicationByToken(id) : null
  let app: VisaApplication | null = demo

  if (!demo) {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user?.email) redirect(`/login?next=/trip/${id}`)
    const { data } = await supabase.from("visa_applications").select("*").eq("id", id).eq("email", auth.user.email).maybeSingle()
    app = data
  }

  if (!app) redirect("/dashboard")
  if (!isPaid(app)) redirect(`/dashboard?id=${id}&pay=1#pay`)

  const start = app.entry_date || app.travel_start_date
  const end = app.exit_date || app.travel_end_date
  const token = app.tracking_token

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-background px-4 py-16">
        <SupportApplication id={app.id ?? id} country={app.destination_country} status={getStatusLabel(app).label} step="trip" />
        <article className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{app.destination_country} trip plan</h1>
          <p className="text-sm leading-relaxed text-muted-foreground"><PreparationLine /></p>
          <dl className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Traveller</dt>
              <dd className="font-medium text-foreground">{app.full_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Departure</dt>
              <dd className="ltr-isolate font-medium text-foreground">{start || "To be added"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Return</dt>
              <dd className="ltr-isolate font-medium text-foreground">{end || "To be added"}</dd>
            </div>
          </dl>
          {token ? (
            <Link href={`/track/${token}/dossier`} className="text-sm font-medium text-primary">
              Open the prepared visa file
            </Link>
          ) : null}
        </article>
      </main>
      <Footer />
    </>
  )
}
