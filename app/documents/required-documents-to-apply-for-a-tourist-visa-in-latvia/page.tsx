import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Latvia Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Latvia Schengen tourist visa application. Get your Latvia visa with EZvisa.",
}

export default function LatviaDocumentsPage() {
  const country = getCountryBySlug("latvia")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
