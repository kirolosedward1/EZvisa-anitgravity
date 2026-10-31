"use client"

import { useMemo, useState } from "react"
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js"
import { Label } from "@/components/ui/label"

/** UAE mobile numbers only for now (owner, 31 Oct): a fixed +971 and a 9-digit mobile number starting with 5,
 *  grouped as typing goes ("50 123 4567"). The wizard's contact step follows the same rule. */
const UAE_MOBILE = /^5\d{8}$/

/** "0501234567", "+971 50 123 4567", "00971501234567" -> "501234567". */
function nationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "")
  if (raw.trim().startsWith("+") || digits.startsWith("00971") || /^9715\d{8}$/.test(digits)) digits = digits.replace(/^(00)?971/, "")
  return digits.replace(/^0+/, "").slice(0, 9)
}

const format = (digits: string) => (digits ? new AsYouType("AE").input(`+971${digits}`).replace(/^\+971\s?/, "") : "")

export function PhoneField({
  id = "phone",
  value,
  onChange,
}: {
  id?: string
  /** E.164 value, or empty. */
  value: string
  onChange: (e164: string, valid: boolean) => void
}) {
  const initial = useMemo(() => parsePhoneNumberFromString(value || ""), [value])
  const savedElsewhere = Boolean(initial && initial.countryCallingCode !== "971")
  const [national, setNational] = useState(() =>
    initial && !savedElsewhere ? format(nationalDigits(String(initial.nationalNumber))) : "",
  )

  const apply = (raw: string) => {
    const digits = nationalDigits(raw)
    setNational(format(digits))
    const valid = UAE_MOBILE.test(digits)
    onChange(digits ? `+971${digits}` : "", valid)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>UAE mobile number</Label>
      <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <span className="flex items-center border-r border-input px-3 text-sm text-muted-foreground" aria-hidden="true">
          +971
        </span>
        <input
          id={id}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="50 000 0000"
          aria-label="UAE mobile number, after +971"
          value={national}
          onChange={(event) => apply(event.target.value)}
          className="w-full bg-transparent px-3 text-base text-foreground outline-none"
        />
      </div>
      {savedElsewhere ? (
        <p className="text-xs text-muted-foreground">
          Your saved number ({initial?.formatInternational()}) is not a UAE mobile number. Enter a UAE mobile number to replace it.
        </p>
      ) : null}
    </div>
  )
}
