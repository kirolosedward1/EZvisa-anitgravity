import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Required Documents for Czech Republic Tourist Visa | EZvisa",
  description:
    "Complete checklist of documents needed for Czech Republic Schengen tourist visa application. Get your Czech Republic visa with EZvisa.",
}

export default function CzechRepublicDocumentsPage() {
  const country = getCountryBySlug("czech-republic")
  if (!country) return <div>Country not found</div>
  return <DocumentRequirementsPage initialCountry={country.name} />
}
