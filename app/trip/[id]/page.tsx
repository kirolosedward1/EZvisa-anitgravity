import { redirect } from "next/navigation"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/components/country-flag"
import { SCHENGEN_META } from "@/lib/countries"
import { schengenStayDays } from "@/lib/dates"
import { FILE_READY_STATUSES, PURPOSES, parseNotes } from "@/lib/shared/wizard-contract"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { createServerClient } from "@/lib/supabase/server"
import { getStatusLabel, isPaid } from "@/lib/application-status"
import { getDemoApplicationByToken } from "@/lib/demo-data"
import { PreparationLine } from "@/components/ready-line"
import type { VisaApplication } from "@/lib/types/visa-application"
import { SupportApplication } from "@/components/support-application"

import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    { title: "Trip plan", robots: { index: false, follow: false } },
    { title: "خطة الرحلة", path: "/ar/trip" },
  )
}

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
  const wizard = parseNotes(app.additional_notes).wizard ?? {}
  const purposeRaw = String(app.travel_purpose || wizard.purposeOfTrip || "")
  const purpose = PURPOSES.find((p) => p.value === purposeRaw.toLowerCase())?.label || (purposeRaw ? purposeRaw[0].toUpperCase() + purposeRaw.slice(1) : "")
  const days = app.duration_days || (start && end ? schengenStayDays(start, end) : null)
  const others = ((wizard.additionalCountries ?? []) as { country: string; arrivalDate: string; departureDate: string }[]).filter((v) => v?.country)
  const ready = FILE_READY_STATUSES.includes(app.application_status || "")
  const fmt = (d?: string | null) => (d ? format(parseISO(d), "EEE, d MMM yyyy") : null)
  const country = app.destination_country || "Schengen"

  const rows: [string, React.ReactNode][] = [
    ["Traveller", app.full_name],
    ["Departure", fmt(start) ?? "Add it in Continue application"],
    ["Return", fmt(end) ?? "Add it in Continue application"],
    ["Length", days ? `${days} day${days === 1 ? "" : "s"} in the Schengen area` : "—"],
    ["Purpose", purpose || "—"],
  ]

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="min-h-screen bg-secondary/40 px-4 pb-20 pt-28 md:pt-32">
        <SupportApplication id={app.id ?? id} country={app.destination_country} status={getStatusLabel(app).label} step="trip" />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Link href={`/dashboard?id=${app.id ?? id}`} className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            Back to your application
          </Link>

          <div className="flex flex-col gap-2">
            <h1 className="app-title text-foreground">Your {country} trip</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The dates and plan your visa file is built on. The embassy compares them with your bookings and itinerary, so they need to match.
            </p>
          </div>

          <section aria-label="Trip details" className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="flex items-center gap-3 px-6 pb-2 pt-5">
              <CountryFlag iso={SCHENGEN_META[country]?.iso} country={country} className="size-8" />
              <h2 className="panel-title text-foreground">{country}</h2>
            </div>
            <dl className="divide-y divide-border/60">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-6 px-6 py-3.5 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="ltr-isolate text-end font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {others.length ? (
            <section aria-label="Other countries" className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
              <h2 className="panel-title px-6 pb-2 pt-5 text-foreground">Also visiting</h2>
              <ul className="divide-y divide-border/60">
                {others.map((v) => (
                  <li key={`${v.country}-${v.arrivalDate}`} className="flex items-center gap-3 px-6 py-3.5 text-sm">
                    <CountryFlag iso={SCHENGEN_META[v.country]?.iso} country={v.country} className="size-6" />
                    <span className="flex-1 font-medium text-foreground">{v.country}</span>
                    <span className="ltr-isolate text-muted-foreground">{fmt(v.arrivalDate)} – {fmt(v.departureDate)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {ready && token ? (
              <Button asChild className="rounded-full">
                <Link href={`/track/${token}/dossier`}>Open your visa file</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="rounded-full hover:bg-secondary hover:text-foreground">
              <Link href={`/dashboard?id=${app.id ?? id}`}>See your application</Link>
            </Button>
          </div>
          {!ready ? <p className="text-sm text-muted-foreground"><PreparationLine /></p> : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
