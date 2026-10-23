"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CitizenshipPicker } from "@/components/citizenship-picker"
import { PhoneField } from "@/components/phone-field"

export function AccountForm({
  email,
  phone,
  citizenship,
}: {
  email: string
  phone: string
  citizenship: string
}) {
  const [nextPhone, setNextPhone] = useState(phone)
  const [phoneValid, setPhoneValid] = useState(!phone)
  const [nextCitizenship, setNextCitizenship] = useState(citizenship)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (nextPhone && !phoneValid) {
      setError("Enter a valid phone number for the selected country.")
      return
    }
    setPending(true)
    const supabase = createBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({
      data: { phone: nextPhone, citizenship: nextCitizenship },
    })
    setPending(false)
    if (updateError) setError(updateError.message)
    else setMessage("Account details saved.")
  }

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (password.length < 6) {
      setError("Use at least 6 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setPending(true)
    const supabase = createBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (updateError) setError(updateError.message)
    else {
      setPassword("")
      setConfirm("")
      setMessage("Password updated.")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Account</h1>
        <p className="ltr-isolate text-sm text-muted-foreground">{email}</p>
      </div>

      <form onSubmit={saveProfile} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <PhoneField
          value={nextPhone}
          onChange={(e164, valid) => {
            setNextPhone(e164)
            setPhoneValid(valid || e164 === "")
          }}
        />
        <div className="flex flex-col gap-2">
          <Label>Citizenship</Label>
          <CitizenshipPicker value={nextCitizenship} onChange={setNextCitizenship} />
        </div>
        <Button type="submit" className="rounded-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save details
        </Button>
      </form>

      <form onSubmit={savePassword} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Password</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" variant="outline" className="rounded-full" disabled={pending}>
          Update password
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}
    </div>
  )
}
