import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Belgium Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Belgium Schengen tourist visa application. Get your Belgium visa with EZvisa.",
}

export default function BelgiumDocumentsPage() {
  const country = getCountryBySlug("belgium")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
