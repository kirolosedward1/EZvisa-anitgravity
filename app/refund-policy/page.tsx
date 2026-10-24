import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Refund Policy",
      description: "Full refund of the EZvisa service fee any time before we start preparing your file, or if we fail to deliver.",
      alternates: { canonical: "https://www.ezvisa.net/refund-policy", languages: { en: "https://www.ezvisa.net/refund-policy", ar: "https://www.ezvisa.net/ar/refund-policy" } },
    },
    {
      title: "سياسة الاسترداد",
      description: "استرداد كامل لرسم الخدمة قبل أن نبدأ مراجعة مستنداتك، أو إذا تعذّر التسليم بسبب خطأ من جانبنا. لا استرداد عند رفض السفارة.",
      path: "/ar/refund-policy",
    },
  )
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="refund-policy" titleEn="Refund Policy" titleAr="سياسة الاسترداد" />
}
