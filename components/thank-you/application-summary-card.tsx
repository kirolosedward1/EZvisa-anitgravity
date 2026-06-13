"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CreditCard, DollarSign, Globe, MapPin, User } from "lucide-react"
import { format } from "date-fns"

interface ApplicationData {
  firstName: string
  lastName: string
  nationality: string
  destination: string
  travelStartDate: string
  travelEndDate: string
  paymentAmount: number
  currencySymbol: string
  packageType: string
  transactionId?: string
}

interface ApplicationSummaryCardProps {
  applicationData: ApplicationData
}

export function ApplicationSummaryCard({ applicationData }: ApplicationSummaryCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy")
    } catch {
      return dateString
    }
  }

  const summaryItems = [
    {
      icon: User,
      label: "Applicant",
      value: `${applicationData.firstName} ${applicationData.lastName}`,
    },
    {
      icon: Globe,
      label: "Nationality",
      value: applicationData.nationality,
    },
    {
      icon: MapPin,
      label: "Destination",
      value: applicationData.destination,
    },
    {
      icon: Calendar,
      label: "Travel Dates",
      value: `${formatDate(applicationData.travelStartDate)} - ${formatDate(applicationData.travelEndDate)}`,
    },
    {
      icon: DollarSign,
      label: "Package",
      value: applicationData.packageType,
    },
    {
      icon: CreditCard,
      label: "Amount Paid",
      value: `${applicationData.currencySymbol} ${applicationData.paymentAmount.toFixed(2)}`,
    },
  ]

  if (applicationData.transactionId) {
    summaryItems.push({
      icon: CreditCard,
      label: "Transaction ID",
      value: applicationData.transactionId,
    })
  }

  return (
    <Card className="sticky top-24 shadow-lg border-primary/20">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
        <CardTitle className="text-lg font-semibold">Application Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {summaryItems.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Status Badge */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Payment Confirmed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
