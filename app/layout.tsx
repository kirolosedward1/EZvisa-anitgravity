import type React from "react"
import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CookieConsent } from "@/components/cookie-consent"
import { ScrollRestoration } from "@/components/scroll-restoration"
import { ContinueApplicationNotification } from "@/components/continue-application-notification"
import Script from "next/script"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ezvisa.net"),
  title: {
    default: "EZvisa - Schengen Visa Application Service | 98% Approval Rate",
    template: "%s | EZvisa",
  },
  description:
    "Get your Schengen visa approved fast with EZvisa. AI-powered visa application assistance for 27 European countries. Expert help with documents, itinerary, and cover letters. 98% approval rate. Starting from 249 AED.",
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
    title: "EZvisa - Get Your Schengen Visa Approved | 98% Success Rate",
    description:
      "AI-powered Schengen visa application service for 27 European countries. Expert assistance with documents, itinerary & cover letters. 98% approval rate. From 249 AED.",
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
    title: "EZvisa - Get Your Schengen Visa Approved | 98% Success Rate",
    description:
      "AI-powered Schengen visa service. Expert help for 27 European countries. 98% approval rate. From 249 AED.",
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
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192x192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512x512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
  },
  manifest: "/site.webmanifest?v=2",
  alternates: {
    canonical: "https://www.ezvisa.net/",
  },
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
  },
  generator: 'v0.app'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zooming for accessibility
  userScalable: true, // Allow user scaling for accessibility compliance
  themeColor: "#2563eb",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://client.crisp.chat" />
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
        <ScrollRestoration />
        {children}
        <ContinueApplicationNotification />
        <CookieConsent />
        <Analytics />
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
