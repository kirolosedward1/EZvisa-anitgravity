import { notFound } from "next/navigation"
import { LocaleLink } from "@/components/locale-link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ApplicationView } from "@/components/dashboard/application-view"
import { SupportApplication } from "@/components/support-application"
import { LangText } from "@/components/lang-text"
import { getApplicationByToken, getSessionUser } from "@/lib/applications"
import { isDemoToken, getDemoRelatedApplications } from "@/lib/demo-data"
import { getStatusLabel } from "@/lib/application-status"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * Case tracking by secret link: the same application view as the signed-in dashboard (and the same next-step rules
 * as the EZvisa app): pay, continue application, upload documents, then the prepared file.
 */
async function getTrackingData(token: string) {
  const mainApp = await getApplicationByToken(token)
  if (!mainApp) return null
  if (isDemoToken(token)) return { mainApp, relatedApps: getDemoRelatedApplications(token) as VisaApplication[] }

  // A tracking token is a bearer link for ONE application. Never list (or link to) other applications that share
  // the email: the email on a guest application is unverified, so anyone could file a case under someone else's
  // address and use its token to read their tokens. Signed-in owners see all their cases on /dashboard.
  return { mainApp, relatedApps: [mainApp] }
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [data, viewer] = await Promise.all([getTrackingData(token), getSessionUser()])
  if (!data || !data.mainApp) notFound()

  const { mainApp, relatedApps } = data
  const country = mainApp.destination_country || "Schengen"

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main id="main-content" className="ez-customer-page min-h-screen bg-secondary/40">
        <SupportApplication id={mainApp.id || token} country={mainApp.destination_country} status={getStatusLabel(mainApp).label} step="overview" />
        <DashboardHeader
          title={`Your ${country} visa application`}
          description={
            <>
              <LangText en="The same application is in the EZvisa app." ar="يمكنك متابعة الطلب نفسه في تطبيق EZvisa." />{" "}
              {viewer ? (
                <LocaleLink href="/dashboard" className="font-medium text-primary hover:underline">
                  <LangText en="View all your applications" ar="عرض جميع طلباتك" />
                </LocaleLink>
              ) : (
                <>
                  <LocaleLink href="/login?next=/dashboard" className="font-medium text-primary hover:underline">
                    <LangText en="Sign in" ar="سجّل الدخول" />
                  </LocaleLink>{" "}
                  <LangText en="to see all your applications in one place." ar="لرؤية جميع طلباتك في مكان واحد." />
                </>
              )}
            </>
          }
        />
        <div className="container mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <ApplicationView
            app={mainApp}
            relatedApps={relatedApps}
            hrefFor={(app) => (app.tracking_token ? `/track/${app.tracking_token}` : `/dashboard?id=${app.id}`)}
            showTrackingLink={false}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
