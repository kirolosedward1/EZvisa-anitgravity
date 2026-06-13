import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Norway Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Norway Schengen tourist visa application. Get your Norway visa with EZvisa.",
}

export default function NorwayDocumentsPage() {
  const country = getCountryBySlug("norway")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
