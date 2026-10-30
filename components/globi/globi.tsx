"use client"

import { useEffect, useRef, useState } from "react"
import { useSiteLocale } from "@/components/locale-provider"

export type GlobiPose =
  | "welcome" | "destination" | "passport" | "checklist" | "calendar" | "shield" | "waiting" | "celebrate" | "companion" | "documents" | "travel"
  | "thinking" | "phone" | "notes" | "budget" | "secure" | "pointing" | "hotel" | "stamp" | "calm" | "review"

/** Supplied Globi clips. Each pose autoplays muted and loops while visible. */
export function Globi({ pose, className = "" }: { pose: GlobiPose; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(pose === "welcome")
  const [loaded, setLoaded] = useState(pose === "welcome")
  useEffect(() => {
    if (!root.current) return
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      if (entry.isIntersecting) setLoaded(true)
    }, { rootMargin: "100px" })
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!video.current) return
    if (visible) video.current.play().catch(() => {})
    else video.current.pause()
  }, [visible, pose])
  return <div ref={root} className={`globi-art ${className}`}>
    <video ref={video} key={pose} src={loaded ? `/globi/${pose}.webm` : undefined} muted autoPlay loop playsInline preload={pose === "welcome" ? "auto" : "none"} aria-hidden="true" />
  </div>
}

export type GlobiMoment = "insurance" | "destination" | "traveller" | "review" | "trip" | "passport" | "spouse" | "employment"
const guidance: Record<GlobiMoment, {pose: GlobiPose; title: string; ar: string; tip: string; tipAr: string}> = {
  destination: {pose:"destination",title:"A little closer to Europe.",ar:"خطوة أقرب إلى أوروبا.",tip:"Visiting more than one country? Choose the one where you’ll spend the most nights.",tipAr:"تزور أكثر من دولة؟ اختر الدولة التي ستقضي فيها أكبر عدد من الليالي."},
  traveller: {pose:"passport",title:"Let’s get the details right.",ar:"لنتأكد من بياناتك.",tip:"Enter your name exactly as it appears on your passport. You can review everything before paying.",tipAr:"اكتب اسمك كما يظهر في جواز سفرك تمامًا. يمكنك مراجعة كل البيانات قبل الدفع."},
  insurance: {pose:"shield",title:"Choose what works for your trip.",ar:"اختر ما يناسب رحلتك.",tip:"Ask us for a separate insurance quote, or provide your own policy. Your service fee stays the same.",tipAr:"اطلب عرض سعر منفصلًا للتأمين أو وفّر وثيقتك بنفسك. رسوم الخدمة تبقى كما هي."},
  review: {pose:"shield",title:"Everything clear before you pay.",ar:"كل التفاصيل واضحة قبل الدفع.",tip:"Your service fee covers preparing your visa file. Embassy fees and travel insurance are separate.",tipAr:"تغطي رسوم الخدمة تجهيز ملف التأشيرة. رسوم السفارة وتأمين السفر منفصلان."},
  trip: {pose:"calendar",title:"Let’s put your trip together.",ar:"لنرتّب تفاصيل رحلتك.",tip:"Add your travel plans. We’ll use them to prepare a consistent itinerary and reservations.",tipAr:"أضف خطط سفرك لنجهّز برنامج رحلة وحجوزات متناسقة."},
  passport: {pose:"passport",title:"Keep your passport handy.",ar:"احتفظ بجواز سفرك بجانبك.",tip:"Copy the details carefully from your passport so your application matches your travel document.",tipAr:"انقل بيانات جواز سفرك بعناية لتطابق مستندات طلبك."},
  spouse: {pose:"companion",title:"Travelling together?",ar:"تسافران معًا؟",tip:"Add your spouse’s details as they appear on their passport.",tipAr:"أضف بيانات زوجك أو زوجتك كما تظهر في جواز السفر."},
  employment: {pose:"documents",title:"A few details about your work.",ar:"بعض التفاصيل عن عملك.",tip:"Choose the option that fits your current situation. The questions will adjust to your answer.",tipAr:"اختر ما يناسب وضعك الحالي. تتغيّر الأسئلة بحسب إجابتك."},
}

export function GlobiGuide({ moment, compact = false }: {moment: GlobiMoment; compact?: boolean}) {
  const arabic = useSiteLocale() === "ar"
  const copy = guidance[moment]
  return <div className={`globi-guide${compact ? " globi-guide-compact" : ""}`}>
    <Globi key={copy.pose} pose={copy.pose} />
    <div><p className="globi-guide-title">{arabic ? copy.ar : copy.title}</p><p className="globi-guide-tip">{arabic ? copy.tipAr : copy.tip}</p></div>
  </div>
}
