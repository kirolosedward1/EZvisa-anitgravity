import { SiteHeader } from "@/components/site-header"
import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { PopularDestinations } from "@/components/popular-destinations"
import { HowItWorksSimple } from "@/components/how-it-works-simple"
import { ComparisonSection } from "@/components/comparison-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { FAQSection } from "@/components/faq-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Schengen Visa Application Service UAE | 98% Approval Rate | EZvisa",
  description:
    "Get your Schengen visa approved fast with EZvisa UAE. AI-powered assistance for 27 European countries. Expert help with documents, itinerary planning, cover letters & more. 98% approval rate. Starting from 249 AED. Apply today!",
  keywords: [
    "Schengen visa UAE",
    "Schengen visa Dubai",
    "tourist visa Europe from UAE",
    "Europe visa application UAE",
    "Schengen visa service Dubai",
    "visa application assistance UAE",
    "Europe travel visa Dubai",
    "Schengen visa documents checklist",
    "visa cover letter service",
    "travel itinerary for visa",
    "Schengen visa appointment",
    "visa application help Dubai",
    "Europe tourist visa UAE",
    "Schengen visa requirements UAE",
    "visa approval service Dubai"
  ],
  alternates: {
    canonical: "https://www.ezvisa.net/",
  },
  openGraph: {
    title: "Schengen Visa Application UAE | 98% Approval | EZvisa",
    description: "Get your Schengen visa approved fast with EZvisa UAE. AI-powered assistance for 27 European countries. 98% approval rate. From 249 AED.",
    url: "https://www.ezvisa.net/",
    type: "website",
    images: [
      {
        url: "https://www.ezvisa.net/images/logo-main.png",
        width: 1200,
        height: 630,
        alt: "EZvisa - Schengen Visa Application Service UAE",
      },
    ],
  },
}

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
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
          "https://www.youtube.com/@ezvisa",
          "https://www.tiktok.com/@ezvisa.net"
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.ezvisa.net/#website",
        url: "https://www.ezvisa.net/",
        name: "EZvisa",
        publisher: {
          "@id": "https://www.ezvisa.net/#organization",
        },
        inLanguage: "en-US",
      },
      {
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
        offers: {
          "@type": "Offer",
          price: "249",
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          url: "https://www.ezvisa.net/apply",
        },
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.ezvisa.net/#faqpage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How long does it take to process a Schengen visa?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Schengen visa processing typically takes 15-30 days from the date of application submission at the consulate. We help you prepare your complete application within 24-48 hours.",
            },
          },
          {
            "@type": "Question",
            name: "What is your visa approval rate?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "We maintain a 98% approval rate for Schengen visa applications through our AI-powered document verification and personalized itinerary planning.",
            },
          },
          {
            "@type": "Question",
            name: "Which countries can I visit with a Schengen visa?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A Schengen visa allows you to travel to 29 European countries including France, Germany, Italy, Spain, Netherlands, Austria, Greece, Portugal, and more.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://www.ezvisa.net/#breadcrumb",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.ezvisa.net/",
          },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main id="main-content" className="min-h-screen">
        <HeroSection />
        <ServicesSection />
        <PopularDestinations />
        <HowItWorksSimple />
        <ComparisonSection />
        <TestimonialsSection />
        <FAQSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  )
}
