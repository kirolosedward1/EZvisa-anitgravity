import type { Metadata } from "next"
import { Smartphone } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { IphoneFrame } from "@/components/app/iphone-frame"
import { StoreBadges } from "@/components/app/store-badges"
import { MotionPreferences, Reveal } from "@/components/app/reveal"
import { generateBreadcrumbSchema, generateStructuredData } from "@/lib/seo"

const PAGE_URL = "https://www.ezvisa.net/app"
const TITLE = "EZvisa App – Schengen visa from your phone"
const DESCRIPTION =
  "Start your Schengen visa application, pay securely, upload your documents and follow your case from the EZvisa app for iPhone. Android is coming soon."

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ["EZvisa app", "Schengen visa app", "visa application app UAE", "track visa application", "iPhone visa app"],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: "EZvisa",
    type: "website",
    locale: "en_US",
    images: [{ url: "/app/og.png", width: 1200, height: 630, alt: "The EZvisa app shown on an iPhone" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/app/og.png"],
  },
}

// Screenshots live in public/app/screenshots (1179 x 2556). The current files are placeholders.
const HERO_SCREEN = {
  src: "/app/screenshots/home.png",
  alt: "EZvisa app home screen: a Germany application marked Paid, with a progress bar, status timeline and a Continue application button",
}

const GALLERY_SCREENS = [
  {
    src: "/app/screenshots/apply.png",
    alt: "EZvisa app apply step asking Where do you want to go, with a list of Schengen countries and Germany selected",
    title: "Apply in minutes",
    text: "One question per screen. Your answers save as you go.",
  },
  {
    src: "/app/screenshots/track.png",
    alt: "EZvisa app application screen for Germany showing the status timeline, appointment details and a document checklist",
    title: "Track your application",
    text: "Real status, real timestamps and your appointment in one place.",
  },
  {
    src: "/app/screenshots/upload.png",
    alt: "EZvisa app document upload screen listing passport, Emirates ID, bank statement and salary certificate with upload progress",
    title: "Upload documents after payment",
    text: "Add the files our experts need, straight from your camera or Files.",
  },
  {
    src: "/app/screenshots/continue.png",
    alt: "EZvisa app continue screen showing a saved Germany draft at the employment step with a Continue button",
    title: "Pick up where you left off",
    text: "Start on the website, finish in the app. Same account, same application.",
  },
]

const structuredData = generateStructuredData(
  {
    "@type": "SoftwareApplication",
    "@id": `${PAGE_URL}#app`,
    name: "EZvisa",
    url: PAGE_URL,
    description: DESCRIPTION,
    operatingSystem: "iOS",
    applicationCategory: "TravelApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
    publisher: { "@id": "https://www.ezvisa.net/#organization" },
  },
  generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "App", url: "/app" },
  ]),
)

export default function AppPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <MotionPreferences>
        <div id="main-content" className="bg-background">
          {/* Hero */}
          <section className="pt-32 pb-16 md:pt-40 md:pb-24" aria-labelledby="app-hero-heading">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <Reveal className="flex flex-col items-start gap-6 text-start">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                    Available for iPhone
                  </span>
                  <h1
                    id="app-hero-heading"
                    className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl"
                  >
                    EZvisa, in your pocket.
                  </h1>
                  <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                    Start your Schengen visa application, pay, add your documents and follow your case from your
                    phone.
                  </p>
                  <StoreBadges />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Same account as the website. An application you start on one shows up on the other.
                  </p>
                </Reveal>

                <Reveal delay={0.1} className="flex justify-center lg:justify-end">
                  <IphoneFrame
                    src={HERO_SCREEN.src}
                    alt={HERO_SCREEN.alt}
                    priority
                    className="w-64 sm:w-72 lg:w-80"
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 272px, 240px"
                  />
                </Reveal>
              </div>
            </div>
          </section>

          {/* Screenshot gallery */}
          <section className="border-t border-border bg-secondary py-16 md:py-24" aria-labelledby="app-screens-heading">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  What&apos;s inside
                </span>
                <h2
                  id="app-screens-heading"
                  className="text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
                >
                  From first question to visa-ready file
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  The app asks only what our experts need, in the order they need it, and shows the real state of your
                  case.
                </p>
              </Reveal>

              <ul
                className="-mx-4 mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4"
                aria-label="App screenshots"
              >
                {GALLERY_SCREENS.map((screen, index) => (
                  <li key={screen.src} className="w-56 shrink-0 snap-center sm:w-60 md:w-auto">
                    <Reveal delay={index * 0.06} className="flex flex-col items-center gap-5 text-center">
                      <IphoneFrame
                        src={screen.src}
                        alt={screen.alt}
                        className="w-full max-w-56 md:max-w-60"
                        sizes="(min-width: 768px) 240px, 224px"
                      />
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-foreground">{screen.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{screen.text}</p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Download */}
          <section className="py-16 md:py-24" aria-labelledby="app-download-heading">
            <div className="container mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-8 shadow-sm md:flex-row md:items-center md:justify-between md:p-12">
                <div className="flex max-w-lg flex-col gap-3 text-start">
                  <h2
                    id="app-download-heading"
                    className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl"
                  >
                    Get the app
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Free to download. The service is 249 AED per application, paid in the app when you are ready, with
                    our money-back guarantee if the visa is denied.
                  </p>
                </div>
                <StoreBadges size="lg" className="shrink-0" />
              </Reveal>
            </div>
          </section>
        </div>
      </MotionPreferences>

      <Footer />
    </>
  )
}
