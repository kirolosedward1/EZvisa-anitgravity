import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Luxembourg Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Luxembourg Schengen tourist visa application. Get your Luxembourg visa with EZvisa.",
}

export default function LuxembourgDocumentsPage() {
  const country = getCountryBySlug("luxembourg")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
