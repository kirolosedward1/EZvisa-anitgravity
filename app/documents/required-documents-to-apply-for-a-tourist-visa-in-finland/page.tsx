import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Finland Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Finland Schengen tourist visa application. Get your Finland visa with EZvisa.",
}

export default function FinlandDocumentsPage() {
  const country = getCountryBySlug("finland")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
