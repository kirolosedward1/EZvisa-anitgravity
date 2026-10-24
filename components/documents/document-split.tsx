"use client"

import { BookUser, Briefcase, Camera, ClipboardList, Hotel, IdCard, Landmark, PenLine, Plane, Route, ShieldPlus, type LucideIcon } from "lucide-react"
import { REQUIREMENTS } from "@/lib/shared/wizard-contract"
import { useSiteLocale } from "@/components/locale-provider"
import { countryNameAr } from "@/lib/countries"

const YOU_AR: Record<string, { title: string; note: string }> = {
  passportCopy: { title: "صفحة بيانات الجواز", note: "نسخة ملونة واضحة" },
  residencyCopy: { title: "تأشيرة الإقامة في الإمارات / الهوية الإماراتية", note: "سارية 3 أشهر على الأقل بعد العودة" },
  photo: { title: "صورة شخصية", note: "خلفية بيضاء" },
  bankStatement: { title: "كشف حساب بنكي", note: "آخر 3 إلى 6 أشهر، مختوم" },
  nocCertificate: { title: "شهادة راتب أو عدم ممانعة", note: "من صاحب العمل، إذا كنت موظفًا" },
}

const PROVIDE_ICON: Record<string, LucideIcon> = {
  passportCopy: BookUser,
  residencyCopy: IdCard,
  photo: Camera,
  bankStatement: Landmark,
  nocCertificate: Briefcase,
}

const WE_PREPARE = [
  { title: "Schengen application form", titleAr: "نموذج طلب شنغن", note: "Filled in from your answers and checked", noteAr: "يُعبّأ من إجاباتك ويُراجع", icon: ClipboardList },
  { title: "Cover letter", titleAr: "خطاب التغطية", note: "Written for your trip, signed by you", noteAr: "مكتوب لرحلتك، وتوقّعه أنت", icon: PenLine },
  { title: "Day-by-day itinerary", titleAr: "برنامج يومي", note: "Matches your flight and hotel dates", noteAr: "يطابق تواريخ الطيران والفندق", icon: Route },
  { title: "Flight reservation", titleAr: "حجز طيران", note: "For the visa, no ticket to buy", noteAr: "للتأشيرة، من دون شراء تذكرة", icon: Plane },
  { title: "Hotel reservation", titleAr: "حجز فندق", note: "Covers every night of the trip", noteAr: "يغطي كل ليلة من الرحلة", icon: Hotel },
]

/** The core Schengen file for UAE residents: what the customer brings and what EZvisa prepares. */
export function DocumentSplit({ country }: { country?: string }) {
  const arabic = useSiteLocale() === "ar"
  const youProvide = [
    ...REQUIREMENTS.filter((r) => !r.provided_by_ezvisa).map((r) => {
      const note =
        r.document_type === "nocCertificate"
          ? "From your employer, if you're employed"
          : r.document_type === "residencyCopy"
            ? "Valid for at least 3 months after you return"
            : r.description
      const title = r.document_type === "nocCertificate" ? "Salary certificate or NOC" : r.title
      const ar = YOU_AR[r.document_type]
      return {
        icon: PROVIDE_ICON[r.document_type] ?? ClipboardList,
        title: arabic && ar ? ar.title : title,
        note: arabic && ar ? ar.note : note,
      }
    }),
    {
      icon: ShieldPlus,
      title: arabic ? "تأمين السفر" : "Travel insurance",
      note: arabic
        ? "تغطية طبية بقيمة €30,000. اشترها عبرنا كإضافة، أو أحضر وثيقتك"
        : "€30,000 medical cover. Buy it through us as an extra, or bring your own",
    },
  ]

  const countryAr = country ? countryNameAr(country) : ""

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="panel-title panel-title-lg text-foreground">{arabic ? "ما تحضره" : "You provide"}</h2>
          <p className="text-sm text-muted-foreground">
            {arabic ? "ارفع هذه على الموقع أو في تطبيق إيزي فيزا بعد الدفع." : "Upload these on the website or in the EZvisa app after you pay."}
          </p>
        </div>
        <ul className="flex flex-col">
          {youProvide.map((item) => (
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
          <h2 className="panel-title panel-title-lg text-foreground">{arabic ? "ما نجهّزه" : "We prepare"}</h2>
          <p className="text-sm text-muted-foreground">
            {arabic ? (
              <>
                مشمول في الرسم{countryAr ? ` لطلب ${countryAr}` : ""}. جاهز خلال <bdi dir="ltr">1–2</bdi> يوم.
              </>
            ) : (
              <>Included in the fee{country ? ` for your ${country} application` : ""}. Ready in 1–2 days.</>
            )}
          </p>
        </div>
        <ul className="flex flex-col">
          {WE_PREPARE.map((item) => (
            <li key={item.title} className="flex items-center gap-3.5 border-t border-primary/10 py-3.5 first:border-0 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{arabic ? item.titleAr : item.title}</span>
                <span className="text-sm text-muted-foreground">{arabic ? item.noteAr : item.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
