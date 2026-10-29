"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSiteLocale } from "@/components/locale-provider"

export function AgeConfirmation({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const arabic = useSiteLocale() === "ar"
  return <div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4">
    <Checkbox id="account-age-confirmation" checked={checked} onCheckedChange={value => onChange(value === true)} required disabled={disabled} className="mt-0.5 size-5" />
    <Label htmlFor="account-age-confirmation" className="cursor-pointer text-sm font-normal leading-relaxed">
      {arabic ? "أؤكد أن عمري 18 عامًا أو أكثر وأن تاريخ ميلادي صحيح." : "I confirm that I am 18 or older and my date of birth is correct."}
    </Label>
  </div>
}
