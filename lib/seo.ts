import type { Metadata } from "next"

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
  image = "/images/logo-main.png",
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
      creator: "@ezvisa",
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
    logo: {
      "@type": "ImageObject",
      url: "https://www.ezvisa.net/images/logo-main.png",
      width: 600,
      height: 200,
    },
    description:
      "Professional Schengen visa application service with 98% approval rate. AI-powered assistance for 27 European countries.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressRegion: "Dubai",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+971-58-586-4446",
      contactType: "Customer Service",
      availableLanguage: ["en", "ar"],
      email: "hello@ezvisa.net",
    },
    sameAs: [
      "https://facebook.com/ezvisa",
      "https://twitter.com/ezvisa",
      "https://instagram.com/ezvisa",
      "https://youtube.com/@ezvisa",
      "https://tiktok.com/@ezvisa",
    ],
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
      "Complete Schengen visa application assistance including form filling, document verification, itinerary planning, hotel reservations, and cover letter writing.",
    areaServed: {
      "@type": "Country",
      name: "United Arab Emirates",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Schengen Visa Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Basic Schengen Visa Package",
          },
          price: "249",
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          url: "https://www.ezvisa.net/apply",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Premium Schengen Visa Package",
          },
          price: "349",
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          url: "https://www.ezvisa.net/apply",
        },
      ],
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "847",
      bestRating: "5",
      worstRating: "1",
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
