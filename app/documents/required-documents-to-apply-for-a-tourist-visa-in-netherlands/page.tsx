import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Netherlands Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Netherlands Schengen tourist visa application. Get your Netherlands visa with EZvisa.",
}

export default function NetherlandsDocumentsPage() {
  const country = getCountryBySlug("netherlands")

  if (!country) {
    return <div>Country not found</div>
  }

  return <DocumentRequirementsPage initialCountry={country.name} />
}
