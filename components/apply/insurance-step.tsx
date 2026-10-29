"use client"

import { ShieldCheck, FileCheck2 } from "lucide-react"
import { LangText } from "@/components/lang-text"
import { WizardBar } from "@/components/apply/wizard-bar"
import { WizardQuestion } from "@/components/apply/wizard-choices"
import { insurancePreference, type InsurancePreference } from "@/lib/insurance"
import type { FormData } from "@/lib/form-types"

export function InsuranceStep({ formData, updateFormData, onNext, onBack }: {
  formData: FormData
  updateFormData: (data: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const choices: { value: InsurancePreference; title: string; ar: string; description: string; descriptionAr: string; icon: typeof ShieldCheck }[] = [
    { value: "quote", title: "Buy insurance through EZvisa", ar: "شراء التأمين عبر EZvisa", description: "Request a separate quote. You can review the price and cover before deciding.", descriptionAr: "اطلب عرض سعر منفصلًا. يمكنك مراجعة السعر والتغطية قبل اتخاذ القرار.", icon: ShieldCheck },
    { value: "own", title: "I’ll provide my own", ar: "سأوفّر التأمين بنفسي", description: "Arrange your own policy and keep it ready with your appointment documents.", descriptionAr: "رتّب وثيقتك بنفسك وجهّزها مع مستندات موعدك.", icon: FileCheck2 },
  ]
  return <div>
    <WizardQuestion title="Insurance" titleAr="التأمين" helper="How would you like to arrange your insurance?" helperAr="كيف تفضّل ترتيب التأمين؟" />
    <fieldset className="space-y-3">
      <legend className="sr-only"><LangText en="Insurance preference" ar="اختيار التأمين" /></legend>
      {choices.map(({ value, title, ar, description, descriptionAr, icon: Icon }) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${formData.insurancePreference === value ? "border-primary bg-[#edf4ff]" : "border-border bg-white"}`}>
        <input type="radio" name="insurance" value={value} checked={formData.insurancePreference === value} onChange={() => updateFormData({ insurancePreference: value })} className="mt-1 size-4 shrink-0 accent-primary" />
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium"><LangText en={title} ar={ar} /></span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground"><LangText en={description} ar={descriptionAr} /></span></span>
        <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
      </label>)}
    </fieldset>
    <p className="mt-5 text-sm leading-relaxed text-muted-foreground"><LangText en="Insurance is separate from your visa service fee. Requesting a quote does not purchase a policy, and no insurance charge is added to this payment." ar="التأمين منفصل عن رسوم خدمة التأشيرة. طلب عرض السعر لا يعني شراء وثيقة، ولن تُضاف رسوم تأمين إلى هذه الدفعة." /></p>
    <WizardBar onBack={onBack} onContinue={onNext} disabled={!insurancePreference(formData.insurancePreference)} continueLabel="Continue" continueLabelAr="متابعة" />
  </div>
}
