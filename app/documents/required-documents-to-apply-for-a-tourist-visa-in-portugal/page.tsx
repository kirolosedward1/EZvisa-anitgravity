import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Portugal Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Portugal Schengen tourist visa application. Get your Portugal visa with EZvisa.",
}

export default function PortugalDocumentsPage() {
  const country = getCountryBySlug("portugal")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
