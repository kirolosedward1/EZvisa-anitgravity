import { SiteHeader } from "@/components/site-header"
import { HeroSection } from "@/components/hero-section"
import { PopularDestinations } from "@/components/popular-destinations"
import { ExploreCountries } from "@/components/explore-countries"
import { FAQ_AR, FAQ_EN } from "@/lib/faq"
import { WHATSAPP_DISPLAY } from "@/lib/contact"
import dynamic from "next/dynamic"

// Lazy load below-the-fold components for performance
const ServicesSection = dynamic(() => import("@/components/services-section").then(mod => mod.ServicesSection), { ssr: true })
const HowItWorksSimple = dynamic(() => import("@/components/how-it-works-simple").then(mod => mod.HowItWorksSimple), { ssr: true })
const ComparisonSection = dynamic(() => import("@/components/comparison-section").then(mod => mod.ComparisonSection), { ssr: true })
const AppPromoSection = dynamic(() => import("@/components/app-promo-section").then(mod => mod.AppPromoSection), { ssr: true })
const FAQSection = dynamic(() => import("@/components/faq-section").then(mod => mod.FAQSection), { ssr: true })
const ContactSection = dynamic(() => import("@/components/contact-section").then(mod => mod.ContactSection), { ssr: true })
const Footer = dynamic(() => import("@/components/footer").then(mod => mod.Footer), { ssr: true })
import type { Metadata } from "next"
import { formatAedLabel } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { requestLocale } from "@/lib/request-locale"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  const description = arabic
    ? `طلبات تأشيرة شنغن يجهّزها مختصون للمقيمين في الإمارات: نموذج الطلب وخطاب التغطية وبرنامج يومي وحجوزات الطيران والفندق. جاهز خلال ${ltr("1–2")} يوم مقابل ${price}.`
    : "Schengen visa applications prepared for UAE residents by visa specialists: application form, cover letter, day-by-day itinerary, and flight and hotel reservations. Ready in 1–2 days for 249 AED."
  return {
  // absolute: the root template would otherwise append a second "| EZvisa".
  title: { absolute: arabic ? "خدمة طلب تأشيرة شنغن للمقيمين في الإمارات | EZvisa" : "Schengen Visa Application Service for UAE Residents | EZvisa" },
  description,
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
    title: arabic ? "خدمة طلب تأشيرة شنغن للمقيمين في الإمارات | EZvisa" : "Schengen Visa Application Service for UAE Residents | EZvisa",
    description: arabic ? `ملف تأشيرة شنغن يجهّزه مختصون خلال ${ltr("1–2")} يوم: النموذج وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق. ${price}.` : "Your Schengen visa file prepared by visa specialists in 1–2 days: form, cover letter, itinerary, flight and hotel reservations. 249 AED.",
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
}

export default async function Home() {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
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
        description: arabic
          ? `طلبات تأشيرة شنغن يجهّزها مختصون للمقيمين في الإمارات. جاهز خلال ${ltr("1–2")} يوم مقابل ${price}.`
          : "Schengen visa applications prepared for UAE residents by visa specialists: application form, cover letter, day-by-day itinerary, and flight and hotel reservations. Ready in 1–2 days for 249 AED.",
        address: {
          "@type": "PostalAddress",
          addressCountry: "AE",
          addressRegion: "Dubai",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: WHATSAPP_DISPLAY,
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
        inLanguage: arabic ? "ar" : "en-US",
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
        mainEntity: (arabic ? FAQ_AR : FAQ_EN).map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
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
      <div id="main-content" className="min-h-screen">
        <HeroSection />
        <ServicesSection />
        <PopularDestinations />
        <ExploreCountries />
        <HowItWorksSimple />
        <ComparisonSection />
        <AppPromoSection />
        <FAQSection />
        <ContactSection />
        <Footer />
      </div>
    </>
  )
}
