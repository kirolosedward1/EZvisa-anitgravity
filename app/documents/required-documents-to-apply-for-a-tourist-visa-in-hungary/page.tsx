import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Hungary Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Hungary Schengen tourist visa application. Get your Hungary visa with EZvisa.",
}

export default function HungaryDocumentsPage() {
  const country = getCountryBySlug("hungary")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
