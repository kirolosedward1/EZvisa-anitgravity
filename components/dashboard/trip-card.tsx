import { LocaleLink } from "@/components/locale-link"
import { DashPill } from "@/components/dashboard/dash-pill"
import { getStatusLabel } from "@/lib/application-status"
import { initialsOf } from "@/lib/account-travellers"
import { customerDocuments, needsAttention } from "@/lib/dashboard-state"
import { referenceOf } from "@/lib/shared/wizard-contract"
import { customerText, statusText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"
import type { VisaApplication } from "@/lib/types/visa-application"

/**
 * Travellers on the same trip (lib/trips.ts tripMates): one row each with documents in, status and a link. Each
 * traveller keeps their own case; this card only puts them side by side.
 */
export function TripCard({ app, mates, hrefFor, arabic }: { app: VisaApplication; mates: VisaApplication[]; hrefFor: (app: VisaApplication) => string; arabic: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  if (mates.length < 2) return null

  return (
    <section aria-labelledby="trip-title" className="ez-dash-card overflow-hidden">
      <div className="flex flex-col gap-1 px-5 pb-3.5 pt-[18px]">
        <h2 id="trip-title" className="ez-dash-section text-foreground">{t("trip.title")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("trip.body")}</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="sr-only sm:not-sr-only">
          <tr className="border-t border-[#eef1f6] bg-[#fafbfe] text-start text-xs text-muted-foreground">
            <th scope="col" className="px-5 py-2 text-start font-medium">{t("trip.colTraveller")}</th>
            <th scope="col" className="hidden px-3 py-2 text-start font-medium sm:table-cell">{t("trip.colDocs")}</th>
            <th scope="col" className="px-3 py-2 text-start font-medium">{t("trip.colStatus")}</th>
            <th scope="col" className="px-5 py-2"><span className="sr-only">{t("trip.open")}</span></th>
          </tr>
        </thead>
        <tbody>
          {mates.map((mate) => {
            const current = mate.id === app.id
            const docs = customerDocuments(mate)
            const attention = needsAttention(mate)
            const status = getStatusLabel(mate)
            return (
              <tr key={mate.id} className={cn("border-t border-[#eef1f6]", current && "bg-[#f7f9fd]")}>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-xs font-semibold text-primary" aria-hidden="true">
                      {initialsOf(mate.full_name ?? "") || "?"}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-foreground">{mate.full_name}</span>
                      <span className="ltr-isolate text-xs tabular-nums text-muted-foreground">{mate.id ? referenceOf(mate.id) : ""}</span>
                    </span>
                  </span>
                </td>
                <td className="hidden px-3 py-3 tabular-nums text-muted-foreground sm:table-cell">{t("trip.docs", { n: docs.received, total: docs.total })}</td>
                <td className="px-3 py-3">
                  <DashPill tone={attention ? "warning" : status.tone === "warning" ? "neutral" : status.tone}>
                    {attention ? t("dash.needsYou") : statusText(locale, status.label)}
                  </DashPill>
                </td>
                <td className="px-5 py-3 text-end">
                  {current ? (
                    <span className="text-xs text-muted-foreground">{t("trip.current")}</span>
                  ) : (
                    <LocaleLink href={hrefFor(mate)} className="text-sm font-medium text-primary hover:underline" aria-label={`${t("trip.open")}: ${mate.full_name ?? ""}`}>
                      {t("trip.open")}
                    </LocaleLink>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
