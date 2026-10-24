import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Which cookies EZvisa uses, why, and how to change your choice.",
  alternates: { canonical: "https://www.ezvisa.net/cookie-policy", languages: { en: "https://www.ezvisa.net/cookie-policy", ar: "https://www.ezvisa.net/ar/cookie-policy" } },
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="cookie-policy" titleEn="Cookie Policy" titleAr="سياسة ملفات تعريف الارتباط" />
}
