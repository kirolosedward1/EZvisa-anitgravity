import { ApplicationOverview } from "@/components/dashboard/application-overview"
import { ApplicationSwitcher } from "@/components/dashboard/application-switcher"
import { CaseSummary } from "@/components/dashboard/case-summary"
import { DocumentChecklist } from "@/components/dashboard/document-checklist"
import { SupportCard } from "@/components/dashboard/support-card"
import { getSessionUser } from "@/lib/applications"
import { ownsApplication } from "@/lib/appointment"
import { getStage, isPaid } from "@/lib/application-status"
import { requestLocale } from "@/lib/request-locale"
import { customerText } from "@/lib/translations/customer"
import type { VisaApplication } from "@/lib/types/visa-application"

/** The application detail layout shared by /dashboard and /track/[token] */
export async function ApplicationView({
  app,
  relatedApps,
  hrefFor,
  showTrackingLink,
  allowDiscard,
}: {
  app: VisaApplication
  relatedApps: VisaApplication[]
  hrefFor: (app: VisaApplication) => string
  showTrackingLink?: boolean
  allowDiscard?: boolean
}) {
  const stage = getStage(app)
  const arabic = (await requestLocale()) === "ar"
  const locale = arabic ? "ar" : "en"
  const viewer = await getSessionUser()
  const showHelp = Boolean(viewer && ownsApplication(app, viewer.email) && isPaid(app))

  return (
    <div className="ez-application-view flex flex-col gap-6">
      <ApplicationSwitcher apps={relatedApps} activeId={app.id} hrefFor={hrefFor} arabic={arabic} />

      <div className="ez-case-layout">
        <div className="ez-case-main">
          <ApplicationOverview app={app} stage={stage} arabic={arabic} showHelp={showHelp} />
          <DocumentChecklist app={app} arabic={arabic} />
        </div>
        <aside className="ez-case-sidebar" aria-label={customerText(locale, "case.aside")}>
          <CaseSummary app={app} stage={stage} showTrackingLink={showTrackingLink} allowDiscard={allowDiscard} arabic={arabic} />
          <SupportCard id={app.id} token={app.tracking_token ?? ""} destination={app.destination_country} />
        </aside>
      </div>
    </div>
  )
}
