"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CreditCard, DollarSign, Globe, MapPin, User } from "lucide-react"
import { format } from "date-fns"
import { DirhamAmount } from "@/components/aed-amount"
import { useSiteLocale } from "@/components/locale-provider"
import { ArabicDate } from "@/components/arabic-date"
import { SCHENGEN_META } from "@/lib/countries"
import { citizenshipNameAr } from "@/lib/nationalities"
import { customerText } from "@/lib/translations/customer"

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
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy")
    } catch {
      return dateString
    }
  }
  const travelDates: ReactNode = arabic ? (
    <>
      <ArabicDate value={applicationData.travelStartDate} fallback={applicationData.travelStartDate} />
      {" – "}
      <ArabicDate value={applicationData.travelEndDate} fallback={applicationData.travelEndDate} />
    </>
  ) : (
    `${formatDate(applicationData.travelStartDate)} - ${formatDate(applicationData.travelEndDate)}`
  )
  const destination = arabic
    ? SCHENGEN_META[applicationData.destination]?.ar || applicationData.destination
    : applicationData.destination
  const nationality = arabic ? citizenshipNameAr(applicationData.nationality) : applicationData.nationality
  const packageName =
    arabic && /^standard$/i.test(applicationData.packageType)
      ? customerText("ar", "thanks.packageStandard")
      : applicationData.packageType

  const summaryItems: { icon: typeof User; label: string; value: ReactNode }[] = [
    {
      icon: User,
      label: customerText(locale, "thanks.applicant"),
      value: arabic ? (
        <bdi dir="ltr">{`${applicationData.firstName} ${applicationData.lastName}`}</bdi>
      ) : (
        `${applicationData.firstName} ${applicationData.lastName}`
      ),
    },
    {
      icon: Globe,
      label: customerText(locale, "thanks.nationality"),
      value: nationality,
    },
    {
      icon: MapPin,
      label: customerText(locale, "thanks.destination"),
      value: destination,
    },
    {
      icon: Calendar,
      label: customerText(locale, "thanks.dates"),
      value: travelDates,
    },
    {
      icon: DollarSign,
      label: customerText(locale, "thanks.package"),
      value: arabic && packageName !== applicationData.packageType ? packageName : arabic ? <bdi dir="ltr">{packageName}</bdi> : packageName,
    },
    {
      icon: CreditCard,
      label: customerText(locale, "thanks.amount"),
      value: arabic ? (
        <DirhamAmount amount={applicationData.paymentAmount} />
      ) : (
        `${applicationData.currencySymbol} ${applicationData.paymentAmount.toFixed(2)}`
      ),
    },
  ]

  if (applicationData.transactionId) {
    summaryItems.push({
      icon: CreditCard,
      label: customerText(locale, "thanks.transaction"),
      value: arabic ? <bdi dir="ltr">{applicationData.transactionId}</bdi> : applicationData.transactionId,
    })
  }

  return (
    <Card className="sticky top-24 shadow-lg border-primary/20">
      <CardHeader className="border-b bg-[#F7F8FA]">
        <CardTitle className="text-lg font-semibold">{customerText(locale, "thanks.summary")}</CardTitle>
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
            <span className="text-sm font-medium text-muted-foreground">{customerText(locale, "thanks.status")}</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {customerText(locale, "thanks.confirmed")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
