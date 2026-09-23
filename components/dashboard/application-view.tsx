import { ApplicationOverview } from "@/components/dashboard/application-overview"
import { ApplicationSwitcher } from "@/components/dashboard/application-switcher"
import { CaseSummary } from "@/components/dashboard/case-summary"
import { DocumentChecklist } from "@/components/dashboard/document-checklist"
import { SupportCard } from "@/components/dashboard/support-card"
import { getStage } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

/** The application detail layout shared by /dashboard and /track/[token] */
export function ApplicationView({
  app,
  relatedApps,
  hrefFor,
  showTrackingLink,
}: {
  app: VisaApplication
  relatedApps: VisaApplication[]
  hrefFor: (app: VisaApplication) => string
  showTrackingLink?: boolean
}) {
  const stage = getStage(app)

  return (
    <div className="flex flex-col gap-6">
      <ApplicationSwitcher apps={relatedApps} activeId={app.id} hrefFor={hrefFor} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ApplicationOverview app={app} stage={stage} />
          <DocumentChecklist app={app} />
        </div>
        <aside className="flex flex-col gap-6" aria-label="Case details and support">
          <CaseSummary app={app} stage={stage} showTrackingLink={showTrackingLink} />
          <SupportCard token={app.tracking_token ?? ""} destination={app.destination_country} />
        </aside>
      </div>
    </div>
  )
}
