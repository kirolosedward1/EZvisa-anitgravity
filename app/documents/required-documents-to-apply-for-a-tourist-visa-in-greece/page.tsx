import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Greece Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Greece Schengen tourist visa application. Get your Greece visa with EZvisa.",
}

export default function GreeceDocumentsPage() {
  const country = getCountryBySlug("greece")

  if (!country) {
    return <div>Country not found</div>
  }

  return <DocumentRequirementsPage initialCountry={country.name} />
}
