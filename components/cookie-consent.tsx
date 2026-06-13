"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Link from "next/link"

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    } else {
      try {
        setPreferences(JSON.parse(consent))
      } catch {
        setShowBanner(true)
      }
    }
  }, [])

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    localStorage.setItem("cookie-consent", JSON.stringify(allAccepted))
    localStorage.setItem("cookie-consent-date", new Date().toISOString())
    setPreferences(allAccepted)
    setShowBanner(false)
  }

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
    localStorage.setItem("cookie-consent", JSON.stringify(necessaryOnly))
    localStorage.setItem("cookie-consent-date", new Date().toISOString())
    setPreferences(necessaryOnly)
    setShowBanner(false)
  }

  const savePreferences = () => {
    localStorage.setItem("cookie-consent", JSON.stringify(preferences))
    localStorage.setItem("cookie-consent-date", new Date().toISOString())
    setShowBanner(false)
    setShowPreferences(false)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-4 right-4 z-50 p-5 bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl max-w-md w-[calc(100vw-32px)] sm:w-[420px] max-h-[90vh] overflow-y-auto">
        <div className="w-full">
          {!showPreferences ? (
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-bold text-base text-foreground mb-1">We value your privacy</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  We use cookies to enhance your experience and analyze traffic. Read our{" "}
                  <Link href="/privacy-policy" className="text-primary underline hover:no-underline font-medium">
                    Privacy Policy
                  </Link>{" "}
                  for more information.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button 
                  onClick={() => setShowPreferences(true)} 
                  className="px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-xl transition-all cursor-pointer"
                >
                  Customize
                </button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={acceptNecessary} 
                  className="text-xs h-9 rounded-xl border border-border bg-transparent hover:bg-secondary/50 font-semibold cursor-pointer"
                >
                  Necessary Only
                </Button>
                <Button 
                  size="sm" 
                  onClick={acceptAll} 
                  className="text-xs h-9 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 cursor-pointer"
                >
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground">Cookie Preferences</h3>
                <button 
                  onClick={() => setShowPreferences(false)} 
                  className="h-8 w-8 rounded-full bg-secondary/80 hover:bg-secondary transition-colors flex items-center justify-center text-foreground cursor-pointer"
                  aria-label="Close preferences"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid gap-2.5">
                {/* Necessary Cookies */}
                <div className="flex items-center justify-between p-3 bg-secondary/35 rounded-xl gap-2 border border-border/40">
                  <div className="flex-1">
                    <p className="font-semibold text-xs md:text-sm text-foreground">Necessary Cookies</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Required for the website to function properly</p>
                  </div>
                  <input type="checkbox" checked={preferences.necessary} disabled className="w-5 h-5 accent-primary flex-shrink-0" />
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between p-3 bg-secondary/35 rounded-xl gap-2 border border-border/40">
                  <div className="flex-1">
                    <p className="font-semibold text-xs md:text-sm text-foreground">Functional Cookies</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Remember your preferences and form data</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                    className="w-5 h-5 accent-primary flex-shrink-0 cursor-pointer"
                  />
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between p-3 bg-secondary/35 rounded-xl gap-2 border border-border/40">
                  <div className="flex-1">
                    <p className="font-semibold text-xs md:text-sm text-foreground">Analytics Cookies</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Help us understand how visitors use our site</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="w-5 h-5 accent-primary flex-shrink-0 cursor-pointer"
                  />
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between p-3 bg-secondary/35 rounded-xl gap-2 border border-border/40">
                  <div className="flex-1">
                    <p className="font-semibold text-xs md:text-sm text-foreground">Marketing Cookies</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Used to deliver relevant advertisements</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="w-5 h-5 accent-primary flex-shrink-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={acceptNecessary} 
                  className="text-xs h-9 rounded-xl border border-border bg-transparent hover:bg-secondary/50 font-semibold cursor-pointer"
                >
                  Reject All
                </Button>
                <Button 
                  size="sm" 
                  onClick={savePreferences} 
                  className="bg-primary hover:bg-primary/95 text-white text-xs h-9 rounded-xl font-semibold shadow-md shadow-primary/10 hover:shadow-primary/20 cursor-pointer"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
