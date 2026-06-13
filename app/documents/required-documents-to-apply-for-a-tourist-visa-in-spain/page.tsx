import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Spain Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Spain Schengen tourist visa application. Get your Spain visa with EZvisa.",
}

export default function SpainDocumentsPage() {
  const country = getCountryBySlug("spain")

  if (!country) {
    return <div>Country not found</div>
  }

  return <DocumentRequirementsPage initialCountry={country.name} />
}
