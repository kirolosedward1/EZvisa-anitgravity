import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Malta Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Malta Schengen tourist visa application. Get your Malta visa with EZvisa.",
}

export default function MaltaDocumentsPage() {
  const country = getCountryBySlug("malta")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
