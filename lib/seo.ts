import type { Metadata } from "next"

export const SITE_URL = "https://www.ezvisa.net"

/** Default 1200×630 share cards, rendered by scripts/generate-og-images.mjs. */
export function defaultOgImage(arabic = false) {
  return arabic
    ? { url: `${SITE_URL}/og/ezvisa-og-ar.png`, width: 1200, height: 630, alt: "إيزي فيزا: تأشيرة شنغن، ببساطة" }
    : { url: `${SITE_URL}/og/ezvisa-og.png`, width: 1200, height: 630, alt: "EZvisa: your Schengen visa, made simple" }
}

/** Open Graph locale codes. Both audiences are UAE residents. */
export const OG_LOCALE = { en: "en_US", ar: "ar_AE" } as const

/** The real profiles linked from the footer. Keep in sync with components/footer.tsx. */
export const SOCIAL_PROFILES = [
  "https://www.youtube.com/@ezvisa_dxb",
  "https://www.instagram.com/ezvisa.net",
  "https://www.facebook.com/ezvisadxb",
  "https://www.tiktok.com/@ezvisa.net",
]

/** The logo file's real size: 873×216. */
export const ORGANIZATION_LOGO = {
  "@type": "ImageObject",
  url: `${SITE_URL}/images/logo-main.png`,
  width: 873,
  height: 216,
}

export const ORGANIZATION_FOUNDER = {
  "@type": "Person",
  name: "Kirolos Edward",
  jobTitle: "Founder",
  url: `${SITE_URL}/about`,
}

/**
 * Canonical and hreflang links for a page published in English at `path` and in Arabic at `/ar${path}`.
 * `path` is the English path, e.g. "/pricing" or "/".
 */
export function localeAlternates(path: string, arabic: boolean): NonNullable<Metadata["alternates"]> {
  const en = `${SITE_URL}${path === "/" ? "/" : path}`
  const ar = `${SITE_URL}/ar${path === "/" ? "" : path}`
  return { canonical: arabic ? ar : en, languages: { en, ar, "x-default": en } }
}

interface SEOProps {
  title: string
  description: string
  keywords?: string[]
  image?: string
  url?: string
  type?: "website" | "article" | "service"
  publishedTime?: string
  modifiedTime?: string
  author?: string
}

export function generateSEO({
  title,
  description,
  keywords = [],
  image = "/og/ezvisa-og.png",
  url = "",
  type = "website",
  publishedTime,
  modifiedTime,
  author,
}: SEOProps): Metadata {
  const baseUrl = "https://www.ezvisa.net"
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl

  const metadata: Metadata = {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: author ? [{ name: author }] : [{ name: "EZvisa Team" }],
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: "EZvisa",
      images: [
        {
          url: image.startsWith("http") ? image : `${baseUrl}${image}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: type === "article" ? "article" : "website",
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.startsWith("http") ? image : `${baseUrl}${image}`],
    },
    alternates: {
      canonical: fullUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  }

  return metadata
}

// Generate Organization Schema
export function generateOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": "https://www.ezvisa.net/#organization",
    name: "EZvisa",
    url: "https://www.ezvisa.net/",
    logo: ORGANIZATION_LOGO,
    founder: ORGANIZATION_FOUNDER,
    description:
      "Professional Schengen visa document preparation service for 29 European countries.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressRegion: "Dubai",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+971 54 710 9533",
      contactType: "Customer Service",
      availableLanguage: ["en", "ar"],
      email: "hello@ezvisa.net",
    },
    sameAs: SOCIAL_PROFILES,
  }
}

// Generate WebSite Schema
export function generateWebsiteSchema() {
  return {
    "@type": "WebSite",
    "@id": "https://www.ezvisa.net/#website",
    url: "https://www.ezvisa.net/",
    name: "EZvisa",
    publisher: {
      "@id": "https://www.ezvisa.net/#organization",
    },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.ezvisa.net/documents?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }
}

// Generate Service Schema
export function generateServiceSchema() {
  return {
    "@type": "Service",
    "@id": "https://www.ezvisa.net/#service",
    serviceType: "Visa Application Assistance",
    provider: {
      "@id": "https://www.ezvisa.net/#organization",
    },
    name: "Schengen Visa Application Service",
    description:
      "Schengen visa application preparation for UAE residents: application form, cover letter, day-by-day itinerary, flight and hotel reservations, and a document check by a visa specialist.",
    areaServed: {
      "@type": "Country",
      name: "United Arab Emirates",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Schengen Visa Services",
      // The two real prices: one applicant, or a couple travelling together. No ratings: none are published.
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Schengen visa application, one applicant" },
          price: "249",
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          url: "https://www.ezvisa.net/apply",
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Schengen visa application, applicant and spouse" },
          price: "498",
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          url: "https://www.ezvisa.net/apply",
        },
      ],
    },
  }
}

// Generate BreadcrumbList Schema
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://www.ezvisa.net${item.url}`,
    })),
  }
}

// Generate Article Schema for Blog Posts
export function generateArticleSchema({
  title,
  description,
  image,
  publishedTime,
  modifiedTime,
  author = "EZvisa Team",
  url,
}: {
  title: string
  description: string
  image: string
  publishedTime: string
  modifiedTime: string
  author?: string
  url: string
}) {
  return {
    "@type": "Article",
    headline: title,
    description,
    image: `https://www.ezvisa.net${image}`,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@id": "https://www.ezvisa.net/#organization",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.ezvisa.net${url}`,
    },
  }
}

// Generate VideoObject Schema
export function generateVideoSchema({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  embedUrl,
}: {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string
  duration: string
  embedUrl: string
}) {
  return {
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    embedUrl,
    publisher: {
      "@id": "https://www.ezvisa.net/#organization",
    },
  }
}

// Generate FAQPage Schema
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

// Generate HowTo Schema
export function generateHowToSchema({
  name,
  description,
  steps,
  totalTime,
  estimatedCost,
}: {
  name: string
  description: string
  steps: Array<{ name: string; text: string; image?: string }>
  totalTime?: string
  estimatedCost?: { currency: string; value: string }
}) {
  return {
    "@type": "HowTo",
    name,
    description,
    totalTime,
    estimatedCost: estimatedCost
      ? {
          "@type": "MonetaryAmount",
          currency: estimatedCost.currency,
          value: estimatedCost.value,
        }
      : undefined,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image ? `https://www.ezvisa.net${step.image}` : undefined,
    })),
  }
}

// Helper to combine multiple schemas
export function generateStructuredData(...schemas: any[]) {
  return {
    "@context": "https://schema.org",
    "@graph": schemas,
  }
}
