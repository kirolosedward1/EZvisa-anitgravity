import { LangText } from "@/components/lang-text"
import { LegalMarkdown } from "@/components/legal/markdown"
import { LEGAL_MD } from "@/lib/legal/content.generated"
import { COMPANY, COMPANY_DETAILS_READY } from "@/lib/legal/company"

/** Legal notice / company details (legal audit H2), used on About and Contact. Values come from lib/legal/company.ts. */
export function CompanyLegalNotice({ className = "" }: { className?: string }) {
  if (!COMPANY_DETAILS_READY) return null
  return (
    <section className={`container mx-auto max-w-3xl px-6 py-12 ${className}`} aria-labelledby="legal-notice-heading">
      {/* LEGAL DRAFT – pending Legal Auditor */}
      <h2 id="legal-notice-heading" className="text-2xl font-semibold text-[#0A0F1F]">
        <LangText en="Company details" ar="بيانات الشركة" />
      </h2>
      <div className="rtl:hidden" lang="en"><LegalMarkdown source={LEGAL_MD["legal-notice.en"]} /></div>
      <div className="hidden rtl:block" lang="ar"><LegalMarkdown source={LEGAL_MD["legal-notice.ar"]} /></div>
    </section>
  )
}

/** Short company block for the footer. */
export function CompanyFooterBlock() {
  if (!COMPANY_DETAILS_READY) return null
  const c = COMPANY
  return (
    <div className="space-y-1.5">
      {/* LEGAL DRAFT – pending Legal Auditor */}
      <LangText
        en={<>
          <span className="block"><span className="font-medium text-[#0A0F1F]/80">EZvisa</span> is a trade name of {c.COMPANY_LEGAL_NAME}, a private company registered in the United Arab Emirates. Trade Licence No. {c.TRADE_LICENCE_NO}, issued by {c.ISSUING_AUTHORITY}. Registered address: {c.REGISTERED_ADDRESS}</span>
          <span className="block">Email: {c.EMAIL} · WhatsApp/Phone: <a href={c.WHATSAPP_URL} dir="ltr" className="underline">{c.PHONE_DISPLAY}</a> · Support hours: {c.SUPPORT_HOURS_EN}</span>
        </>}
        ar={<>
          <span className="block"><span className="font-medium text-[#0A0F1F]/80">إيزي فيزا</span> اسم تجاري لـ {c.COMPANY_LEGAL_NAME}، شركة خاصة مسجّلة في دولة الإمارات العربية المتحدة. رخصة تجارية رقم {c.TRADE_LICENCE_NO}، صادرة عن {c.ISSUING_AUTHORITY}. العنوان المسجّل: {c.REGISTERED_ADDRESS}</span>
          <span className="block">البريد الإلكتروني: {c.EMAIL} · واتساب/هاتف: <a href={c.WHATSAPP_URL} dir="ltr" className="underline">{c.PHONE_DISPLAY}</a> · ساعات الدعم: {c.SUPPORT_HOURS_AR}</span>
        </>}
      />
    </div>
  )
}
