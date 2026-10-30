import { ApplicationOverview } from "@/components/dashboard/application-overview"
import { ApplicationSwitcher } from "@/components/dashboard/application-switcher"
import { ActivityCard } from "@/components/dashboard/activity-card"
import { AppointmentCard } from "@/components/dashboard/appointment-card"
import { AppointmentCountdown, daysUntil } from "@/components/dashboard/appointment-countdown"
import { MobileActionBar } from "@/components/dashboard/mobile-action-bar"
import { NeedsYouCard } from "@/components/dashboard/needs-you-card"
import { TripCard } from "@/components/dashboard/trip-card"
import { CaseSummary } from "@/components/dashboard/case-summary"
import { DocumentChecklist } from "@/components/dashboard/document-checklist"
import { InsuranceCard } from "@/components/dashboard/insurance-card"
import { ProgressCard } from "@/components/dashboard/progress-tracker"
import { SupportCard } from "@/components/dashboard/support-card"
import { getSessionUser } from "@/lib/applications"
import { ownsApplication } from "@/lib/appointment"
import { customerProgress, getStage, isPaid } from "@/lib/application-status"
import { applicationInsurance } from "@/lib/insurance"
import { loadDocumentReviews } from "@/lib/document-reviews-server"
import { loadApplicationEvents } from "@/lib/application-events-server"
import { specialistName } from "@/lib/application-events"
import { tripMates } from "@/lib/trips"
import { requestLocale } from "@/lib/request-locale"
import { customerText } from "@/lib/translations/customer"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * The application detail layout shared by /dashboard and /track/[token]: switcher, then "What we need from you" (two or
 * more items), the case card with its one next step, the appointment countdown, the trip's other travellers,
 * documents and insurance in the main column; progress, activity, case details and support in the sidebar.
 * The tracking page passes showInsurance and allowDiscard as false (owner-only actions).
 */
export async function ApplicationView({
  app,
  relatedApps,
  hrefFor,
  showTrackingLink,
  allowDiscard,
  showInsurance = false,
  allAppsHref,
}: {
  app: VisaApplication
  relatedApps: VisaApplication[]
  hrefFor: (app: VisaApplication) => string
  showTrackingLink?: boolean
  allowDiscard?: boolean
  showInsurance?: boolean
  /** The switcher's "View all applications" link (the dashboard's table page); none on the tracking page. */
  allAppsHref?: string
}) {
  const stage = getStage(app)
  const arabic = (await requestLocale()) === "ar"
  const locale = arabic ? "ar" : "en"
  const viewer = await getSessionUser()
  const showHelp = Boolean(viewer && ownsApplication(app, viewer.email) && isPaid(app))
  const open = stage !== "rejected" && stage !== "cancelled"
  const progress = open ? customerProgress(app) : null
  const insurance = applicationInsurance(app.additional_notes)
  const [reviews, events] = await Promise.all([loadDocumentReviews(app.id), loadApplicationEvents(app.id)])
  const specialist = specialistName(app, events)
  const mates = tripMates(app, relatedApps)
  const countdown = !!app.appointment_at && !Number.isNaN(Date.parse(app.appointment_at)) && daysUntil(app.appointment_at) >= 0

  return (
    <div className="ez-application-view flex flex-col gap-7">
      <ApplicationSwitcher apps={relatedApps} activeId={app.id} hrefFor={hrefFor} arabic={arabic} allHref={allAppsHref} />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <NeedsYouCard app={app} reviews={reviews} arabic={arabic} />
          <ApplicationOverview app={app} stage={stage} arabic={arabic} reviews={reviews} />
          {progress && (
            <div className="lg:hidden">
              <ProgressCard collapsible progress={progress} arabic={arabic} insurance={insurance} showInsurance={showInsurance} app={app} reviews={reviews} />
            </div>
          )}
          {countdown ? <AppointmentCountdown app={app} arabic={arabic} showInsurance={showInsurance} /> : <AppointmentCard app={app} arabic={arabic} showHelp={showHelp} />}
          <TripCard app={app} mates={mates} hrefFor={hrefFor} arabic={arabic} />
          <DocumentChecklist app={app} arabic={arabic} reviews={reviews} />
          {showInsurance && app.id && isPaid(app) && open && (
            <InsuranceCard key={app.id} applicationId={app.id} initialValue={insurance} arabic={arabic} />
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-5" aria-label={customerText(locale, "case.aside")}>
          {progress && (
            <div className="hidden lg:block">
              <ProgressCard progress={progress} arabic={arabic} insurance={insurance} showInsurance={showInsurance} app={app} reviews={reviews} />
            </div>
          )}
          <ActivityCard app={app} reviews={reviews} events={events} arabic={arabic} />
          <CaseSummary app={app} stage={stage} showTrackingLink={showTrackingLink} allowDiscard={allowDiscard} arabic={arabic} specialist={specialist} />
          <SupportCard id={app.id} token={app.tracking_token ?? ""} destination={app.destination_country} stage={stage} specialist={specialist} />
        </aside>
      </div>
      {open && <MobileActionBar app={app} stage={stage} reviews={reviews} arabic={arabic} />}
    </div>
  )
}
