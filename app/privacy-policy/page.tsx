import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How EZvisa collects, uses and protects your personal data under the UAE PDPL.",
  alternates: { canonical: "https://www.ezvisa.net/privacy-policy", languages: { en: "https://www.ezvisa.net/privacy-policy", ar: "https://www.ezvisa.net/ar/privacy-policy" } },
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="privacy-policy" titleEn="Privacy Policy" titleAr="سياسة الخصوصية" />
}
