import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Slovakia Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Slovakia Schengen tourist visa application. Get your Slovakia visa with EZvisa.",
}

export default function SlovakiaDocumentsPage() {
  const country = getCountryBySlug("slovakia")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
