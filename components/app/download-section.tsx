import { formatAedLabel } from "@/lib/currency"
import { requestLocale } from "@/lib/request-locale"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

import { StoreBadges } from "./store-badges"

export async function DownloadSection() {
  const arabic = (await requestLocale()) === "ar"
  const price = formatAedLabel(PRICE_AED, arabic ? "ar" : "en")

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-border bg-card p-8 shadow-sm md:flex-row md:items-center md:justify-between md:p-12">
      <div className="flex max-w-lg flex-col gap-3 text-start">
        <h2 id="app-download-heading" className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          {arabic ? "حمّل تطبيق إيزي فيزا" : "Get the EZvisa app"}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          {arabic ? (
            <>
              التنزيل مجاني. <bdi dir="ltr">{price}</bdi> عن كل طلب، تُدفع في التطبيق عندما تكون جاهزًا. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية.
            </>
          ) : (
            <>Free to download. {price} per application, paid in the app when you are ready. EZvisa is not VAT-registered; prices shown are final.</>
          )}
        </p>
      </div>
      <StoreBadges size="lg" className="shrink-0" />
    </div>
  )
}
