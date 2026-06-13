import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Croatia Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Croatia Schengen tourist visa application. Get your Croatia visa with EZvisa.",
}

export default function CroatiaDocumentsPage() {
  const country = getCountryBySlug("croatia")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
