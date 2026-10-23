"use client"

import Image from "next/image"
import Link from "next/link"
import { LocaleLink } from "@/components/locale-link"
import { Button } from "@/components/ui/button"
import { Menu, X, Rocket, ChevronDown, Check } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { destinations } from "@/lib/destinations"
import { SCHENGEN_META } from "@/lib/countries"
import { LangText } from "@/components/lang-text"
import { CountryFlag } from "@/components/country-flag"
import { UserMenu, useViewer } from "@/components/user-menu"
import { cn } from "@/lib/utils"
import { citizenshipName, toCitizenshipIso } from "@/lib/nationalities"
import { supportMessage, useSupportCase } from "@/lib/support-context"

const nationalities = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria"]

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#1A7F37" />
    </svg>
  )
}

/** Task pages (wizard, after-payment questions, payment status): logo, "Need help?" and WhatsApp only. */
const MINIMAL_PREFIXES = ["/apply", "/continue", "/payment-success", "/payment-failed"]
/** Customer pages: always the short account header. */
const ACCOUNT_PREFIXES = ["/dashboard", "/account", "/track", "/receipt", "/trip"]

const ACCOUNT_NAV = [
  { href: "/dashboard", en: "My applications", ar: "طلباتي" },
  { href: "/apply", en: "New application", ar: "طلب جديد" },
  { href: "/destinations", en: "Destinations", ar: "الوجهات" },
  { href: "/documents", en: "Required documents", ar: "المستندات المطلوبة" },
  { href: "/news", en: "Blog", ar: "المدونة" },
  { href: "/contact", en: "Help", ar: "المساعدة" },
]

const matches = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`))

interface SiteHeaderProps {
  hideNavigation?: boolean
  forceBackground?: boolean
}

export function SiteHeader({ hideNavigation = false, forceBackground = false }: SiteHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false)
  const rawPathname = usePathname()
  // /ar/* renders the same pages: compare against the locale-free path so /ar gets exactly the EN header.
  const pathname = rawPathname?.replace(/^\/ar(?=\/|$)/, "") || "/"
  const router = useRouter()
  const path = (pathname || "/").replace(/^\/ar(?=\/|$)/, "") || "/"
  const isWizardPage = path.startsWith("/apply")
  const { viewer } = useViewer()
  const isMinimal = matches(path, MINIMAL_PREFIXES)
  // Signed-in customers get the short account header everywhere; customer pages use it before the check finishes.
  const isAccount = !isMinimal && (matches(path, ACCOUNT_PREFIXES) || !!viewer)
  const isFull = !isMinimal && !isAccount
  const isHomePage = pathname === "/"
  
  const [selectedNationality, setSelectedNationality] = useState("")
  const [isNationalityOpen, setIsNationalityOpen] = useState(false)
  const [showGetStarted, setShowGetStarted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null)
  const [isMobileDestinationsOpen, setIsMobileDestinationsOpen] = useState(false)

  const [pageUrl, setPageUrl] = useState<string | null>(null)
  // Application pages register their case so WhatsApp opens with its reference, status and page.
  const supportCase = useSupportCase()

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const apply = () => {
      document.documentElement.style.setProperty("--site-header-height", `${Math.round(el.getBoundingClientRect().height)}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
    // The minimal bar and the full header are different elements: measure whichever is mounted.
  }, [isMinimal])

  useEffect(() => {
    setPageUrl(window.location.href)
  }, [pathname])

  const getWhatsAppMessage = () => {
    if (supportCase) return supportMessage(supportCase)
    const baseUrl = pageUrl ?? ""
    if (isWizardPage) return `Hi! I need help with my visa application. I'm currently on the application page: ${baseUrl}`
    if (pathname === '/') return `Hi! I'm interested in applying for a Schengen visa. Can you help me get started?`
    if (pathname?.startsWith('/destinations')) return `Hi! I have questions about travel destinations and document checklists. Page: ${baseUrl}`
    if (pathname?.startsWith('/documents')) return `Hi! I have questions about the required documents for my visa application. Page: ${baseUrl}`
    if (pathname?.startsWith('/news')) return `Hi! I have a question about visa information. Page: ${baseUrl}`
    if (pathname?.startsWith('/contact')) return `Hi! I'd like to get in touch regarding visa services.`
    return `Hi! I have a question about visa services. I'm currently viewing: ${baseUrl}`
  }

  const whatsappLink = `https://wa.me/971547109533?text=${encodeURIComponent(getWhatsAppMessage())}`

  useEffect(() => {
    if (isMenuOpen) {
      const isMobileDevice = window.innerWidth < 1024
      if (isMobileDevice) {
        // Simple lock on mobile to prevent viewport height recalculation stutters in Safari
        document.body.style.overflow = "hidden"
        document.body.style.height = "100%"
        return () => {
          document.body.style.overflow = ""
          document.body.style.height = ""
        }
      } else {
        // Desktop lock to prevent layout shift from scrollbar disappearing
        const scrollY = window.scrollY
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
        document.body.style.position = "fixed"
        document.body.style.top = `-${scrollY}px`
        document.body.style.width = "100%"
        document.body.style.overflow = "hidden"
        document.body.style.paddingRight = `${scrollbarWidth}px`
        return () => {
          document.body.style.position = ""
          document.body.style.top = ""
          document.body.style.width = ""
          document.body.style.overflow = ""
          document.body.style.paddingRight = ""
          window.scrollTo(0, scrollY)
        }
      }
    }
  }, [isMenuOpen])

  useEffect(() => {
    const saved = localStorage.getItem("hero-from-country")
    if (saved) setSelectedNationality(saved)
  }, [])

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20)
          ticking = false
        })
        ticking = true
      }
    }
    
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    
    if (isHomePage) {
      const heroSection = document.getElementById("hero")
      if (heroSection) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            setShowGetStarted(!entry.isIntersecting && entry.boundingClientRect.top < 0)
          },
          { threshold: 0, rootMargin: "0px" }
        )
        observer.observe(heroSection)
        return () => {
          window.removeEventListener("scroll", handleScroll)
          observer.disconnect()
        }
      }
    } else {
      setShowGetStarted(true)
    }

    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomePage])

  const handleNationalitySelect = (nationality: string) => {
    setSelectedNationality(nationality)
    localStorage.setItem("hero-from-country", nationality)
    setIsNationalityOpen(false)
    window.dispatchEvent(new CustomEvent("nationalityChange", { detail: { nationality } }))
  }

  const scrollToSection = (sectionId: string) => {
    setIsMenuOpen(false)
    if (pathname === "/") {
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          const headerHeight = 80
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20
          window.scrollTo({ top: offsetPosition, behavior: "smooth" })
        }
      }, 50)
    } else {
      const arabic = window.location.pathname === "/ar" || window.location.pathname.startsWith("/ar/")
      router.push(`${arabic ? "/ar" : ""}/#${sectionId}`)
    }
  }

  useEffect(() => {
    if (pathname === "/" && window.location.hash) {
      const sectionId = window.location.hash.substring(1)
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          const headerHeight = 80
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20
          window.scrollTo({ top: offsetPosition, behavior: "smooth" })
          window.history.replaceState(null, "", rawPathname)
        }
      }, 300)
    }
  }, [pathname])

  const navItems = [
    { label: "Services", ar: "الخدمات", id: "services", type: "scroll" },
    { label: "Destinations", ar: "الوجهات", id: "/destinations", type: "link" },
    { label: "Documents", ar: "المستندات", id: "/documents", type: "link" },
    { label: "FAQ", ar: "الأسئلة الشائعة", id: "faq", type: "scroll" },
    { label: "News", ar: "الأخبار", id: "/news", type: "link" },
    { label: "Videos", ar: "الفيديوهات", id: "/videos", type: "link" },
  ]

  // Task pages: a plain bar with the logo and one way to get help, nothing to wander off to.
  if (isMinimal) {
    return (
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <LocaleLink href="/" className="flex shrink-0 items-center" aria-label="EZvisa home">
            <Image src="/images/logo-main.png" alt="EZvisa Logo" width={120} height={38} className="h-7 w-auto" priority />
          </LocaleLink>
          <Link
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            aria-label="Need help? Chat with us on WhatsApp / تحتاج مساعدة؟ تواصل معنا عبر واتساب"
          >
            <WhatsAppGlyph className="size-[18px]" />
            <LangText en="Need help?" ar="تحتاج مساعدة؟" />
          </Link>
        </div>
      </header>
    )
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none"
      >
        <LangText en="Skip to main content" ar="تخطي إلى المحتوى الرئيسي" />
      </a>

      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 flex justify-center max-w-7xl">
          <div className={`w-full flex items-center justify-between gap-4 transition-all duration-300 rounded-full px-4 sm:px-6 py-2.5 ${
            scrolled || forceBackground || !isFull
              ? "bg-background border border-border/60 shadow-lg shadow-black/5" 
              : "bg-transparent border-transparent"
          }`}>
            <LocaleLink href="/" className="flex items-center flex-shrink-0">
              <Image 
                src="/images/logo-main.png" 
                alt="EZvisa Logo" 
                width={120} 
                height={38} 
                className="h-7 sm:h-8 w-auto" 
                priority
              />
            </LocaleLink>

            {isAccount && !hideNavigation && (
              <nav className="hidden lg:flex items-center gap-1 px-1" aria-label="Account">
                {ACCOUNT_NAV.map((item) => {
                  const active = item.href === "/dashboard" ? matches(path, ["/dashboard", "/track", "/continue"]) : matches(path, [item.href])
                  return (
                    <LocaleLink
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                        active ? "bg-secondary text-foreground" : "text-foreground/75 hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <LangText en={item.en} ar={item.ar} />
                    </LocaleLink>
                  )
                })}
              </nav>
            )}

            {isFull && !hideNavigation && (
              <nav className="hidden xl:flex items-center gap-1.5 px-1">
                {navItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative"
                    onMouseEnter={() => setHoveredNavItem(item.id)}
                    onMouseLeave={() => setHoveredNavItem(null)}
                  >
                    {item.id === "/destinations" ? (
                      <>
                        <LocaleLink
                          href={item.id}
                          className="relative z-10 inline-flex items-center justify-center bg-transparent border-0 outline-none p-0 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer group whitespace-nowrap"
                        >
                          <LangText en={item.label} ar={item.ar} />
                          <ChevronDown className="ms-1 h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-all duration-300" />
                        </LocaleLink>
                        
                        {/* Mega Menu Dropdown */}
                        <AnimatePresence>
                          {hoveredNavItem === item.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-[600px] z-50 cursor-default"
                            >
                              <div
                                className="bg-[#FFFFFF] text-[#0A0F1F] border border-[#E3E7EF] rounded-3xl p-6 relative overflow-hidden"
                                style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E7EF", boxShadow: "0 8px 24px rgba(10,15,31,0.08)" }}
                              >
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-sm font-semibold tracking-tight text-foreground"><LangText en="Popular Destinations" ar="وجهات شائعة" /></h3>
                                    <LocaleLink href="/destinations" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                                      <LangText en="View all" ar="عرض الكل" /> <span className="hidden sm:inline"><LangText en="29 countries" ar="٢٩ دولة" /></span> &rarr;
                                    </LocaleLink>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {destinations.filter(d => d.popular).slice(0, 8).map(dest => (
                                      <LocaleLink
                                        key={dest.id}
                                        href={`/destinations/${dest.slug}`}
                                        className="group/item flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50"
                                      >
                                        <CountryFlag iso={SCHENGEN_META[dest.name]?.iso} title={dest.name} />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors truncate">{dest.name}</div>
                                          <div className="text-[11px] text-muted-foreground truncate">{dest.visaType}</div>
                                        </div>
                                      </LocaleLink>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    ) : item.type === "scroll" ? (
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className="relative z-10 inline-flex items-center justify-center bg-transparent border-0 outline-none p-0 px-3 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <LangText en={item.label} ar={item.ar} />
                      </button>
                    ) : (
                      <LocaleLink
                        href={item.id}
                        className="relative z-10 inline-flex items-center justify-center bg-transparent border-0 outline-none p-0 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <LangText en={item.label} ar={item.ar} />
                      </LocaleLink>
                    )}
                    {hoveredNavItem === item.id && (
                      <motion.div
                        layoutId="nav-hover"
                        className="absolute inset-0 bg-secondary rounded-full -z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                ))}
              </nav>
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="relative flex items-center gap-2"
                onMouseEnter={() => setShowWhatsAppTooltip(true)}
                onMouseLeave={() => setShowWhatsAppTooltip(false)}
              >
                <Link
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
                  aria-label="Contact us on WhatsApp / تواصل معنا عبر واتساب"
                >
                  <WhatsAppGlyph className="size-[22px]" />
                </Link>

                <AnimatePresence>
                  {showWhatsAppTooltip && !isMinimal && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-foreground text-background text-xs font-semibold rounded-lg whitespace-nowrap shadow-xl"
                    >
                      <LangText en="Chat with us" ar="تحدث معنا" />
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!isMinimal && <UserMenu />}

              {isFull && (
                <>
                  <div className="hidden sm:block">
                    <Button variant="default" asChild className="h-10 rounded-full px-5 text-[15px] font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                      <LocaleLink href="/apply" className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        <LangText en="Get Started" ar="ابدأ الآن" />
                      </LocaleLink>
                    </Button>
                  </div>
                  
                  <AnimatePresence>
                    {showGetStarted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, width: 0 }}
                        animate={{ opacity: 1, scale: 1, width: "auto" }}
                        exit={{ opacity: 0, scale: 0.9, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="sm:hidden overflow-hidden"
                      >
                        <Button variant="default" asChild className="h-10 rounded-full px-4 font-semibold shadow-lg shadow-primary/20">
                          <LocaleLink href="/apply" className="flex items-center gap-1.5">
                            <Rocket className="h-4 w-4" />
                            <span className="sr-only"><LangText en="Get Started" ar="ابدأ الآن" /></span>
                          </LocaleLink>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {isFull && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`xl:hidden h-10 w-10 rounded-full transition-colors flex items-center justify-center border ${
                  isMenuOpen ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-secondary"
                }`}
                aria-label="Toggle menu / القائمة"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && isFull && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-background border-l border-border/50 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                <span className="text-base font-medium text-foreground"><LangText en="Menu" ar="القائمة" /></span>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                  className="h-10 w-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center text-foreground"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 p-6 overflow-y-auto">
                <div className="flex flex-col gap-1">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      {item.id === "/destinations" ? (
                        <div className="w-full">
                          <button
                            onClick={() => setIsMobileDestinationsOpen(!isMobileDestinationsOpen)}
                            className="site-menu-item w-full flex items-center justify-between py-3.5 px-4 text-foreground/80 hover:bg-secondary hover:text-foreground rounded-2xl transition-colors bg-transparent border-0 outline-none cursor-pointer"
                          >
                            <span><LangText en={item.label} ar={item.ar} /></span>
                            <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isMobileDestinationsOpen ? "rotate-180" : ""}`} />
                          </button>
                          <AnimatePresence>
                            {isMobileDestinationsOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-2 pb-4 px-2 space-y-1">
                                  {destinations.filter(d => d.popular).slice(0, 6).map(dest => (
                                    <LocaleLink
                                      key={dest.id}
                                      href={`/destinations/${dest.slug}`}
                                      onClick={() => setIsMenuOpen(false)}
                                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-secondary/50 transition-colors"
                                    >
                                      <CountryFlag iso={SCHENGEN_META[dest.name]?.iso} title={dest.name} />
                                      <span className="site-menu-item text-foreground">{dest.name}</span>
                                    </LocaleLink>
                                  ))}
                                  <LocaleLink
                                    href="/destinations"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="block text-center py-3 mt-2 text-sm font-semibold text-primary hover:underline"
                                  >
                                    <LangText en="View all countries" ar="عرض كل الدول" /> &rarr;
                                  </LocaleLink>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : item.type === "scroll" ? (
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className="site-menu-item w-full text-start py-3.5 px-4 text-foreground/80 hover:bg-secondary hover:text-foreground rounded-2xl transition-colors bg-transparent border-0 outline-none cursor-pointer"
                        >
                          <LangText en={item.label} ar={item.ar} />
                        </button>
                      ) : (
                        <LocaleLink
                          href={item.id}
                          onClick={() => setIsMenuOpen(false)}
                          className="site-menu-item block py-3.5 px-4 text-foreground/80 hover:bg-secondary hover:text-foreground rounded-2xl transition-colors bg-transparent border-0 outline-none cursor-pointer"
                        >
                          <LangText en={item.label} ar={item.ar} />
                        </LocaleLink>
                      )}
                    </motion.div>
                  ))}
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 p-5 bg-secondary/50 rounded-3xl space-y-3"
                >
                  <label className="type-eyebrow text-[#5B6475]"><LangText en="Your nationality" ar="جنسيتك" /></label>
                  <div className="relative">
                    <button
                      onClick={() => setIsNationalityOpen(!isNationalityOpen)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-background border border-border rounded-xl hover:border-primary/50 shadow-sm transition-all text-start"
                    >
                      {selectedNationality ? (
                        <div className="flex items-center gap-3">
                          <CountryFlag iso={toCitizenshipIso(selectedNationality)} title={citizenshipName(selectedNationality) || selectedNationality} />
                          <span className="font-medium">{citizenshipName(selectedNationality) || selectedNationality}</span>
                        </div>
                      ) : (
                        <span className="text-[#5B6475] font-medium"><LangText en="Select nationality" ar="اختر الجنسية" /></span>
                      )}
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isNationalityOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {isNationalityOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-10 max-h-60 overflow-y-auto py-1"
                        >
                          {nationalities.map((nationality) => (
                            <button
                              key={nationality}
                              onClick={() => handleNationalitySelect(nationality)}
                              className="site-menu-item w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary transition-colors text-start"
                            >
                              <div className="flex items-center gap-3">
                                <CountryFlag iso={toCitizenshipIso(nationality)} title={nationality} />
                                <span className="font-medium">{nationality}</span>
                              </div>
                              {selectedNationality === nationality && <Check className="h-5 w-5 text-primary" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
