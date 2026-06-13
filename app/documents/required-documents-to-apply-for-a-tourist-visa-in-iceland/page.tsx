import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Iceland Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Iceland Schengen tourist visa application. Get your Iceland visa with EZvisa.",
}

export default function IcelandDocumentsPage() {
  const country = getCountryBySlug("iceland")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
