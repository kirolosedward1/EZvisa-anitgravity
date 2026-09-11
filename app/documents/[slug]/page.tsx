import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { getCountryBySlug } from "@/lib/countries"
import { SCHENGEN_COUNTRIES } from "@/lib/countries"
import { VISA_RULES, getProviderForDestination } from "@/lib/visa-rules"
import { notFound } from "next/navigation"

const PREFIX = "required-documents-to-apply-for-a-tourist-visa-in-"

function parseCountrySlug(slug: string): string {
  if (slug.startsWith(PREFIX)) {
    return slug.slice(PREFIX.length)
  }
  return slug
}

export async function generateStaticParams() {
  return SCHENGEN_COUNTRIES.map((country) => {
    const raw = country.toLowerCase().replace(/\s+/g, "-")
    return {
      slug: `${PREFIX}${raw}`,
    }
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const countrySlug = parseCountrySlug(slug)
  const countryData = getCountryBySlug(countrySlug)
  
  if (!countryData) {
    return {
      title: "Required Documents | EZvisa",
    }
  }

  const title = `Required Documents for ${countryData.name} Tourist Visa | EZvisa`
  const description = `Complete checklist of documents needed for ${countryData.name} Schengen tourist visa application. Prepare your ${countryData.name} visa file correctly.`

  return {
    title,
    description,
    keywords: [
      `${countryData.name} visa requirements`,
      `${countryData.name} tourist visa documents`,
      `apply ${countryData.name} visa`,
      `Schengen visa checklist ${countryData.name}`,
    ],
    alternates: {
      canonical: `https://www.ezvisa.net/documents/${slug.startsWith(PREFIX) ? slug : `${PREFIX}${slug}`}`,
    },
  }
}

export default async function DocumentSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const countrySlug = parseCountrySlug(slug)
  const country = getCountryBySlug(countrySlug)

  if (!country) {
    notFound()
  }

  const provider = getProviderForDestination(countrySlug)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": `Required Documents for ${country.name} Tourist Visa`,
    "description": `Complete checklist of documents needed for ${country.name} Schengen tourist visa application.`,
    "author": {
      "@type": "Organization",
      "name": "EZvisa",
    },
    "publisher": {
      "@type": "Organization",
      "name": "EZvisa",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.ezvisa.net/icon.png",
      },
    },
    "dateModified": VISA_RULES.lastReviewed,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DocumentRequirementsPage 
        initialCountry={country.name}
        provider={provider}
        processingTime={VISA_RULES.schengen.processingTime}
        fee={VISA_RULES.schengen.standardFee}
        lastReviewed={VISA_RULES.lastReviewed}
      />
    </>
  )
}

