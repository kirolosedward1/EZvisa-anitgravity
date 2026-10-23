"use client"

import Image from "next/image"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { PaymentMarks } from "@/components/payment-marks"
import { openCookieSettings } from "@/components/cookie-consent"
import { CompanyFooterBlock } from "@/components/legal/company-details"
import { COMPANY, COMPANY_DETAILS_READY } from "@/lib/legal/company"

const socialLinks = [
  {
    name: "YouTube",
    href: "https://www.youtube.com/@ezvisa_dxb",
    hoverColor: "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600",
    icon: (props: { className?: string }) => (
      <svg className={props.className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/ezvisa.net",
    hoverColor: "hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600",
    icon: (props: { className?: string }) => (
      <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/ezvisadxb",
    hoverColor: "hover:bg-blue-600/10 hover:border-blue-600/30 hover:text-blue-600",
    icon: (props: { className?: string }) => (
      <svg className={props.className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@ezvisa.net",
    hoverColor: "hover:bg-foreground/10 hover:border-foreground/30 hover:text-foreground",
    icon: (props: { className?: string }) => (
      <svg className={props.className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
  },
]

const footerSections = [
  {
    title: "Company",
    titleAr: "الشركة",
    links: [
      { href: "/about", label: "About", labelAr: "من نحن" },
      { href: "/how-it-works", label: "How it works", labelAr: "كيف يعمل" },
      { href: "/contact", label: "Contact", labelAr: "اتصل بنا" },
    ],
  },
  {
    title: "Services",
    titleAr: "الخدمات",
    links: [
      { href: "/apply", label: "Apply now", labelAr: "قدّم الآن" },
      { href: "/destinations", label: "Visa destinations", labelAr: "وجهات التأشيرة" },
      { href: "/documents", label: "Required documents", labelAr: "المستندات المطلوبة" },
      { href: "/pricing", label: "Pricing", labelAr: "الأسعار" },
      { href: "/app", label: "Mobile app", labelAr: "تطبيق الجوال" },
    ],
  },
  {
    title: "Resources",
    titleAr: "المصادر",
    links: [
      { href: "/news", label: "Journal", labelAr: "المجلة" },
      { href: "/videos", label: "Videos", labelAr: "الفيديوهات" },
      { href: "/#faq", label: "FAQ", labelAr: "الأسئلة الشائعة" },
      { href: "/refund-policy", label: "Refund policy", labelAr: "سياسة الاسترداد" },
    ],
  },
  {
    title: "Legal",
    titleAr: "الشؤون القانونية",
    links: [
      { href: "/privacy-policy", label: "Privacy policy", labelAr: "سياسة الخصوصية" },
      { href: "/terms-of-service", label: "Terms of service", labelAr: "شروط الخدمة" },
      { href: "/cookie-policy", label: "Cookie policy", labelAr: "سياسة ملفات تعريف الارتباط" },
      { href: "/disclaimer", label: "Disclaimer", labelAr: "إخلاء المسؤولية" },
      { href: "#cookie-settings", label: "Cookie settings", labelAr: "إعدادات ملفات تعريف الارتباط", isCookieButton: true },
    ],
  },
]

interface FooterProps {
  simplified?: boolean
  className?: string
  transparent?: boolean
  limitWidth?: boolean
}

/** Customer pages (dashboard, account, tracking, receipts): a one-line footer instead of the marketing footer. */
const ACCOUNT_PREFIXES = ["/dashboard", "/account", "/track", "/receipt", "/trip", "/continue"]

function AccountFooter({ className }: { className?: string }) {
  const year = new Date().getUTCFullYear()
  const links = [
    { href: "/contact", en: "Help", ar: "المساعدة" },
    { href: "/privacy-policy", en: "Privacy", ar: "الخصوصية" },
    { href: "/terms-of-service", en: "Terms", ar: "الشروط" },
    { href: "/refund-policy", en: "Refunds", ar: "الاسترداد" },
  ]
  return (
    <footer className={cn("border-t border-border/80 bg-background text-foreground", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:justify-between">
        <p>
          <LangText
            en={<>&copy; <span suppressHydrationWarning>{year}</span> EZvisa</>}
            ar={<>&copy; <span suppressHydrationWarning>{year}</span> إيزي فيزا</>}
          />
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a
            href="https://wa.me/971547109533?text=Hi%20EZvisa!%20I%20have%20a%20question%20about%20my%20visa%20application."
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1A7F37] hover:underline"
          >
            <LangText en="WhatsApp support" ar="الدعم عبر واتساب" />
          </a>
          {links.map((link) => (
            <LocaleLink key={link.href} href={link.href} className="hover:text-foreground">
              <LangText en={link.en} ar={link.ar} />
            </LocaleLink>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export function Footer({ 
  simplified = false,
  className = "",
  transparent = false,
  limitWidth = false
}: FooterProps) {
  const currentYear = new Date().getUTCFullYear()
  const [openSection, setOpenSection] = useState<string | null>(null)
  const pathname = usePathname()
  const path = (pathname || "/").replace(/^\/ar(?=\/|$)/, "") || "/"
  if (ACCOUNT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return <AccountFooter className={className} />

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
      {/* Decorative flight path overlay */}
      <div className="absolute top-12 left-[10%] w-[300px] h-[220px] pointer-events-none select-none opacity-[0.05] dark:opacity-[0.08] -rotate-[15deg] hidden md:block">
        <Image
          src="/images/flight-path-3.png"
          alt=""
          fill
          sizes="300px"
          className="object-contain dark:brightness-0 dark:invert"
        />
      </div>

      <div className={`relative z-10 container mx-auto px-4 lg:px-8 ${simplified ? 'py-6' : 'py-16 md:py-20'}`} style={{ maxWidth: '1312px' }}>

        {!simplified && (
          <>
            {/* Top section: brand statement + nav */}
            <div className="grid lg:grid-cols-[1.4fr_2fr] gap-12 lg:gap-16 pb-12 md:pb-16">

              {/* Brand block */}
              <div>
                <LocaleLink href="/" className="inline-block mb-8">
                  <Image
                    src="/images/logo-main.png"
                    alt="EZvisa"
                    width={150}
                    height={48}
                    className="h-9 w-auto"
                  />
                </LocaleLink>

                <h2 className="text-balance mb-5">
                  <LangText en="Your Schengen visa, made simple." ar="تأشيرة شنغن، ببساطة." />
                </h2>

                <p className="text-[#3A4150] leading-relaxed max-w-md">
                  <LangText
                    en="Schengen visa application preparation for travelers across the UAE."
                    ar="تجهيز طلبات تأشيرة شنغن للمسافرين في جميع أنحاء الإمارات."
                  />
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-[#3A4150]">
                  <span><LangText en="Questions?" ar="لديك سؤال؟" /></span>
                  <a
                    href="https://wa.me/971547109533?text=Hi%20EZvisa!%20I%20have%20a%20question%20about%20my%20visa%20application."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#1A7F37] hover:underline transition-colors font-medium"
                  >
                    <LangText en="Chat with us on WhatsApp" ar="تحدث معنا على واتساب" />
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
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
                      <span className="text-sm font-semibold text-foreground"><LangText en={section.title} ar={section.titleAr} /></span>
                      <ChevronDown
                        className={`h-4 w-4 text-[#5B6475] transition-transform duration-200 ${
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
                                onClick={openCookieSettings}
                                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                              >
                                <LangText en={link.label} ar={link.labelAr} />
                              </button>
                            ) : (
                              <LocaleLink href={link.href} className="text-[#3A4150] hover:text-foreground transition-colors text-sm">
                                <LangText en={link.label} ar={link.labelAr} />
                              </LocaleLink>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {footerSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-foreground mb-4"><LangText en={section.title} ar={section.titleAr} /></h3>
                    <ul className="space-y-1">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          {link.isCookieButton ? (
                            <button
                              onClick={openCookieSettings}
                              className="block py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <LangText en={link.label} ar={link.labelAr} />
                            </button>
                          ) : (
                            <LocaleLink
                              href={link.href}
                              className="block py-1.5 text-sm text-[#3A4150] hover:text-foreground transition-colors"
                            >
                              <LangText en={link.label} ar={link.labelAr} />
                            </LocaleLink>
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
              <div className="text-xs leading-relaxed max-w-4xl mx-auto text-[#3A4150] mb-3">
                <CompanyFooterBlock />
              </div>
              <p className="text-xs leading-relaxed max-w-4xl mx-auto text-[#3A4150]/70">
                <LangText
                  en={
                    <>
                      <span className="font-medium text-[#0A0F1F]/80">Disclaimer:</span> EZvisa is a private company and is not affiliated with any government, embassy or consulate. EZvisa is a private visa application preparation service. We are not a government body and are not affiliated with any embassy, consulate, visa application centre (including VFS Global) or government authority. We do not guarantee visa approval; the decision rests solely with the embassy or consulate. Our fees are service fees only and do not include government or visa centre fees. EZvisa is not VAT-registered; prices shown are final.
                    </>
                  }
                  ar={
                    <>
                      <span className="font-medium text-[#0A0F1F]/80">إخلاء مسؤولية:</span> إيزي فيزا شركة خاصة وغير تابعة لأي حكومة أو سفارة أو قنصلية. إيزي فيزا خدمة خاصة لتجهيز طلبات التأشيرة. لسنا جهة حكومية ولسنا تابعين لأي سفارة أو قنصلية أو مركز طلبات تأشيرات (بما في ذلك VFS Global) أو أي جهة حكومية. لا نضمن الموافقة على التأشيرة؛ القرار يعود حصريًا إلى السفارة أو القنصلية. رسومنا رسوم خدمة فقط ولا تشمل الرسوم الحكومية أو رسوم مراكز التأشيرات. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية.
                    </>
                  }
                />
              </p>
            </div>
          </>
        )}

        {/* Bottom bar */}
        <div className={simplified ? "" : "border-t border-border/80 pt-6"}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5">

            <PaymentMarks />

            <div className="flex justify-center items-center gap-3">
              {socialLinks.map((social) => {
                const IconComp = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className={`h-10 w-10 rounded-full bg-secondary/80 dark:bg-secondary/40 border border-border/70 text-muted-foreground flex items-center justify-center transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-1 ${social.hoverColor}`}
                  >
                    <IconComp className="h-4.5 w-4.5" />
                  </a>
                )
              })}
            </div>

            <p className="text-xs text-[#3A4150] text-center md:text-end">
              <LangText
                en={<>&copy; <span suppressHydrationWarning>{currentYear}</span> {COMPANY_DETAILS_READY ? `${COMPANY.COMPANY_LEGAL_NAME}. All rights reserved. · ` : ""}EZvisa</>}
                ar={<>&copy; <span suppressHydrationWarning>{currentYear}</span> {COMPANY_DETAILS_READY ? `${COMPANY.COMPANY_LEGAL_NAME}. جميع الحقوق محفوظة. · ` : ""}EZvisa</>}
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
