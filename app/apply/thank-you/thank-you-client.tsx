"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ThankYouHero } from "@/components/thank-you/thank-you-hero"
import { ApplicationSummaryCard } from "@/components/thank-you/application-summary-card"
import { NextStepsTimeline } from "@/components/thank-you/next-steps-timeline"
import { ThankYouCTASection } from "@/components/thank-you/thank-you-cta-section"
import { Loader2 } from "lucide-react"

interface ApplicationData {
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  destination: string
  travelStartDate: string
  travelEndDate: string
  paymentAmount: number
  currencySymbol: string
  packageType: string
  transactionId?: string
  orderId?: string
}

export function ThankYouClient() {
  const searchParams = useSearchParams()
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Try to get data from sessionStorage first (most reliable)
    const pendingApplicationData = sessionStorage.getItem("pendingApplication")
    
    if (pendingApplicationData) {
      try {
        const data = JSON.parse(pendingApplicationData)
        setApplicationData({
          firstName: data.firstName || "Valued",
          lastName: data.lastName || "Customer",
          email: data.email || "",
          phone: data.phone || "",
          nationality: data.nationality || "",
          destination: data.destination || "",
          travelStartDate: data.travelStartDate || "",
          travelEndDate: data.travelEndDate || "",
          paymentAmount: data.paymentAmount || 0,
          currencySymbol: data.currencySymbol || "AED",
          packageType: data.packageType || "Standard",
          transactionId: data.transactionId || searchParams?.get("transaction_id") || undefined,
          orderId: data.orderId || searchParams?.get("order_id") || undefined,
        })
      } catch (error) {
        console.error("Error parsing application data:", error)
      }
    } else {
      // Fallback to URL params if no sessionStorage data
      const urlData = {
        firstName: searchParams?.get("firstName") || "Valued",
        lastName: searchParams?.get("lastName") || "Customer",
        email: searchParams?.get("email") || "",
        phone: searchParams?.get("phone") || "",
        nationality: searchParams?.get("nationality") || "",
        destination: searchParams?.get("destination") || "",
        travelStartDate: searchParams?.get("startDate") || "",
        travelEndDate: searchParams?.get("endDate") || "",
        paymentAmount: Number.parseFloat(searchParams?.get("amount") || "0"),
        currencySymbol: searchParams?.get("currency") || "AED",
        packageType: searchParams?.get("package") || "Standard",
        transactionId: searchParams?.get("transaction_id") || undefined,
        orderId: searchParams?.get("order_id") || undefined,
      }
      setApplicationData(urlData)
    }

    setIsLoading(false)

    // Clean up after successful payment
    setTimeout(() => {
      sessionStorage.removeItem("pendingApplication")
      localStorage.removeItem("visa_wizard_data")
    }, 2000)
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!applicationData) {
    return (
      <>
        <SiteHeader />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">No Application Data Found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find your application details. Please contact support.
            </p>
            <a
              href="/apply"
              className="text-primary hover:underline font-medium"
            >
              Start New Application
            </a>
          </div>
        </div>
        <Footer simplified transparent limitWidth />
      </>
    )
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section with Success Animation */}
        <ThankYouHero applicationData={applicationData} />

        <div className="container mx-auto px-4 max-w-6xl pb-16">
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            {/* Main Content */}
            <div className="space-y-8">
              {/* Next Steps Timeline */}
              <NextStepsTimeline />

              {/* CTAs and Resources */}
              <ThankYouCTASection 
                orderId={applicationData.orderId} 
                transactionId={applicationData.transactionId}
              />
            </div>

            {/* Sidebar */}
            <div>
              {/* Application Summary Card */}
              <ApplicationSummaryCard applicationData={applicationData} />
            </div>
          </div>
        </div>
      </main>
      <Footer simplified transparent limitWidth />
    </>
  )
}
