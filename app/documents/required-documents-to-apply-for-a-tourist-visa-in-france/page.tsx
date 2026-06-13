import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for France Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for France Schengen tourist visa application. Get your France visa with EZvisa.",
}

export default function FranceDocumentsPage() {
  const country = getCountryBySlug("france")

  if (!country) {
    return <div>Country not found</div>
  }

  return <DocumentRequirementsPage initialCountry={country.name} />
}
