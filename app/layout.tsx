import type React from "react"
import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { IBM_Plex_Sans_Arabic, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CookieConsent } from "@/components/cookie-consent"
import { ScrollRestoration } from "@/components/scroll-restoration"
import { ContinueApplicationNotification } from "@/components/continue-application-notification"
import { NavigationProgressBar } from "@/components/navigation-progress"
import { PageTransition } from "@/components/page-transition"
import { LocaleDirection } from "@/components/locale-direction"
import { LocaleProvider } from "@/components/locale-provider"
import { CrispVisibility } from "@/components/crisp-visibility"
import Script from "next/script"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

// Arabic glyphs only. Latin keeps Poppins because this subset's unicode-range does not cover it.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ezvisa.net"),
  title: {
    default: "EZvisa | Schengen Visa Application Service for UAE Residents",
    template: "%s | EZvisa",
  },
  description:
    "Schengen visa applications prepared for UAE residents by visa specialists: application form, cover letter, day-by-day itinerary, and flight and hotel reservations. Ready in 1–2 days for 249 AED.",
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
    title: "EZvisa | Schengen Visa Application Service for UAE Residents",
    description:
      "Schengen visa applications prepared for UAE residents by visa specialists: application form, cover letter, day-by-day itinerary, and flight and hotel reservations. Ready in 1–2 days for 249 AED.",
    url: "https://www.ezvisa.net/",
    siteName: "EZvisa",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://www.ezvisa.net/images/logo-main.png",
        width: 1200,
        height: 630,
        alt: "EZvisa - Schengen Visa Application Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EZvisa | Schengen Visa Application Service for UAE Residents",
    description:
      "Your Schengen visa file prepared by visa specialists in 1–2 days: form, cover letter, itinerary, flight and hotel reservations. 249 AED.",
    images: ["https://www.ezvisa.net/images/logo-main.png"],
    creator: "@ezvisa",
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
  manifest: "/site.webmanifest?v=2",
  // No canonical here: a root canonical is inherited by every page that doesn't set its own, which told search
  // engines those pages duplicate the homepage. Each indexable page sets its own (the homepage in app/page.tsx).
  // (The placeholder site-verification codes were removed: they published meaningless meta tags.)
  generator: 'v0.app'
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
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://client.crisp.chat" />
        
        {/* Mobile Favicon & Apple Touch Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=3" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=3" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png?v=3" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon-512x512.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <meta name="apple-mobile-web-app-title" content="EZvisa" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Google Consent Mode defaults, before GA/GTM load. A visitor who chose "Necessary only" (or turned
            analytics/marketing off) in the cookie banner is respected on every page; components/cookie-consent.tsx
            sends updates when the choice changes. Previously the banner's choice was stored but never applied. */}
        <Script id="consent-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            var c = null;
            try { c = JSON.parse(localStorage.getItem('cookie-consent') || 'null'); } catch (e) {}
            var a = !c || c.analytics !== false, m = !c || c.marketing !== false;
            gtag('consent', 'default', {
              analytics_storage: a ? 'granted' : 'denied',
              ad_storage: m ? 'granted' : 'denied',
              ad_user_data: m ? 'granted' : 'denied',
              ad_personalization: m ? 'granted' : 'denied'
            });
          `}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3M5NW9FZYG"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3M5NW9FZYG');
          `}
        </Script>
        <Script id="google-tag-manager" strategy="lazyOnload">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PMXQRKLC');
          `}
        </Script>
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-PMXQRKLC"
            height="0" 
            width="0" 
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <LocaleProvider locale={arabic ? "ar" : "en"}>
        <LocaleDirection />
        <CrispVisibility />
        <NavigationProgressBar />
        <ScrollRestoration />
        {/* overflow-x-clip (not hidden): hidden would turn <main> into a scroll container and stop position: sticky from working on every page */}
        <main className="overflow-x-clip w-full flex flex-col min-h-screen">
          <PageTransition>{children}</PageTransition>
        </main>
        <ContinueApplicationNotification />
        <CookieConsent />
        <Analytics />
        </LocaleProvider>
        <Script id="crisp-chat" strategy="lazyOnload">
          {`
            window.$crisp=[];
            window.CRISP_WEBSITE_ID="d907684d-1156-478a-b3e7-53259782c044";
            (function(){
              d=document;
              s=d.createElement("script");
              s.src="https://client.crisp.chat/l.js";
              s.async=1;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          `}
        </Script>
      </body>
    </html>
  )
}
