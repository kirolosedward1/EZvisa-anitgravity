import type { Metadata } from "next"
import { ChevronRight, Plus } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { LocaleLink } from "@/components/locale-link"
import { CountryFlag } from "@/components/country-flag"
import { Button } from "@/components/ui/button"
import { DashPill } from "@/components/dashboard/dash-pill"
import { ArabicDate } from "@/components/arabic-date"
import { SCHENGEN_META } from "@/lib/countries"
import { getStatusLabel } from "@/lib/application-status"
import { needsAttention } from "@/lib/dashboard-state"
import { formatPageDate } from "@/lib/dates"
import { loadCustomerApplications } from "@/lib/customer-applications"
import { referenceOf } from "@/lib/shared/wizard-contract"
import { requestLocale } from "@/lib/request-locale"
import { customerText, statusText, type CustomerKey } from "@/lib/translations/customer"
import { withArabicMeta } from "@/lib/page-meta"
import type { VisaApplication } from "@/lib/types/visa-application"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    { title: "My applications", robots: { index: false, follow: false } },
    { title: "طلباتي", path: "/ar/dashboard/applications" },
  )
}

/**
 * My applications: every application on the account in one table (cards below 768px), newest first, each opening its
 * case on the dashboard. Same data as the dashboard switcher (lib/customer-applications.ts).
 */
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const arabic = (await requestLocale()) === "ar"
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const { apps } = await loadCustomerApplications({ demoParam: (await searchParams).demo, arabic, next: "/dashboard/applications" })

  const country = (app: VisaApplication) => (arabic ? SCHENGEN_META[app.destination_country]?.ar || app.destination_country : app.destination_country)
  const dates = (app: VisaApplication) => {
    const start = app.entry_date || app.travel_start_date
    const end = app.exit_date || app.travel_end_date
    return start && end ? `${formatPageDate(start, arabic)} – ${formatPageDate(end, arabic, true)}` : t("apps.noDates")
  }
  const started = (app: VisaApplication) =>
    !app.created_at ? "—" : arabic ? <ArabicDate value={app.created_at} fallback="—" /> : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" }).format(new Date(app.created_at))
  const status = (app: VisaApplication) => {
    const attention = needsAttention(app)
    const pill = getStatusLabel(app)
    return (
      <DashPill tone={attention ? "warning" : pill.tone === "warning" ? "neutral" : pill.tone}>
        {attention ? t("dash.needsYou") : statusText(locale, pill.label)}
      </DashPill>
    )
  }
  const href = (app: VisaApplication) => `/dashboard?id=${app.id}`
  const openLabel = (app: VisaApplication) => t("apps.openCase", { country: country(app), name: app.full_name ?? "" })

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="ez-customer-page ez-dash min-h-screen pt-[72px]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-4 pb-16 pt-9 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="ez-dash-h1 text-foreground">{t("apps.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {apps.length === 1 ? t("dash.countOne") : t("dash.countMany", { n: apps.length })} · {t("apps.intro")}
              </p>
            </div>
            <Button asChild>
              <LocaleLink href="/apply">
                <Plus />
                {t("dash.newApp")}
              </LocaleLink>
            </Button>
          </div>

          {apps.length === 0 ? (
            <section className="ez-dash-card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <h2 className="ez-dash-section text-foreground">{t("apps.emptyTitle")}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{t("apps.emptyBody")}</p>
              <Button asChild>
                <LocaleLink href="/apply">{t("apps.start")}</LocaleLink>
              </Button>
            </section>
          ) : (
            <>
              {/* 768px and up: a table. */}
              <div className="ez-dash-card hidden overflow-hidden md:block">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">{t("apps.title")}</caption>
                  <thead>
                    <tr className="bg-[#fafbfe] text-xs text-muted-foreground">
                      <th scope="col" className="px-5 py-3 text-start font-medium">{t("apps.colDestination")}</th>
                      <th scope="col" className="px-3 py-3 text-start font-medium">{t("apps.colTraveller")}</th>
                      <th scope="col" className="px-3 py-3 text-start font-medium">{t("apps.colReference")}</th>
                      <th scope="col" className="hidden px-3 py-3 text-start font-medium lg:table-cell">{t("apps.colDates")}</th>
                      <th scope="col" className="px-3 py-3 text-start font-medium">{t("apps.colStatus")}</th>
                      <th scope="col" className="hidden px-3 py-3 text-start font-medium lg:table-cell">{t("apps.colStarted")}</th>
                      <th scope="col" className="px-5 py-3"><span className="sr-only">{t("apps.open")}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app) => (
                      <tr key={app.id} className="border-t border-[#eef1f6] transition-colors hover:bg-[#f7f9fd]">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <CountryFlag iso={SCHENGEN_META[app.destination_country]?.iso} title={country(app)} className="size-7" />
                            <span className="font-medium text-foreground">{country(app)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-foreground">{app.full_name}</td>
                        <td className="px-3 py-3 text-muted-foreground"><span className="ltr-isolate tabular-nums">{app.id ? referenceOf(app.id) : ""}</span></td>
                        <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">{dates(app)}</td>
                        <td className="px-3 py-3">{status(app)}</td>
                        <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">{started(app)}</td>
                        <td className="px-5 py-3 text-end">
                          <LocaleLink href={href(app)} aria-label={openLabel(app)} className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                            {t("apps.open")}
                            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                          </LocaleLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Below 768px: one card per application, the whole card opens it. */}
              <ul className="flex flex-col gap-2.5 md:hidden" aria-label={t("apps.title")}>
                {apps.map((app) => (
                  <li key={app.id}>
                    <LocaleLink href={href(app)} className="ez-dash-card flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#f7f9fd]">
                      <CountryFlag iso={SCHENGEN_META[app.destination_country]?.iso} title={country(app)} className="size-8" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-foreground">{country(app)}</span>
                          {status(app)}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {app.full_name} · <span className="ltr-isolate tabular-nums">{app.id ? referenceOf(app.id) : ""}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{dates(app)}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-[#8b97ab] rtl:rotate-180" aria-hidden="true" />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
