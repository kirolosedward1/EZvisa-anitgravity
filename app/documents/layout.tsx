import React from "react"
import type { Metadata } from "next"

// Enable static generation for all document pages
export const dynamic = "force-static"
export const revalidate = 86400 // Revalidate once per day

export const metadata: Metadata = {
  title: "Schengen Visa Document Requirements by Country | EZvisa",
  description:
    "Complete Schengen visa document requirements for 27 European countries. Detailed checklists for passport, photos, insurance, bank statements, itinerary, and more. Get your documents right the first time.",
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
    canonical: "https://ezvisa.net/documents",
  },
  openGraph: {
    title: "Schengen Visa Document Requirements by Country",
    description:
      "Detailed document requirements for Schengen visa applications. Complete checklists for all 27 European countries.",
    url: "https://ezvisa.net/documents",
    type: "website",
  },
}

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
