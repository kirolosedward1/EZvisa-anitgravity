"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSiteLocale } from "@/components/locale-provider"
import { todayDate } from "@/lib/auth/account-details"

export function AccountDetailsFields({ name, birthdate, onName, onBirthdate }: {
  name: string; birthdate: string; onName: (value: string) => void; onBirthdate: (value: string) => void
}) {
  const arabic = useSiteLocale() === "ar"
  const [today, setToday] = useState("")
  useEffect(() => setToday(todayDate()), [])
  return <>
    <div className="space-y-2">
      <Label htmlFor="account-full-name">{arabic ? "الاسم الكامل" : "Full name"}</Label>
      <Input id="account-full-name" autoComplete="name" value={name} onChange={event => onName(event.target.value)} maxLength={120} required />
    </div>
    <div className="space-y-2">
      <Label htmlFor="account-birthdate">{arabic ? "تاريخ الميلاد" : "Date of birth"}</Label>
      <Input id="account-birthdate" type="date" autoComplete="bday" dir="ltr" min="1900-01-01" max={today || undefined} value={birthdate} onChange={event => onBirthdate(event.target.value)} required />
    </div>
  </>
}
