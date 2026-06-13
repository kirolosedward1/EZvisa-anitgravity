import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Liechtenstein Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Liechtenstein Schengen tourist visa application. Get your Liechtenstein visa with EZvisa.",
}

export default function LiechtensteinDocumentsPage() {
  const country = getCountryBySlug("liechtenstein")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
