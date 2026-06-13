import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Germany Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Germany Schengen tourist visa application. Get your Germany visa with EZvisa.",
}

export default function GermanyDocumentsPage() {
  const country = getCountryBySlug("germany")

  if (!country) {
    return <div>Country not found</div>
  }

  return <DocumentRequirementsPage initialCountry={country.name} />
}
