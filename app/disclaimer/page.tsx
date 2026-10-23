import type { Metadata } from "next"
import { LegalDoc } from "@/components/legal/legal-doc"

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "EZvisa is a private visa application preparation service, not affiliated with any government, embassy or consulate. We do not guarantee visa approval.",
  alternates: { canonical: "https://www.ezvisa.net/disclaimer", languages: { en: "https://www.ezvisa.net/disclaimer", ar: "https://www.ezvisa.net/ar/disclaimer" } },
}

{/* LEGAL DRAFT – pending Legal Auditor */}
export default function Page() {
  return <LegalDoc doc="disclaimer" titleEn="Disclaimer" titleAr="إخلاء المسؤولية" />
}
