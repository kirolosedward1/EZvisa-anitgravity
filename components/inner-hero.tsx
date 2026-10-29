"use client"

import type { ReactNode } from "react"
import { Image } from "@/components/image"
import { usePathname } from "next/navigation"
import { destinations } from "@/lib/destinations"
import { SCHENGEN_META } from "@/lib/countries"
import { LangText } from "@/components/lang-text"
import { Globi, type GlobiPose } from "@/components/globi/globi"
import { LocaleLink } from "@/components/locale-link"
import { ArrowLeft } from "lucide-react"

interface InnerHeroProps {
  badge?: ReactNode
  title: ReactNode
  description?: ReactNode
  backgroundImage?: string
  randomizeBackground?: boolean
  gradientType?: "default" | "ocean" | "sunset" | "aurora"
  variant?: "photo" | "plain"
  globiPose?: GlobiPose
  children?: ReactNode
  className?: string
}

const pagePoses: Record<string, GlobiPose> = {
  "/about": "welcome", "/contact": "companion", "/pricing": "shield",
  "/how-it-works": "checklist", "/destinations": "destination",
  "/documents": "documents", "/tools": "calendar", "/videos": "documents", "/help": "companion",
}

/** Country photography stays specific; informational pages have a purposeful Globi pose. */
export function InnerHero({ title, description, backgroundImage, variant, globiPose, children, className = "" }: InnerHeroProps) {
  const pathname = usePathname()?.replace(/^\/ar(?=\/|$)/, "") || "/"
  const country = destinations.find(destination => destination.image === backgroundImage)?.name
  const pose = variant === "plain" ? undefined : globiPose ?? pagePoses[pathname]
  const photo = variant === "plain" ? undefined : backgroundImage
  const parent = pathname.startsWith("/documents/") ? "/documents" : pathname.startsWith("/destinations/") ? "/destinations" : pathname.startsWith("/tools/") ? "/tools" : pathname.startsWith("/help/") ? "/help" : "/"
  const parentLabel = parent === "/documents" ? ["All document guides", "كل أدلة المستندات"] : parent === "/destinations" ? ["All destinations", "كل الوجهات"] : parent === "/tools" ? ["All travel tools", "كل أدوات السفر"] : parent === "/help" ? ["Help center", "مركز المساعدة"] : ["Home", "الرئيسية"]
  return (
    <section className={`ez-inner-hero ${className}`}>
      <div className={`ez-inner-panel${photo ? " ez-inner-with-photo" : pose ? " ez-inner-with-globi" : " ez-inner-plain"}`}>
        <div className="ez-inner-copy">
          <LocaleLink href={parent} className="ez-inner-back"><ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" /><LangText en={parentLabel[0]} ar={parentLabel[1]} /></LocaleLink>
          <h1 data-site-reveal="rise">{title}</h1>
          {description && <p data-site-reveal="rise" data-site-delay="80" className="ez-inner-description">{description}</p>}
          {children && <div className="ez-inner-actions">{children}</div>}
        </div>
        {photo ? <div data-site-reveal="media" className="ez-inner-photo"><Image src={photo} alt="" fill priority sizes="(max-width: 767px) 100vw, 520px" className="object-cover" />{country && <span><LangText en={country} ar={SCHENGEN_META[country]?.ar ?? country} /></span>}</div> : pose ? <div data-site-reveal="fade" data-site-delay="100" className="ez-inner-globi"><Globi pose={pose} /></div> : null}
      </div>
    </section>
  )
}
