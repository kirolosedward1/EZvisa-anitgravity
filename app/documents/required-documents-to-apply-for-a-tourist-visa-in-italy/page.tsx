import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Italy Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Italy Schengen tourist visa application. Get your Italy visa with EZvisa.",
}

export default function ItalyDocumentsPage() {
  const country = getCountryBySlug("italy")

  if (!country) {
    return <div>Country not found</div>
  }

  return <DocumentRequirementsPage initialCountry={country.name} />
}
