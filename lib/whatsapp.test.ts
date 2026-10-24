import assert from "node:assert/strict"
import { test } from "node:test"
import { WHATSAPP_INQUIRY_AR, getWhatsAppUrl, whatsAppUrl } from "./contact.ts"

const EN = "Hi EZvisa! I have a question about my visa application."
const AR_HREF = `https://wa.me/971547109533?text=${encodeURIComponent(WHATSAPP_INQUIRY_AR)}`

test("the Arabic inquiry is the sentence the site pre-fills", () => {
  assert.equal(WHATSAPP_INQUIRY_AR, "مرحباً، أرغب في الاستفسار عن تأشيرة شنغن.")
})

test("English WhatsApp links keep their current message", () => {
  assert.equal(getWhatsAppUrl(EN), `https://wa.me/971547109533?text=${encodeURIComponent(EN)}`)
  assert.equal(whatsAppUrl(), "https://wa.me/971547109533")
  assert.equal(whatsAppUrl(EN, false), `https://wa.me/971547109533?text=${encodeURIComponent(EN)}`)
})

test("Arabic pages pre-fill the same encoded inquiry on every support link", () => {
  assert.equal(getWhatsAppUrl(EN, true), AR_HREF)
  assert.equal(getWhatsAppUrl("Hi EZvisa! I just completed my payment for France (Ref: EZ-ABCDEF01).", true), AR_HREF)
  assert.equal(whatsAppUrl(undefined, true), AR_HREF)
  assert.equal(whatsAppUrl(EN, true), AR_HREF)
  const text = new URL(AR_HREF).searchParams.get("text")
  assert.equal(text, WHATSAPP_INQUIRY_AR)
})
