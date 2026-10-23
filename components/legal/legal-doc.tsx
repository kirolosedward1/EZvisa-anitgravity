import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { LangText } from "@/components/lang-text"
import { LegalMarkdown } from "@/components/legal/markdown"
import { LEGAL_MD } from "@/lib/legal/content.generated"

/**
 * Bilingual legal page. Both languages are in the HTML; /ar shows the Arabic (RTL) version via the rtl: variant.
 * Text lives in content/legal/<doc>.en.md and <doc>.ar.md (Legal Auditor drafts).
 */
export function LegalDoc({ doc, titleEn, titleAr }: { doc: string; titleEn: string; titleAr: string }) {
  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        {/* LEGAL DRAFT – pending Legal Auditor */}
        <article className="container mx-auto max-w-3xl px-6 pb-16 pt-32">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0436DC]"><LangText en="Legal" ar="قانوني" /></p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0A0F1F]"><LangText en={titleEn} ar={titleAr} /></h1>
          <div className="rtl:hidden" lang="en"><LegalMarkdown source={LEGAL_MD[`${doc}.en`]} /></div>
          <div className="hidden rtl:block" lang="ar"><LegalMarkdown source={LEGAL_MD[`${doc}.ar`]} /></div>
        </article>
      </div>
      <Footer />
    </>
  )
}
