import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Lithuania Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Lithuania Schengen tourist visa application. Get your Lithuania visa with EZvisa.",
}

export default function LithuaniaDocumentsPage() {
  const country = getCountryBySlug("lithuania")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
