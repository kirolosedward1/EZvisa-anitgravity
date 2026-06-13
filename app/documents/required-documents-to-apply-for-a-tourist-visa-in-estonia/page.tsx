import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Estonia Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Estonia Schengen tourist visa application. Get your Estonia visa with EZvisa.",
}

export default function EstoniaDocumentsPage() {
  const country = getCountryBySlug("estonia")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
