"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Rocket, ChevronDown, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"

const nationalities = ["Egypt", "India", "Jordan", "Pakistan", "Russian Federation", "Syria"]

interface SiteHeaderProps {
  hideNavigation?: boolean
  forceBackground?: boolean
}

export function SiteHeader({ hideNavigation = false, forceBackground = false }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isWizardPage = pathname?.startsWith("/apply")
  const isHomePage = pathname === "/"
  
  const [selectedNationality, setSelectedNationality] = useState("")
  const [isNationalityOpen, setIsNationalityOpen] = useState(false)
  const [showGetStarted, setShowGetStarted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null)

  const getWhatsAppMessage = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.href : ''
    if (isWizardPage) return `Hi! I need help with my visa application. I'm currently on the application page: ${baseUrl}`
    if (pathname === '/') return `Hi! I'm interested in applying for a Schengen visa. Can you help me get started?`
    if (pathname?.startsWith('/destinations')) return `Hi! I have questions about travel destinations and document checklists. Page: ${baseUrl}`
    if (pathname?.startsWith('/documents')) return `Hi! I have questions about the required documents for my visa application. Page: ${baseUrl}`
    if (pathname?.startsWith('/news')) return `Hi! I have a question about visa information. Page: ${baseUrl}`
    if (pathname?.startsWith('/contact')) return `Hi! I'd like to get in touch regarding visa services.`
    if (pathname?.startsWith('/success-stories')) return `Hi! I saw your success stories and I'm interested in applying for a visa.`
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      if (isHomePage) {
        const heroSection = document.getElementById("hero")
        if (heroSection) {
          const heroBottom = heroSection.getBoundingClientRect().bottom
          setShowGetStarted(heroBottom < 0)
        }
      } else {
        setShowGetStarted(true)
      }
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll)
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
      router.push(`/#${sectionId}`)
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
          window.history.replaceState(null, "", pathname)
        }
      }, 300)
    }
  }, [pathname])

  const navItems = [
    { label: "Services", id: "services", type: "scroll" },
    { label: "Destinations", id: "/destinations", type: "link" },
    { label: "Documents", id: "/documents", type: "link" },
    { label: "Success Stories", id: "testimonials", type: "scroll" },
    { label: "FAQ", id: "faq", type: "scroll" },
    { label: "News", id: "/news", type: "link" },
    { label: "Videos", id: "/videos", type: "link" },
  ]

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>

      <header 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 flex justify-center max-w-6xl">
          <div className={`w-full flex items-center justify-between gap-4 transition-all duration-300 rounded-full px-4 sm:px-6 py-2.5 ${
            scrolled || forceBackground || isWizardPage
              ? "bg-background/80 backdrop-blur-xl border border-border/60 shadow-lg shadow-black/5" 
              : "bg-transparent border-transparent"
          }`}>
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image 
                src="/images/logo-main.png" 
                alt="EZvisa Logo" 
                width={120} 
                height={38} 
                className="h-7 sm:h-8 w-auto" 
                priority
              />
            </Link>

            {!isWizardPage && !hideNavigation && (
              <nav className="hidden lg:flex items-center gap-1.5 px-2">
                {navItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative"
                    onMouseEnter={() => setHoveredNavItem(item.id)}
                    onMouseLeave={() => setHoveredNavItem(null)}
                  >
                    {item.type === "scroll" ? (
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className="relative z-10 inline-flex items-center justify-center bg-transparent border-0 outline-none p-0 px-3.5 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Link
                        href={item.id}
                        className="relative z-10 inline-flex items-center justify-center bg-transparent border-0 outline-none p-0 px-3.5 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                      >
                        {item.label}
                      </Link>
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
                {isWizardPage && (
                  <span className="text-sm hidden sm:inline text-foreground font-semibold">Need help?</span>
                )}
                <Link
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-green-50 hover:bg-green-100 transition-colors shadow-sm"
                  aria-label="Contact us on WhatsApp"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#25D366" />
                  </svg>
                </Link>

                <AnimatePresence>
                  {showWhatsAppTooltip && !isWizardPage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-foreground text-background text-xs font-semibold rounded-lg whitespace-nowrap shadow-xl"
                    >
                      Chat with us
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!isWizardPage && (
                <>
                  <div className="hidden sm:block">
                    <Button variant="default" asChild className="h-10 rounded-full px-5 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                      <Link href="/apply" className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        Get Started
                      </Link>
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
                        <Button variant="default" asChild className="h-10 rounded-full px-4 font-bold shadow-lg shadow-primary/20">
                          <Link href="/apply" className="flex items-center gap-1.5">
                            <Rocket className="h-4 w-4" />
                            <span className="sr-only">Get Started</span>
                          </Link>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${
                  isWizardPage ? "flex" : "lg:hidden"
                } h-10 w-10 rounded-full transition-colors flex items-center justify-center border ${
                  isMenuOpen ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-secondary"
                }`}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
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
                <span className="text-xl font-bold text-foreground">Menu</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="h-10 w-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center text-foreground"
                >
                  <X className="h-5 w-5" />
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
                      {item.type === "scroll" ? (
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className="w-full text-left py-3.5 px-4 text-lg font-semibold text-foreground/80 hover:bg-secondary hover:text-foreground rounded-2xl transition-colors bg-transparent border-0 outline-none cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <Link
                          href={item.id}
                          onClick={() => setIsMenuOpen(false)}
                          className="block py-3.5 px-4 text-lg font-semibold text-foreground/80 hover:bg-secondary hover:text-foreground rounded-2xl transition-colors bg-transparent border-0 outline-none cursor-pointer"
                        >
                          {item.label}
                        </Link>
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
                  <label className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Your nationality</label>
                  <div className="relative">
                    <button
                      onClick={() => setIsNationalityOpen(!isNationalityOpen)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-background border border-border rounded-xl hover:border-primary/50 shadow-sm transition-all text-left"
                    >
                      {selectedNationality ? (
                        <div className="flex items-center gap-3">
                          <span className="relative w-5.5 h-5.5 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                            <Image
                              src={`/flags/${selectedNationality.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                              alt=""
                              fill
                              className="object-cover"
                            />
                          </span>
                          <span className="font-semibold">{selectedNationality}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-medium">Select nationality</span>
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
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="relative w-5.5 h-5.5 rounded-full overflow-hidden inline-block flex-shrink-0 shadow-xs">
                                  <Image
                                    src={`/flags/${nationality.toLowerCase().replace(/\s+/g, "-").replace("russian-federation", "russia")}.png`}
                                    alt=""
                                    fill
                                    className="object-cover"
                                  />
                                </span>
                                <span className="font-semibold">{nationality}</span>
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
