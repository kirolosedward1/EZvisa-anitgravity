"use client"

import React, { useState, useEffect } from "react"
import { Search, ArrowRight, Compass, Sparkles, HelpCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { destinations, Destination } from "@/lib/destinations"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

type TabType = "all" | "schengen" | "non-schengen"

export function DestinationsCatalog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [mounted, setMounted] = useState(false)

  // Scroll to top on mount
  useEffect(() => {
    setMounted(true)
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  // Filter destinations based on search query and active tab
  const filteredDestinations = destinations.filter((dest) => {
    const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === "schengen") {
      return matchesSearch && dest.region === "Schengen"
    } else if (activeTab === "non-schengen") {
      return matchesSearch && dest.region !== "Schengen"
    }
    
    return matchesSearch
  })

  // Prevent hydration discrepancies
  if (!mounted) {
    return null
  }

  return (
    <div className="w-full">
      {/* Search and Tabs Control Panel */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border/40 py-6 mb-10">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Real-time Search */}
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 h-11 text-sm bg-muted/40 hover:bg-muted/60 focus:bg-background border-border/80 rounded-full transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Custom Sliding Tabs */}
            <div className="flex items-center bg-muted/60 p-1.5 rounded-full border border-border/20 w-full md:w-auto overflow-x-auto select-none no-scrollbar">
              {(
                [
                  { id: "all", label: "All Destinations" },
                  { id: "schengen", label: "Schengen Zone" },
                  { id: "non-schengen", label: "Non-Schengen" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap outline-none cursor-pointer ${
                    activeTab === tab.id
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-primary rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <section className="pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <AnimatePresence mode="popLayout">
            {filteredDestinations.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {filteredDestinations.map((country, idx) => (
                  <motion.div
                    layout
                    key={country.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                    className="relative aspect-[3/4] rounded-3xl overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 bg-muted"
                  >
                    {/* Country Background Image & Link to landing page */}
                    <Link href={`/destinations/${country.slug}`} className="absolute inset-0 z-0 block cursor-pointer">
                      <Image
                        src={country.image}
                        alt={`${country.name} visa checklist documents`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                      />
                      {/* Vignette Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10 transition-opacity duration-300 group-hover:from-black/100 group-hover:via-black/50" />
                    </Link>

                    {/* Top Right Circular Arrow Icon (links to landing page) */}
                    <div className="absolute top-4 right-4 z-20">
                      <Link
                        href={`/destinations/${country.slug}`}
                        className="h-10 w-10 border border-white/30 rounded-full hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-300"
                        aria-label={`Visa destination details for ${country.name}`}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </div>

                    {/* Bottom Info Details */}
                    <div className="absolute bottom-5 left-5 right-5 z-20 text-white flex flex-col pointer-events-none transition-transform duration-300 group-hover:-translate-y-1">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                        <span className="relative w-3.5 h-3.5 rounded-full overflow-hidden inline-block flex-shrink-0">
                          <Image
                            src={`/flags/${country.slug}.png`}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </span>
                        <span>{country.visaType}</span>
                      </span>
                      <h3 className="text-lg font-bold tracking-tight mb-1">
                        {country.name}
                      </h3>
                      <div className="text-[11px] font-semibold text-white/70">
                        Starts at <span className="text-white text-xs font-bold">{country.price}</span>
                      </div>
                    </div>

                    {/* Quick Apply Action Button (Floating) */}
                    <div className="absolute bottom-5 right-5 z-30 pointer-events-auto opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                      <Link
                        href={`/apply?to=${encodeURIComponent(country.name)}`}
                        className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-[11px] font-bold rounded-full shadow-lg flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span>Apply Now</span>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : activeTab === "non-schengen" ? (
              // Glassmorphic Coming Soon Block
              <motion.div
                key="coming-soon"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto text-center py-16 px-6 bg-gradient-to-br from-muted/50 to-muted border border-border/40 rounded-3xl backdrop-blur-sm"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                  <Compass className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Non-Schengen Visa Support</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-8">
                  We're currently expanding our platform to support visa applications for the United States, 
                  United Kingdom, Canada, Australia, and more. 
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/apply" className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-colors text-xs">
                    Start Schengen Application
                  </Link>
                  <Link href="/contact" className="px-6 py-2.5 bg-muted-foreground/10 hover:bg-muted-foreground/15 text-foreground font-semibold rounded-full transition-colors text-xs border border-border/20">
                    Get Notified / Support
                  </Link>
                </div>
              </motion.div>
            ) : (
              // Empty State
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No destinations found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm font-semibold text-primary hover:underline cursor-pointer"
                >
                  Clear Search Filter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
