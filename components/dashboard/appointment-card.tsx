import { LocaleLink } from "@/components/locale-link"
import { ArabicDate } from "@/components/arabic-date"
import { VisaCentrePlace } from "@/components/visa-centre-place"
import { appointmentCardState, type AppointmentCardState } from "@/lib/appointment"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import type { VisaApplication } from "@/lib/types/visa-application"

function whenLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso))
}

const QUIET: Partial<Record<AppointmentCardState, CustomerKey>> = {
  help_requested: "appt.helpStatus",
  contacted: "appt.arranged",
  cancelled: "appt.cancelled",
}

/** Dashboard appointment card. Help actions render only for the signed-in owner of a paid case. */
export function AppointmentCard({
  app,
  arabic,
  showHelp,
}: {
  app: VisaApplication
  arabic: boolean
  showHelp: boolean
}) {
  const locale = arabic ? "ar" : "en"
  const state = appointmentCardState(app)
  if (!state || !app.id) return null
  const href = `/appointment/${app.id}`

  if (state === "booked" && app.appointment_at) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-medium text-foreground">
            {arabic ? (
              <>
                {customerText("ar", "overview.appointment")} <ArabicDate value={app.appointment_at} withTime />
              </>
            ) : (
              whenLabel(app.appointment_at)
            )}
          </p>
          <VisaCentrePlace centre={app.appointment_centre} address={app.appointment_address} locale={locale} />
          {app.appointment_reference ? (
            <p className="text-muted-foreground">
              {customerText(locale, "overview.ref")} <span className="ltr-isolate">{app.appointment_reference}</span>
            </p>
          ) : null}
        </div>
        <LocaleLink href={`${href}?focus=date`} className="shrink-0 text-sm font-medium text-primary">
          {customerText(locale, "appt.edit")}
        </LocaleLink>
      </div>
    )
  }

  if (state === "booked") {
    return (
      <div className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground">
        {customerText(locale, "appt.booked")}
      </div>
    )
  }

  if (state === "later") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">{customerText(locale, "appt.addTitle")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <LocaleLink href={`${href}?focus=date`} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground sm:w-auto">
            {customerText(locale, "appt.addDate")}
          </LocaleLink>
          {showHelp ? (
            <LocaleLink href={`${href}?focus=help`} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-foreground sm:w-auto">
              {customerText(locale, "appt.getHelp")}
            </LocaleLink>
          ) : null}
        </div>
      </div>
    )
  }

  if (state === "not_answered") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">{customerText(locale, "appt.notAnswered")}</p>
        <LocaleLink href={href} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground sm:w-auto">
          {customerText(locale, "appt.add")}
        </LocaleLink>
      </div>
    )
  }

  const key = QUIET[state]
  if (!key) return null
  return (
    <div className="rounded-xl border border-border px-4 py-3 text-sm text-foreground">
      {customerText(locale, key)}
    </div>
  )
}
