import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Sweden Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Sweden Schengen tourist visa application. Get your Sweden visa with EZvisa.",
}

export default function SwedenDocumentsPage() {
  const country = getCountryBySlug("sweden")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
