import type React from "react"
import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { IBM_Plex_Sans_Arabic, DM_Sans } from "next/font/google"
import { CookieConsent } from "@/components/cookie-consent"
import { ScrollRestoration } from "@/components/scroll-restoration"
import { ContinueApplicationNotification } from "@/components/continue-application-notification"
import { NavigationProgressBar } from "@/components/navigation-progress"
import { SiteMotion } from "@/components/site-motion"
import { LocaleDirection } from "@/components/locale-direction"
import { LocaleProvider } from "@/components/locale-provider"
import { formatAedLabel } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { PRICE_AED } from "@/lib/shared/wizard-contract"
import { OG_LOCALE, defaultOgImage } from "@/lib/seo"
import { CrispVisibility } from "@/components/crisp-visibility"
import Script from "next/script"
import "./globals.css"

const poppins = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

// Arabic glyphs only. Latin keeps DM Sans because this subset's unicode-range does not cover it.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
})

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")
  const description = arabic
    ? `طلبات تأشيرة شنغن يجهّزها مختصون للمقيمين في الإمارات: نموذج الطلب وخطاب التغطية وبرنامج يومي وحجوزات الطيران والفندق. جاهز خلال ${ltr("1–2")} يوم مقابل ${price}.`
    : "Schengen visa applications prepared for UAE residents by visa specialists: application form, cover letter, day-by-day itinerary, and flight and hotel reservations. Ready in 1–2 days for 249 AED."
  const shareDescription = arabic
    ? `ملف تأشيرة شنغن يجهّزه مختصون خلال ${ltr("1–2")} يوم: النموذج وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق. ${price}.`
    : "Your Schengen visa file prepared by visa specialists in 1–2 days: form, cover letter, itinerary, flight and hotel reservations. 249 AED."
  return {
  metadataBase: new URL("https://www.ezvisa.net"),
  title: {
    default: arabic ? "EZvisa | خدمة طلب تأشيرة شنغن للمقيمين في الإمارات" : "EZvisa | Schengen Visa Application Service for UAE Residents",
    template: "%s | EZvisa",
  },
  description,
  keywords: [
    "Schengen visa",
    "tourist visa Europe",
    "visa application service",
    "Europe visa",
    "Schengen visa UAE",
    "tourist visa from UAE",
    "visa assistance",
    "travel visa Europe",
    "Schengen visa documents",
    "visa application help",
    "Europe tourist visa",
    "visa itinerary",
    "visa cover letter",
    "flight booking visa",
    "hotel reservation visa",
  ],
  authors: [{ name: "EZvisa Team" }],
  creator: "EZvisa",
  publisher: "EZvisa",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: arabic ? "EZvisa | خدمة طلب تأشيرة شنغن للمقيمين في الإمارات" : "EZvisa | Schengen Visa Application Service for UAE Residents",
    description: shareDescription,
    // No url here: pages without their own openGraph would otherwise all claim the homepage's URL.
    siteName: "EZvisa",
    locale: OG_LOCALE[arabic ? "ar" : "en"],
    type: "website",
    images: [defaultOgImage(arabic)],
  },
  // Only the card type: title, description and image are filled from each page's own Open Graph tags.
  twitter: {
    card: "summary_large_image",
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
  manifest: "/site.webmanifest?v=8",
  // No canonical here: a root canonical is inherited by every page that doesn't set its own, which told search
  // engines those pages duplicate the homepage. Each indexable page sets its own (the homepage in app/page.tsx).
  // (The placeholder site-verification codes were removed: they published meaningless meta tags.)
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zooming for accessibility
  userScalable: true, // Allow user scaling for accessibility compliance
  themeColor: "#2563eb",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  return (
    <html
      lang={arabic ? "ar" : "en"}
      dir={arabic ? "rtl" : "ltr"}
      className={arabic ? `${plexArabic.variable} bg-background` : "bg-background"}
      suppressHydrationWarning
    >
      <head>
        {/* Streamed Suspense reveals ($RC → $RV) run on the next frame when $RT
            is unset, which mutates the boundary while hydration is replaying it
            (React #418). Setting $RT before any body script takes React's
            delayed reveal path so the swap happens after hydration. */}
        <script dangerouslySetInnerHTML={{ __html: "self.$RT=performance.now()" }} />

        {/* Mobile Favicon & Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=8" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=8" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=8" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=8" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png?v=8" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png?v=8" />
        <link rel="shortcut icon" href="/favicon.ico?v=8" />
        <meta name="apple-mobile-web-app-title" content="EZvisa" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Google Consent Mode v2 defaults (legal audit H1): everything denied until the visitor chooses.
            GA/GTM/Crisp are NOT loaded here; components/cookie-consent.tsx injects them only after consent
            and sends gtag('consent','update',...) when the choice changes. */}
        <Script id="consent-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              analytics_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500
            });
          `}
        </Script>
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <LocaleProvider locale={arabic ? "ar" : "en"}>
        <LocaleDirection />
        <CrispVisibility />
        <NavigationProgressBar />
        <SiteMotion />
        <ScrollRestoration />
        {/* overflow-x-clip (not hidden): hidden would turn <main> into a scroll container and stop position: sticky from working on every page */}
        <main className="overflow-x-clip w-full flex flex-col min-h-screen">
          {/* This wrapper used to live in PageTransition. That client div was
              replayed against the streamed page Suspense boundary
              (dev diff: client div.w-full.flex-1 vs server Suspense) and React
              reported hydration error #418. It is server markup now. */}
          <div className="w-full flex-1 flex flex-col">{children}</div>
        </main>
        <ContinueApplicationNotification />
        {/* CookieConsent also mounts Vercel Analytics, only after analytics consent. */}
        <CookieConsent />
        </LocaleProvider>
      </body>
    </html>
  )
}
