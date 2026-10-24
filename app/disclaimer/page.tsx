import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Disclaimer",
      description: "EZvisa is a private visa application preparation service, not affiliated with any government, embassy or consulate. We do not guarantee visa approval.",
      alternates: { canonical: "https://www.ezvisa.net/disclaimer", languages: { en: "https://www.ezvisa.net/disclaimer", ar: "https://www.ezvisa.net/ar/disclaimer" } },
    },
    {
      title: "إخلاء المسؤولية",
      description: "إيزي فيزا خدمة خاصة لتجهيز طلب التأشيرة، وليست تابعة لأي حكومة أو سفارة أو قنصلية. لا نضمن الموافقة على التأشيرة.",
      path: "/ar/disclaimer",
    },
  )
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="disclaimer" titleEn="Disclaimer" titleAr="إخلاء المسؤولية" />
}
