"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import type { InsurancePreference } from "@/lib/insurance"

export function InsuranceCard({ applicationId, initialValue, arabic }: {
  applicationId: string
  initialValue?: InsurancePreference
  arabic: boolean
}) {
  const router = useRouter()
  const [choice, setChoice] = useState(initialValue)
  const [saved, setSaved] = useState(initialValue)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [failed, setFailed] = useState(false)
  const text = (en: string, ar: string) => arabic ? ar : en

  async function save() {
    if (!choice || pending) return
    setPending(true)
    setFeedback("")
    setFailed(false)
    try {
      // The public sandbox must never write a real application or imply a submitted quote.
      if (applicationId.startsWith("demo-")) {
        setFeedback(text("Demo preview only — no preference or quote request was saved.", "معاينة تجريبية فقط — لم يُحفظ أي اختيار أو طلب عرض سعر."))
        return
      }
      const response = await fetch("/api/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: applicationId, preference: choice }),
      })
      if (!response.ok) throw new Error("save_failed")
      setSaved(choice)
      setFeedback(text("Your insurance preference is saved.", "تم حفظ اختيار التأمين."))
      router.refresh()
    } catch {
      setFailed(true)
      setFeedback(text("We couldn’t save your choice. Refresh and try again, or contact support.", "تعذّر حفظ اختيارك. حدّث الصفحة وحاول مجددًا أو تواصل مع الدعم."))
    } finally { setPending(false) }
  }

  return <section id="insurance" className="rounded-xl border border-border bg-white p-5 sm:p-6" aria-label={text("Travel insurance", "تأمين السفر")}>
    <div className="mb-5 flex items-start gap-3">
      <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
      <div><h3 className="text-xl font-medium">{text("Travel insurance", "تأمين السفر")}</h3><p className="mt-1 text-sm text-muted-foreground">{text("How would you like to arrange your travel insurance?", "كيف تفضّل ترتيب تأمين السفر؟")}</p></div>
    </div>
    <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">{text("Insurance preference", "اختيار التأمين")}</legend>
      {([
        { value: "quote", title: text("Buy travel insurance through EZvisa", "شراء تأمين السفر عبر EZvisa"), description: text("Request a separate quote. Review the price and cover before deciding.", "اطلب عرض سعر منفصلًا. راجع السعر والتغطية قبل اتخاذ القرار.") },
        { value: "own", title: text("I’ll provide my own", "سأوفّر التأمين بنفسي"), description: text("Arrange your policy and keep it ready with your appointment documents.", "رتّب وثيقتك وجهّزها مع مستندات موعدك.") },
      ] as const).map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${choice === option.value ? "border-primary bg-[#edf4ff]" : "border-border"}`}>
        <input type="radio" name={`insurance-${applicationId}`} value={option.value} checked={choice === option.value} onChange={() => { setChoice(option.value); setFeedback("") }} className="mt-1 size-4 shrink-0 accent-primary" />
        <span><span className="block text-sm font-medium">{option.title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{option.description}</span></span>
      </label>)}
    </fieldset>
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{text("Travel insurance is quoted separately from your visa service fee. Requesting a quote does not purchase a policy or confirm cover.", "يُقدَّم عرض سعر تأمين السفر منفصلًا عن رسوم خدمة التأشيرة. طلب عرض السعر لا يعني شراء وثيقة أو تأكيد التغطية.")}</p>
    <button type="button" onClick={save} disabled={!choice || pending || choice === saved} className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-default disabled:opacity-50">{pending ? text("Saving…", "جارٍ الحفظ…") : choice && choice === saved ? text("Saved", "تم الحفظ") : text("Save preference", "حفظ الاختيار")}</button>
    {feedback && <p role={failed ? "alert" : "status"} className={`mt-3 text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}>{feedback}</p>}
  </section>
}
