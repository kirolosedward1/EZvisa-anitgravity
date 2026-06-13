import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Austria Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Austria Schengen tourist visa application. Get your Austria visa with EZvisa.",
}

export default function AustriaDocumentsPage() {
  const country = getCountryBySlug("austria")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
