import { LocaleLink } from "@/components/locale-link"
import { format, parseISO } from "date-fns"
import { ChevronRight, Link2, Navigation, Printer, Receipt, Upload } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { CopyButton } from "@/components/dashboard/copy-button"
import { DashPill } from "@/components/dashboard/dash-pill"
import { VisaCentrePlace } from "@/components/visa-centre-place"
import { getReference, isPaid, type Stage } from "@/lib/application-status"
import { ArabicDate } from "@/components/arabic-date"
import { formatAedLabel } from "@/lib/currency"
import { applicationInsurance } from "@/lib/insurance"
import { PRICE_AED, referenceOf } from "@/lib/shared/wizard-contract"
import { customerText, statusText, type CustomerKey } from "@/lib/translations/customer"
import { isDiscardable } from "@/lib/active-applications"
import { DiscardButton } from "@/components/dashboard/discard-button"
import type { VisaApplication } from "@/lib/types/visa-application"
import type { ReactNode } from "react"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#eef1f6] py-[9px] text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center justify-end gap-2 text-end font-medium text-foreground">{children}</dd>
    </div>
  )
}

/** Compact case details: reference, service fee (pill before the amount), dates, then the case's links. */
export function CaseSummary({
  app,
  stage,
  showTrackingLink = true,
  allowDiscard = false,
  arabic,
}: {
  app: VisaApplication
  stage: Stage
  showTrackingLink?: boolean
  allowDiscard?: boolean
  arabic: boolean
}) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey) => customerText(locale, key)
  const token = app.tracking_token ?? ""
  // The id-based reference, the one the app, emails and WhatsApp use; the token form only for rows without an id.
  const reference = app.id ? referenceOf(app.id) : getReference(token)
  const paid = isPaid(app)
  const cancelled = (app.application_status || "").toLowerCase() === "cancelled"
  const insurance = applicationInsurance(app.additional_notes)
  const date = (value?: string | null, withTime = false) =>
    !value ? "—" : arabic ? <ArabicDate value={value} withTime={withTime} fallback="—" /> : format(parseISO(value), withTime ? "d MMM, HH:mm" : "d MMM yyyy")

  const links = [
    showTrackingLink && token && { href: `/track/${token}`, label: t("case.track"), icon: Link2 },
    paid && stage !== "ready" && token && { href: `/track/${token}/upload`, label: t("case.upload"), icon: Upload },
    stage === "ready" && token && { href: `/track/${token}/dossier`, label: t("case.print"), icon: Printer },
    paid && app.id && typeof app.payment_amount === "number" && { href: `/receipt/${app.id}`, label: t("case.receipt"), icon: Receipt },
    paid && app.id && { href: `/trip/${app.id}`, label: t("case.trip"), icon: Navigation },
  ].filter(Boolean) as { href: string; label: string; icon: LucideIcon }[]

  return (
    <section aria-label={t("case.title")} className="ez-dash-card px-5 pb-2 pt-[18px]">
      <h2 className="ez-dash-panel mb-2 text-foreground">{t("case.title")}</h2>
      <dl>
        <Row label={t("case.reference")}>
          <span className="ltr-isolate tabular-nums">{reference}</span>
          {reference && <CopyButton value={reference} label={t("case.copy")} copiedLabel={t("case.copied")} />}
        </Row>
        <Row label={t("case.serviceFee")}>
          <DashPill tone={cancelled ? "neutral" : paid ? "success" : "warning"} dot={false} className="h-[22px]">
            {cancelled ? statusText(locale, "Cancelled") : paid ? statusText(locale, "Paid") : t("case.due")}
          </DashPill>
          <span className="tabular-nums">{formatAedLabel(app.payment_amount || PRICE_AED, locale)}</span>
        </Row>
        {paid && insurance ? <Row label={t("case.insurance")}>{t(insurance === "quote" ? "case.insQuote" : "case.insOwn")}</Row> : null}
        {!paid ? <Row label={t("case.traveller")}>{app.full_name}</Row> : null}
        <Row label={t(paid ? "case.created" : "case.started")}>{date(app.created_at)}</Row>
        {paid ? <Row label={t("case.updated")}>{date(app.updated_at || app.created_at, true)}</Row> : null}
      </dl>

      {app.appointment_centre || app.appointment_address ? (
        <div className="border-t border-[#eef1f6] py-3">
          <p className="mb-1 text-sm text-muted-foreground">{t("appt.centre")}</p>
          <VisaCentrePlace centre={app.appointment_centre} address={app.appointment_address} locale={locale} />
        </div>
      ) : null}

      {links.length > 0 && (
        <ul className="-mx-2 flex flex-col border-t border-[#eef1f6] pb-1 pt-1.5">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <LocaleLink href={href} className="group flex items-center gap-2.5 rounded-lg px-3 py-[11px] text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-4 text-[#8b97ab] rtl:rotate-180" aria-hidden="true" />
              </LocaleLink>
            </li>
          ))}
        </ul>
      )}

      {allowDiscard && app.id && isDiscardable(app) && <DiscardButton applicationId={app.id} />}
    </section>
  )
}
