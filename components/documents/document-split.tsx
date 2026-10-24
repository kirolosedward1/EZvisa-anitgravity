import { BookUser, Briefcase, Camera, ClipboardList, Hotel, IdCard, Landmark, PenLine, Plane, Route, ShieldPlus, type LucideIcon } from "lucide-react"
import { REQUIREMENTS } from "@/lib/shared/wizard-contract"

const PROVIDE_ICON: Record<string, LucideIcon> = {
  passportCopy: BookUser,
  residencyCopy: IdCard,
  photo: Camera,
  bankStatement: Landmark,
  nocCertificate: Briefcase,
}

const YOU_PROVIDE: { title: string; note: string | null; icon: LucideIcon }[] = [
  ...REQUIREMENTS.filter((r) => !r.provided_by_ezvisa).map((r) => ({
    icon: PROVIDE_ICON[r.document_type] ?? ClipboardList,
    title: r.document_type === "nocCertificate" ? "Salary certificate or NOC" : r.title,
    note:
      r.document_type === "nocCertificate"
        ? "From your employer, if you're employed"
        : r.document_type === "residencyCopy"
          ? "Valid for at least 3 months after you return"
          : r.description,
  })),
  { title: "Travel insurance", note: "€30,000 medical cover. Buy it through us as an extra, or bring your own", icon: ShieldPlus },
]

const WE_PREPARE = [
  { title: "Schengen application form", note: "Filled in from your answers and checked", icon: ClipboardList },
  { title: "Cover letter", note: "Written for your trip, signed by you", icon: PenLine },
  { title: "Day-by-day itinerary", note: "Matches your flight and hotel dates", icon: Route },
  { title: "Flight reservation", note: "For the visa, no ticket to buy", icon: Plane },
  { title: "Hotel reservation", note: "Covers every night of the trip", icon: Hotel },
]

/** The core Schengen file for UAE residents: what the customer brings and what EZvisa prepares. */
export function DocumentSplit({ country }: { country?: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="panel-title panel-title-lg text-foreground">You provide</h2>
          <p className="text-sm text-muted-foreground">Upload these on the website or in the EZvisa app after you pay.</p>
        </div>
        <ul className="flex flex-col">
          {YOU_PROVIDE.map((item) => (
            <li key={item.title} className="flex items-center gap-3.5 border-t border-border/70 py-3.5 first:border-0 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                {item.note && <span className="text-sm text-muted-foreground">{item.note}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl bg-primary/[0.04] p-6 ring-1 ring-primary/15 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="panel-title panel-title-lg text-foreground">We prepare</h2>
          <p className="text-sm text-muted-foreground">
            Included in the fee{country ? ` for your ${country} application` : ""}. Ready in 1–2 days.
          </p>
        </div>
        <ul className="flex flex-col">
          {WE_PREPARE.map((item) => (
            <li key={item.title} className="flex items-center gap-3.5 border-t border-primary/10 py-3.5 first:border-0 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
