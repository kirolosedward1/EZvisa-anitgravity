import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Poland Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Poland Schengen tourist visa application. Get your Poland visa with EZvisa.",
}

export default function PolandDocumentsPage() {
  const country = getCountryBySlug("poland")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
