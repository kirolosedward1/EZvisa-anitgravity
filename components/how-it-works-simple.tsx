"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useReducedMotion } from "framer-motion"
import { ArrowRight, Check, ChevronDown, LockKeyhole, Plane } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import Image from "next/image"
import { PaymentMarks } from "@/components/payment-marks"
import { LocaleLink } from "@/components/locale-link"
import { LangText } from "@/components/lang-text"
import { useSiteLocale } from "@/components/locale-provider"
import { formatAedLabel, type DisplayLocale } from "@/lib/currency"
import { ltr } from "@/lib/bidi"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

function stepsFor(locale: DisplayLocale): { number: string; title: string; description: ReactNode }[] {
  const price = formatAedLabel(PRICE_AED, locale)
  if (locale === "ar") {
    return [
      {
        number: "1",
        title: "أخبرنا بخططك",
        description: "اختر جنسيتك ووجهتك، ثم أضف بياناتك كمسافر. يستغرق ذلك نحو خمس دقائق.",
      },
      {
        number: "2",
        title: `ادفع ${price}`,
        description: `ادفع بالبطاقة أو ${ltr("Apple Pay")} أو ${ltr("Google Pay")}. تواريخ الرحلة وبيانات الجواز والعمل تأتي بعد الدفع، عندما تكون جاهزًا.`,
      },
      {
        number: "3",
        title: "نجهّز ملفك",
        description: (
          <>
            يملأ مختص التأشيرات نموذج الطلب ويعدّ خطاب التغطية وبرنامج الرحلة يومًا بيوم وحجوزات الطيران والفندق خلال <bdi dir="ltr">1–2</bdi> يوم من استلام بياناتك ومستنداتك كاملة.
          </>
        ),
      },
      {
        number: "4",
        title: "خذه إلى موعدك",
        description: `اطبع الملف وأحضره إلى موعد ${ltr("VFS")} أو القنصلية مع مستنداتك الأصلية. القرار للسفارة.`,
      },
    ]
  }
  return [
    {
      number: "1",
      title: "Tell us your plans",
      description: "Choose your nationality and destination, then add your details as the traveller. It takes about five minutes.",
    },
    {
      number: "2",
      title: `Pay ${price}`,
      description: "Pay by card, Apple Pay or Google Pay. Trip dates, passport and job details come after payment, when you're ready.",
    },
    {
      number: "3",
      title: "We prepare your file",
      description: "A visa specialist fills in your application form and prepares your cover letter, day-by-day itinerary, and flight and hotel reservations within 1–2 days of receiving your complete details and documents.",
    },
    {
      number: "4",
      title: "Take it to your appointment",
      description: "Print your file and bring it to your VFS or consulate appointment with your original documents. The embassy makes the decision.",
    },
  ]
}

export function HowItWorksSimple({ standalone = false }: { standalone?: boolean } = {}) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const [active, setActive] = useState(0)
  const reducedMotion = useReducedMotion()
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])

  const previewRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const scrollSelection = useRef<{ top: number; until: number } | null>(null)

  const previewCentre = () => {
    const top = stageRef.current ? parseFloat(getComputedStyle(stageRef.current).top) : 96
    return top + (previewRef.current?.clientHeight ?? 480) / 2
  }

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)")
    let frame = 0
    const sync = () => {
      frame = 0
      if (!desktop.matches) return
      // Keep a clicked step selected until its smooth scroll arrives. Otherwise
      // intermediate scroll events would briefly undo the visitor's selection.
      const selection = scrollSelection.current
      if (selection) {
        if (Math.abs(window.scrollY - selection.top) < 2) scrollSelection.current = null
        else if (performance.now() < selection.until) return
        else scrollSelection.current = null
      }
      const target = previewCentre()
      const distances = stepRefs.current.map(step => {
        if (!step) return Infinity
        const rect = step.getBoundingClientRect()
        return Math.abs(rect.top + rect.height / 2 - target)
      })
      const nearest = distances.indexOf(Math.min(...distances))
      // A small dead zone prevents trackpad bounce at a step boundary from
      // repeatedly swapping the same two illustrations.
      setActive(current => distances[nearest] + 28 < distances[current] ? nearest : current)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync) }
    const interrupt = () => { scrollSelection.current = null; schedule() }
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) interrupt()
    }
    schedule()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", interrupt)
    window.addEventListener("wheel", interrupt, { passive: true })
    window.addEventListener("touchstart", interrupt, { passive: true })
    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", interrupt)
      window.removeEventListener("wheel", interrupt)
      window.removeEventListener("touchstart", interrupt)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  const selectStep = (index: number) => {
    setActive(index)
    if (window.matchMedia("(min-width: 768px)").matches) {
      const rect = stepRefs.current[index]?.getBoundingClientRect()
      if (rect) {
        const top = Math.max(0, Math.min(
          document.documentElement.scrollHeight - window.innerHeight,
          window.scrollY + rect.top + rect.height / 2 - previewCentre(),
        ))
        scrollSelection.current = { top, until: performance.now() + 1800 }
        window.scrollTo({ top, behavior: reducedMotion ? "instant" : "smooth" })
      }
    }
  }
  const steps = stepsFor(locale)
  const t = (en: string, ar: string) => arabic ? ar : en
  const price = formatAedLabel(PRICE_AED, locale)

  return (
    <section id="how-it-works" className={`ez-walkthrough${standalone ? " ez-walkthrough-standalone" : ""}`} aria-labelledby="walkthrough-title">
      <div data-site-reveal="rise" className="ez-walkthrough-heading">
        <h2 id="walkthrough-title">{t("Four steps to your", "أربع خطوات إلى")}<br /><em>{t("visa appointment.", "موعد تأشيرتك.")}</em></h2>
        <LocaleLink className="ez-destination-link" href="/how-it-works">{t("See the full process", "اطّلع على الخطوات كاملة")}<ArrowRight size={18} className="rtl:rotate-180" /></LocaleLink>
      </div>
      <div className="ez-walkthrough-layout">
        <div className="ez-walkthrough-stage" ref={stageRef}>
          <div className="ez-walkthrough-mobile-choices" aria-label={t("Preview each step", "عاين كل خطوة")}>{[["Plans", "الخطط"], ["Payment", "الدفع"], ["Your file", "ملفك"], ["Appointment", "الموعد"]].map(([en, ar], index) => <button key={en} type="button" aria-pressed={active === index} aria-controls="walkthrough-preview" onClick={() => selectStep(index)}><span>{index + 1}</span>{t(en, ar)}</button>)}</div>
          <div ref={previewRef} id="walkthrough-preview" className="ez-walkthrough-preview" role="img" aria-label={t(`Step ${active + 1}: ${steps[active].title}. Illustrative application preview.`, `الخطوة ${active + 1}: ${steps[active].title}. معاينة توضيحية للطلب.`)} data-step={active}>
            <div className="ez-walkthrough-progress" aria-hidden="true">{steps.map((step, index) => <span key={step.number} data-complete={index <= active} />)}</div>
            {[0, 1, 2, 3].map(scene => (
              <div className="ez-walkthrough-scene" key={scene} aria-hidden="true" data-visible={active === scene}>
                {scene === 0 && <div className="ez-walkthrough-paper">
                  <h3>{t("Where are you going?", "إلى أين تسافر؟")}</h3>
                  <div className="ez-walkthrough-field"><span>{t("Passport nationality", "جنسية جواز السفر")}</span><div><CountryFlag iso="EG" /><strong>{t("Egypt", "مصر")}</strong><ChevronDown size={16} /></div></div>
                  <div className="ez-walkthrough-field"><span>{t("Destination country", "بلد الوجهة")}</span><div><CountryFlag iso="FR" /><strong>{t("France", "فرنسا")}</strong><ChevronDown size={16} /></div></div>
                  <div className="ez-walkthrough-demo-button">{t("Continue", "متابعة")}<ArrowRight size={17} className="rtl:rotate-180" /></div>
                </div>}
                {scene === 1 && <div className="ez-walkthrough-paper">
                  <div className="ez-walkthrough-trip"><CountryFlag iso="FR" /><div><strong>{t("France · Schengen visa", "فرنسا · تأشيرة شنغن")}</strong><small>{t("1 applicant", "متقدم واحد")}</small></div></div>
                  <dl className="ez-walkthrough-receipt">
                    <div><dt>{t("Service fee", "رسوم الخدمة")}</dt><dd>{price}</dd></div>
                    <div><dt>{t("Embassy fee", "رسوم السفارة")}</dt><dd>{t("At your appointment", "في موعدك")}</dd></div>
                    <div><dt>{t("Total", "الإجمالي")}</dt><dd>{price}</dd></div>
                  </dl>
                  <div className="ez-walkthrough-demo-button"><LockKeyhole size={16} />{t(`Pay ${price}`, `ادفع ${price}`)}</div>
                  <div className="ez-walkthrough-payment-logos"><PaymentMarks /></div>
                </div>}
                {scene === 2 && <div className="ez-walkthrough-file-scene">
                  <div className="ez-walkthrough-file-stack">
                    {[["itinerary", "Travel itinerary", "برنامج الرحلة"], ["application-form", "Application form", "نموذج الطلب"], ["cover-letter", "Cover letter", "خطاب التغطية"]].map(([file, en, ar]) => <div key={file} className={`ez-walkthrough-sheet ez-walkthrough-sheet-${file}`}><span>{t(en, ar)}</span><Image src={`/images/documents/${file}.png`} alt="" loading="eager" width={420} height={594} sizes="230px" /></div>)}
                  </div>
                  <div className="ez-walkthrough-checked"><Check size={17} />{t("Checked by a visa specialist", "راجعه مختص تأشيرات")}</div>
                </div>}
                {scene === 3 && <div className="ez-walkthrough-ready">
                  <Image src="/images/countries/france.jpg" alt="" loading="eager" fill sizes="(max-width: 767px) 100vw, 560px" />
                  <div className="ez-walkthrough-ready-message"><span className="ez-walkthrough-ready-check"><Check size={22} /></span><div><strong>{t("Your visa file is ready", "ملف تأشيرتك جاهز")}</strong><small>{t("France · Appointment-day guide included", "فرنسا · يتضمن دليل يوم الموعد")}</small></div><Plane size={21} /></div>
                </div>}
              </div>
            ))}
          </div>
          <p className="ez-walkthrough-caption">{t("An example journey, from your first answer to your prepared file.", "مثال لرحلتك، من أول إجابة حتى تجهيز ملفك.")}</p>
        </div>
        <div className="ez-walkthrough-steps">
          <ol>{steps.map((step, index) => <li key={step.number} ref={(node) => { stepRefs.current[index] = node }} data-active={active === index} data-complete={index < active}>
            <button type="button" aria-pressed={active === index} aria-controls="walkthrough-preview" onClick={() => selectStep(index)}>
              <span className="ez-walkthrough-number" aria-hidden="true">{step.number}</span>
              <span><span className="ez-walkthrough-step-title">{step.title}</span><span className="ez-walkthrough-step-copy">{step.description}</span></span>
            </button>
          </li>)}</ol>
          <LocaleLink href="/apply" className="ez-walkthrough-cta"><LangText en="Start your application" ar="ابدأ طلبك" /><ArrowRight size={19} className="rtl:rotate-180" /></LocaleLink>
          <p className="ez-walkthrough-note">{t("Document preparation, with a specialist by your side. Appointment booking and the visa decision remain separate.", "تجهيز مستنداتك بمساعدة مختص. حجز الموعد وقرار التأشيرة منفصلان عن خدمتنا.")}</p>
        </div>
      </div>
    </section>
  )
}
