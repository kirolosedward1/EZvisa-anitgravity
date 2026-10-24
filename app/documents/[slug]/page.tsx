import type { Metadata } from "next"
import { DocumentRequirementsPage } from "@/components/document-requirements-page"
import { countryNameAr, getCountryBySlug } from "@/lib/countries"
import { requestLocale } from "@/lib/request-locale"
import { withArabicMeta } from "@/lib/page-meta"
import { SCHENGEN_COUNTRIES } from "@/lib/countries"
import { VISA_RULES } from "@/lib/visa-rules"
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
  
  const canonicalSlug = slug.startsWith(PREFIX) ? slug : `${PREFIX}${slug}`

  if (!countryData) {
    return withArabicMeta({ title: "Required Documents" }, { title: "المستندات المطلوبة", path: "/ar/documents" })
  }

  const title = `Required Documents for ${countryData.name} Tourist Visa`
  const description = `Complete checklist of documents needed for ${countryData.name} Schengen tourist visa application. Prepare your ${countryData.name} visa file correctly.`
  const nameAr = countryNameAr(countryData.name)

  return withArabicMeta(
    {
      title,
      description,
      keywords: [
        `${countryData.name} visa requirements`,
        `${countryData.name} tourist visa documents`,
        `apply ${countryData.name} visa`,
        `Schengen visa checklist ${countryData.name}`,
      ],
      alternates: {
        canonical: `https://www.ezvisa.net/documents/${canonicalSlug}`,
      },
    },
    {
      title: `مستندات تأشيرة ${nameAr} السياحية`,
      description: `قائمة مستندات تأشيرة ${nameAr} السياحية للمقيمين في الإمارات. نجهّز الملف خلال 1–2 يوم.`,
      path: `/ar/documents/${canonicalSlug}`,
    },
  )
}

export default async function DocumentSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const countrySlug = parseCountrySlug(slug)
  const country = getCountryBySlug(countrySlug)

  if (!country) {
    notFound()
  }

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
      <DocumentRequirementsPage initialCountry={country.name} />
    </>
  )
}

