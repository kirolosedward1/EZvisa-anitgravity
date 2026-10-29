import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SupportApplication } from "@/components/support-application"
import { AppointmentForm } from "@/app/appointment/[id]/appointment-form"
import { getOwnApplication, getSessionUser } from "@/lib/applications"
import { appointmentReachable, isPaidStatus } from "@/lib/appointment"
import { getStatusLabel } from "@/lib/application-status"
import { withArabicMeta } from "@/lib/page-meta"
import { redirectLocalized, requestLocale } from "@/lib/request-locale"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    { title: "Appointment", robots: { index: false, follow: false } },
    { title: "الموعد", path: "/ar/appointment" },
  )
}

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ focus?: string }>
}) {
  const arabic = (await requestLocale()) === "ar"
  const { id } = await params
  const { focus } = await searchParams
  const user = await getSessionUser()
  if (!user) redirectLocalized(`/login?next=/appointment/${id}`, arabic)

  const app = await getOwnApplication(user, id)
  if (!app?.id) redirectLocalized("/dashboard", arabic)
  if (!isPaidStatus(app.payment_status)) redirectLocalized(`/dashboard?id=${id}&pay=1#pay`, arabic)

  const token = app.tracking_token || ""
  const dossier = token ? `/track/${token}/dossier` : `/dashboard?id=${id}`
  if (!appointmentReachable(app)) {
    const status = (app.application_status || "").toLowerCase()
    if (status === "ready" && token) redirectLocalized(dossier, arabic)
    redirectLocalized(`/dashboard?id=${id}`, arabic)
  }

  const screen = focus === "date" || focus === "when" ? "when" : focus === "help" || focus === "later" ? "later" : "question"

  return (
    <div className="min-h-[100dvh] bg-[#FFFFFF]">
      <SiteHeader />
      <main id="main-content">
        <SupportApplication id={app.id} country={app.destination_country} status={getStatusLabel(app).label} step="appointment" />
        <AppointmentForm
          applicationId={app.id}
          destination={app.destination_country || ""}
          dossierHref={dossier}
          initialScreen={screen}
        />
      </main>
    </div>
  )
}
