import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Slovenia Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Slovenia Schengen tourist visa application. Get your Slovenia visa with EZvisa.",
}

export default function SloveniaDocumentsPage() {
  const country = getCountryBySlug("slovenia")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
