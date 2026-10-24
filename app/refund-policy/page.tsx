import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Full refund of the EZvisa service fee any time before we start preparing your file, or if we fail to deliver.",
  alternates: { canonical: "https://www.ezvisa.net/refund-policy", languages: { en: "https://www.ezvisa.net/refund-policy", ar: "https://www.ezvisa.net/ar/refund-policy" } },
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="refund-policy" titleEn="Refund Policy" titleAr="سياسة الاسترداد" />
}
