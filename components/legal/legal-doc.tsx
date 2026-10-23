import { headers } from "next/headers"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { LegalMarkdown } from "@/components/legal/markdown"
import { LEGAL_MD } from "@/lib/legal/content.generated"

/**
 * Bilingual legal page. Both languages are in the HTML; /ar shows the Arabic (RTL) version via the rtl: variant.
 * Text lives in content/legal/<doc>.en.md and <doc>.ar.md (Legal Auditor drafts).
 */
export async function LegalDoc({ doc, titleEn, titleAr }: { doc: string; titleEn: string; titleAr: string }) {
  // Render only the visitor's language (the middleware marks /ar requests), so /ar never shows English text.
  const ar = (await headers()).get("x-ez-locale") === "ar"
  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        {/* LEGAL DRAFT – pending Legal Auditor */}
        <article className="container mx-auto max-w-3xl px-6 pb-16 pt-32">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0436DC]">{ar ? "قانوني" : "Legal"}</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0A0F1F]">{ar ? titleAr : titleEn}</h1>
          <div lang={ar ? "ar" : "en"}><LegalMarkdown source={LEGAL_MD[`${doc}.${ar ? "ar" : "en"}`]} /></div>
        </article>
      </div>
      <Footer />
    </>
  )
}
