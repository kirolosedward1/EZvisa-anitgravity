import React from "react"
import type { Metadata } from "next"
import { ltr } from "@/lib/bidi"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Schengen Visa Document Requirements by Country",
      description:
        "Complete Schengen visa document requirements for 29 European countries. Detailed checklists for passport, photos, insurance, bank statements, itinerary, and more. Get your documents right the first time.",
      keywords: [
        "Schengen visa documents",
        "visa requirements",
        "tourist visa documents",
        "Europe visa checklist",
        "Schengen visa requirements",
        "visa documents list",
        "passport requirements",
        "visa photo requirements",
        "travel insurance visa",
      ],
      alternates: {
        canonical: "https://www.ezvisa.net/documents",
      },
      openGraph: {
        title: "Schengen Visa Document Requirements by Country",
        description:
          "Detailed document requirements for Schengen visa applications. Complete checklists for all 29 European countries.",
        url: "https://www.ezvisa.net/documents",
        type: "website",
      },
    },
    {
      title: "مستندات تأشيرة شنغن حسب الدولة",
      description: `قوائم مستندات تأشيرة شنغن لـ29 دولة، للمقيمين في الإمارات. جاهز خلال ${ltr("1–2")} يوم.`,
      path: "/ar/documents",
    },
  )
}

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
