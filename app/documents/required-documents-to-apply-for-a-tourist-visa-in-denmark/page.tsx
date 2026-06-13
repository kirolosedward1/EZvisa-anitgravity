import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Denmark Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Denmark Schengen tourist visa application. Get your Denmark visa with EZvisa.",
}

export default function DenmarkDocumentsPage() {
  const country = getCountryBySlug("denmark")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
