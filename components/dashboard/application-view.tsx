import { ApplicationOverview } from "@/components/dashboard/application-overview"
import { ApplicationSwitcher } from "@/components/dashboard/application-switcher"
import { AppointmentCard } from "@/components/dashboard/appointment-card"
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
import { requestLocale } from "@/lib/request-locale"
import { customerText } from "@/lib/translations/customer"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * The application detail layout shared by /dashboard and /track/[token]: switcher, then the case card with its one
 * next step, documents and insurance in the main column, and progress, case details and support in the sidebar.
 * The tracking page passes showInsurance and allowDiscard as false (owner-only actions).
 */
export async function ApplicationView({
  app,
  relatedApps,
  hrefFor,
  showTrackingLink,
  allowDiscard,
  showInsurance = false,
}: {
  app: VisaApplication
  relatedApps: VisaApplication[]
  hrefFor: (app: VisaApplication) => string
  showTrackingLink?: boolean
  allowDiscard?: boolean
  showInsurance?: boolean
}) {
  const stage = getStage(app)
  const arabic = (await requestLocale()) === "ar"
  const locale = arabic ? "ar" : "en"
  const viewer = await getSessionUser()
  const showHelp = Boolean(viewer && ownsApplication(app, viewer.email) && isPaid(app))
  const open = stage !== "rejected" && stage !== "cancelled"
  const progress = open ? customerProgress(app) : null
  const insurance = applicationInsurance(app.additional_notes)
  const reviews = await loadDocumentReviews(app.id)

  return (
    <div className="ez-application-view flex flex-col gap-7">
      <ApplicationSwitcher apps={relatedApps} activeId={app.id} hrefFor={hrefFor} arabic={arabic} />

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ApplicationOverview app={app} stage={stage} arabic={arabic} reviews={reviews} />
          <AppointmentCard app={app} arabic={arabic} showHelp={showHelp} />
          <DocumentChecklist app={app} arabic={arabic} reviews={reviews} />
          {showInsurance && app.id && isPaid(app) && open && (
            <InsuranceCard key={app.id} applicationId={app.id} initialValue={insurance} arabic={arabic} />
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-5" aria-label={customerText(locale, "case.aside")}>
          {progress && <ProgressCard progress={progress} arabic={arabic} insurance={insurance} showInsurance={showInsurance} app={app} reviews={reviews} />}
          <CaseSummary app={app} stage={stage} showTrackingLink={showTrackingLink} allowDiscard={allowDiscard} arabic={arabic} />
          <SupportCard id={app.id} token={app.tracking_token ?? ""} destination={app.destination_country} stage={stage} />
        </aside>
      </div>
    </div>
  )
}
