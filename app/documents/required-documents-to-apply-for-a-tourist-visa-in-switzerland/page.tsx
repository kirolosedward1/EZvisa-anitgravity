import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Switzerland Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Switzerland Schengen tourist visa application. Get your Switzerland visa with EZvisa.",
}

export default function SwitzerlandDocumentsPage() {
  const country = getCountryBySlug("switzerland")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
