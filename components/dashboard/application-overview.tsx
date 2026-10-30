import { Image } from "@/components/image"
import { format, parseISO } from "date-fns"
import { CalendarDays, Check, Clock, UserRound } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { NextStepCard } from "@/components/dashboard/next-step-card"
import { CopyButton } from "@/components/dashboard/copy-button"
import { DashPill } from "@/components/dashboard/dash-pill"
import { CountryFlag } from "@/components/country-flag"
import { ArabicDate } from "@/components/arabic-date"
import { SCHENGEN_META } from "@/lib/countries"
import { destinations } from "@/lib/destinations"
import { referenceOf } from "@/lib/shared/wizard-contract"
import { customerText, statusText } from "@/lib/translations/customer"
import { getStatusLabel, isPaid, type Stage } from "@/lib/application-status"
import { whoseTurn } from "@/lib/dashboard-state"
import type { VisaApplication } from "@/lib/types/visa-application"
import type { DocumentReviews } from "@/lib/document-reviews"
import type { ReactNode } from "react"

function shortDate(value: string, arabic: boolean, withYear = true): ReactNode {
  return arabic ? <ArabicDate value={value} /> : format(parseISO(value), withYear ? "d MMM yyyy" : "d MMM")
}

function travelDates(app: VisaApplication, arabic: boolean): ReactNode | null {
  const start = app.entry_date || app.travel_start_date
  const end = app.exit_date || app.travel_end_date
  if (!start) return null
  if (!end) return shortDate(start, arabic)
  return <>{shortDate(start, arabic, false)} – {shortDate(end, arabic)}</>
}

/** The case card: destination photo, flag and reference, status and whose turn it is, then the one next step. */
export function ApplicationOverview({ app, stage, arabic, reviews }: { app: VisaApplication; stage: Stage; arabic: boolean; reviews?: DocumentReviews }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: Parameters<typeof customerText>[1], values?: Record<string, string | number>) => customerText(locale, key, values)
  const countryEn = app.destination_country || "Schengen"
  const country = arabic ? SCHENGEN_META[countryEn]?.ar || (countryEn === "Schengen" ? "شنغن" : countryEn) : countryEn
  const photo = destinations.find((d) => d.name === countryEn)?.image
  const reference = app.id ? referenceOf(app.id) : ""
  const status = getStatusLabel(app)
  const turn = whoseTurn(app, reviews)
  const paid = isPaid(app)
  const dates = travelDates(app, arabic)

  return (
    <section aria-label={t("overview.caseAria", { country })} className="ez-dash-card overflow-hidden">
      {photo ? (
        <div className="relative h-[112px] bg-[#edf4ff] sm:h-[168px]">
          <Image src={photo} alt={t("dash.photoAlt", { country })} fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" priority />
        </div>
      ) : null}

      <div className="flex flex-col gap-[18px] px-5 pt-[22px] sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <CountryFlag iso={SCHENGEN_META[countryEn]?.iso} title={country} className="size-10 ring-2 ring-white" />
            <div className="flex min-w-0 flex-col gap-[3px]">
              <h2 className="ez-dash-case-title text-foreground">{country}</h2>
              <p className="flex flex-wrap items-center gap-x-1 text-[13px] text-muted-foreground">
                {t("overview.schengen")}
                {reference ? (
                  <>
                    {" · "}
                    <span className="ltr-isolate tabular-nums">{reference}</span>
                    <CopyButton value={reference} label={t("case.copy")} copiedLabel={t("case.copied")} />
                  </>
                ) : null}
                {!paid && stage === "payment" ? <> · {t("dash.draft")}</> : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DashPill tone={status.tone}>{statusText(locale, status.label)}</DashPill>
            {turn && (
              <DashPill tone={turn === "you" ? "info" : "neutral"} dot={false}>
                {t(turn === "you" ? "dash.nextYou" : "dash.nextUs")}
              </DashPill>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-[22px] gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-[7px]">
            <UserRound className="size-4" aria-hidden="true" />
            {app.full_name}
          </span>
          <span className="inline-flex items-center gap-[7px]">
            <CalendarDays className="size-4" aria-hidden="true" />
            {dates ?? (
              <>
                {t("dash.datesNotSet")}
                {paid && app.id ? (
                  <>
                    {" · "}
                    <LocaleLink href={`/continue/${app.id}`} className="font-medium text-primary hover:underline">{t("dash.addDates")}</LocaleLink>
                  </>
                ) : null}
              </>
            )}
          </span>
          {paid && app.paid_at ? (
            <span className="inline-flex items-center gap-[7px]">
              <Check className="size-4" aria-hidden="true" />
              {t("dash.paid")} {shortDate(app.paid_at, arabic)}
            </span>
          ) : !paid && app.created_at ? (
            <span className="inline-flex items-center gap-[7px]">
              <Clock className="size-4" aria-hidden="true" />
              {t("dash.started")} {shortDate(app.created_at, arabic)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="m-5 mt-5 sm:m-6 sm:mt-5">
        <NextStepCard app={app} stage={stage} arabic={arabic} reviews={reviews} />
      </div>
    </section>
  )
}
