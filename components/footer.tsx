"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Youtube, Instagram, Facebook, ChevronDown, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

const footerSections = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/apply", label: "Apply now" },
      { href: "/destinations", label: "Visa destinations" },
      { href: "/documents", label: "Required documents" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/news", label: "Journal" },
      { href: "/videos", label: "Videos" },
      { href: "/#faq", label: "FAQ" },
      { href: "/refund-policy", label: "Refund policy" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms-of-service", label: "Terms of service" },
      { href: "#cookie-settings", label: "Cookie settings", isCookieButton: true },
    ],
  },
]

interface FooterProps {
  simplified?: boolean
  className?: string
  transparent?: boolean
  limitWidth?: boolean
}

export function Footer({ 
  simplified = false,
  className = "",
  transparent = false,
  limitWidth = false
}: FooterProps) {
  const currentYear = new Date().getFullYear()
  const [openSection, setOpenSection] = useState<string | null>(null)

  const toggleSection = (title: string) => {
    setOpenSection(openSection === title ? null : title)
  }

  return (
    <footer className={cn(
      "relative text-foreground overflow-hidden",
      transparent ? "bg-transparent" : "bg-background border-t border-border/80",
      limitWidth ? "w-full max-w-[1312px] mx-auto" : "",
      className
    )}>
      {/* Decorative orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/4 blur-3xl pointer-events-none" />

      {/* Decorative flight path overlay */}
      <div className="absolute top-12 left-[10%] w-[300px] h-[220px] pointer-events-none select-none opacity-[0.05] dark:opacity-[0.08] -rotate-[15deg] hidden md:block">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          className="object-contain dark:brightness-0 dark:invert"
          priority
          unoptimized
        />
      </div>

      <div className={`relative z-10 container mx-auto px-4 lg:px-8 ${simplified ? 'py-6' : 'py-16 md:py-20'}`} style={{ maxWidth: '1312px' }}>

        {!simplified && (
          <>
            {/* Top section: brand statement + nav */}
            <div className="grid lg:grid-cols-[1.4fr_2fr] gap-12 lg:gap-16 pb-12 md:pb-16">

              {/* Brand block */}
              <div>
                <Link href="/" className="inline-block mb-8">
                  <Image
                    src="/images/logo-main.png"
                    alt="EZvisa"
                    width={150}
                    height={48}
                    className="h-9 w-auto"
                  />
                </Link>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight tracking-tight text-balance mb-5 text-foreground">
                  Your Schengen visa, made simple.
                </h2>

                <p className="text-muted-foreground text-base leading-relaxed max-w-md">
                  Schengen visa specialists trusted by 5,000+ travelers from across the UAE.
                </p>

                {/* Newsletter / contact prompt */}
                <div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Questions?</span>
                  <Link
                    href="https://wa.me/971547109533"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    Chat with us on WhatsApp
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Mobile accordion */}
              <div className="md:hidden">
                {footerSections.map((section, index) => (
                  <div key={section.title} className="border-b border-border/60">
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="flex items-center justify-between w-full py-4 text-left"
                      aria-expanded={openSection === section.title}
                      aria-controls={`footer-section-${index}`}
                    >
                      <span className="text-sm font-semibold text-foreground">{section.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                          openSection === section.title ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <div
                      id={`footer-section-${index}`}
                      className={`transition-all duration-200 overflow-hidden ${
                        openSection === section.title ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul className="space-y-3">
                        {section.links.map((link) => (
                          <li key={link.href}>
                            {link.isCookieButton ? (
                              <button
                                onClick={() => {
                                  localStorage.removeItem("cookie-consent")
                                  window.location.reload()
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                              >
                                {link.label}
                              </button>
                            ) : (
                              <Link href={link.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                                {link.label}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid md:grid-cols-4 gap-8">
                {footerSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-foreground mb-4">{section.title}</h3>
                    <ul className="space-y-3">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          {link.isCookieButton ? (
                            <button
                              onClick={() => {
                                  localStorage.removeItem("cookie-consent")
                                  window.location.reload()
                              }}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {link.label}
                            </button>
                          ) : (
                            <Link
                              href={link.href}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {link.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="border-t border-border/80 pt-6 mb-8 text-center">
              <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-4xl mx-auto">
                <span className="text-foreground/80 font-medium">Disclaimer:</span> EZvisa is not a travel agency. We provide document preparation and guidance services only. We do not guarantee visa approval — final decisions rest solely with the respective embassy or consulate. All travel arrangements and visa outcomes are subject to official government policies.
              </p>
            </div>
          </>
        )}

        {/* Bottom bar */}
        <div className={simplified ? "" : "border-t border-border/80 pt-6"}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5">

            <Image
              src="/images/payment-methods.jpg"
              alt="Accepted Payment Methods"
              width={300}
              height={60}
              className="h-8 w-auto rounded-xs opacity-75 dark:opacity-85 mix-blend-multiply dark:mix-blend-normal"
            />

            <div className="flex justify-center items-center gap-5">
              <a href="https://www.youtube.com/@ezvisa_dxb" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-blue-600 transition-all hover:scale-110" aria-label="YouTube">
                <Youtube className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a href="https://www.instagram.com/ezvisa.net" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-pink-600 transition-all hover:scale-110" aria-label="Instagram">
                <Instagram className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a href="https://www.facebook.com/ezvisadxb" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-blue-700 transition-all hover:scale-110" aria-label="Facebook">
                <Facebook className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a href="https://www.tiktok.com/@ezvisa.net" target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-all hover:scale-110" aria-label="TikTok">
                <TikTokIcon className="h-5 w-5" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center md:text-right">
              &copy; {currentYear} EZvisa · ezvisa.net
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
