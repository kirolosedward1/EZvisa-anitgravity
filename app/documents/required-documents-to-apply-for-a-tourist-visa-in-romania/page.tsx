import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Romania Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Romania Schengen tourist visa application. Get your Romania visa with EZvisa.",
}

export default function RomaniaDocumentsPage() {
  const country = getCountryBySlug("romania")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
