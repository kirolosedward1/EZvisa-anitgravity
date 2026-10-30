import { CalendarPlus, Download, Pencil } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { Button } from "@/components/ui/button"
import { ArabicDate } from "@/components/arabic-date"
import { VisaCentrePlace } from "@/components/visa-centre-place"
import { AppointmentChecklist, type ChecklistItem } from "@/components/dashboard/appointment-checklist"
import { SCHENGEN_META } from "@/lib/countries"
import { applicationInsurance } from "@/lib/insurance"
import { centrePlace } from "@/lib/visa-centres"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import type { VisaApplication } from "@/lib/types/visa-application"

const dubaiDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(d)

/** Whole UAE calendar days from today to the appointment day; negative once it has passed. */
export function daysUntil(iso: string, now = new Date()): number {
  const day = (d: Date) => Date.parse(`${dubaiDay(d)}T00:00:00Z`)
  return Math.round((day(new Date(iso)) - day(now)) / 86_400_000)
}

/** A one-hour calendar event (.ics) as a data: link, so "Add to calendar" works without a server round trip. */
function calendarHref(app: VisaApplication, title: string): string {
  const start = new Date(app.appointment_at as string)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const place = centrePlace(app.appointment_centre, app.appointment_address)
  const escape = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n")
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EZvisa//Appointment//EN",
    "BEGIN:VEVENT",
    `UID:${app.id}@ezvisa.net`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    place ? `LOCATION:${escape([place.provider, place.address].filter(Boolean).join(", "))}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics.join("\r\n"))}`
}

/**
 * Booked appointment still ahead: a countdown card with the date, the centre and the file, then the
 * "Before your appointment" checklist. Returns null for any other appointment state (AppointmentCard handles those).
 */
export function AppointmentCountdown({ app, arabic, showInsurance }: { app: VisaApplication; arabic: boolean; showInsurance: boolean }) {
  const locale = arabic ? "ar" : "en"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const at = app.appointment_at
  if (!at || Number.isNaN(Date.parse(at)) || !app.id) return null
  const days = daysUntil(at)
  if (days < 0) return null

  const token = app.tracking_token ?? ""
  const countryEn = app.destination_country ?? ""
  const country = arabic ? SCHENGEN_META[countryEn]?.ar || countryEn : countryEn
  const when = arabic ? (
    <ArabicDate value={at} withTime />
  ) : (
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
      .format(new Date(at))
      .replace(/,(?= \d{2}:)/, " ·")
  )
  const insured = !!applicationInsurance(app.additional_notes)

  const items: ChecklistItem[] = [
    { id: "download", label: "apptc.c1", done: !!app.file_downloaded_at },
    { id: "book", label: "apptc.c2", done: true },
    { id: "print", label: "apptc.c3" },
    { id: "originals", label: "apptc.c4", hint: "apptc.c4Hint" },
    { id: "insurance", label: "apptc.c5", link: showInsurance && !insured ? { href: `/dashboard?id=${app.id}#insurance`, label: "apptc.c5Link" } : undefined },
    { id: "fees", label: "apptc.c6", hint: "apptc.c6Hint" },
  ]

  return (
    <>
      <section aria-labelledby="appt-title" className="ez-dash-card grid gap-5 p-5 sm:grid-cols-[132px_minmax(0,1fr)] sm:p-6">
        <div className="flex flex-row items-center gap-3 rounded-[10px] bg-[#edf4ff] px-4 py-3 text-primary sm:flex-col sm:justify-center sm:gap-0 sm:py-5">
          {days === 0 ? (
            <span className="text-2xl font-semibold">{t("apptc.today")}</span>
          ) : (
            <>
              <span className="text-[40px] font-semibold leading-none tabular-nums">{days}</span>
              <span className="text-[13px] font-medium sm:mt-1.5">{t(days === 1 ? "apptc.day" : "apptc.days")}</span>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="appt-title" className="ez-dash-panel text-muted-foreground">{t("apptc.title")}</h2>
            <p className="text-lg font-medium text-foreground">{when}</p>
          </div>
          <VisaCentrePlace centre={app.appointment_centre} address={app.appointment_address} locale={locale} className="text-sm" />
          {app.appointment_reference ? (
            <p className="text-[13px] text-muted-foreground">
              {t("overview.ref")} <span className="ltr-isolate">{app.appointment_reference}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {token ? (
              <Button asChild className="h-10 px-4 text-sm">
                <a href={`/api/download-document?token=${encodeURIComponent(token)}`}>
                  <Download aria-hidden="true" />
                  {t("apptc.download")}
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="h-10 px-4 text-sm">
              <a href={calendarHref(app, t("apptc.calTitle", { country }))} download="ezvisa-appointment.ics">
                <CalendarPlus aria-hidden="true" />
                {t("apptc.calendar")}
              </a>
            </Button>
            <Button asChild variant="ghost" className="h-10 px-3 text-sm text-primary hover:bg-[#edf4ff] hover:text-primary">
              <LocaleLink href={`/appointment/${app.id}?focus=date`}>
                <Pencil aria-hidden="true" />
                {t("apptc.change")}
              </LocaleLink>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("apptc.reminder")}</p>
        </div>
      </section>

      <AppointmentChecklist caseId={app.id} items={items} />

      <section aria-labelledby="appt-centre-title" className="ez-dash-card flex flex-col gap-2 px-5 py-[18px]">
        <h2 id="appt-centre-title" className="ez-dash-panel text-foreground">{t("apptc.centreTitle")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("apptc.centreBody")}</p>
        <LocaleLink href="/help/visa-appointment/at-your-appointment" className="w-max text-[13px] font-medium text-primary hover:underline">
          {t("apptc.guide")}
        </LocaleLink>
      </section>
    </>
  )
}
