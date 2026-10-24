import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Cookie Policy",
      description: "Which cookies EZvisa uses, why, and how to change your choice.",
      alternates: { canonical: "https://www.ezvisa.net/cookie-policy", languages: { en: "https://www.ezvisa.net/cookie-policy", ar: "https://www.ezvisa.net/ar/cookie-policy" } },
    },
    {
      title: "سياسة ملفات تعريف الارتباط",
      description: "ما الكوكيز التي تستخدمها إيزي فيزا، ولماذا، وكيف تغيّر اختيارك.",
      path: "/ar/cookie-policy",
    },
  )
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="cookie-policy" titleEn="Cookie Policy" titleAr="سياسة ملفات تعريف الارتباط" />
}
