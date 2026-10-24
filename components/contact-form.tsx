"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useSiteLocale } from "@/components/locale-provider"

const ERROR_AR: Record<string, string> = {
  "Too many messages. Please wait a minute and try again.": "رسائل كثيرة. انتظر دقيقة ثم أعد المحاولة.",
  "Please fill in your name, a valid email and a message.": "أدخل اسمك وبريدًا صالحًا ورسالة.",
  "Email service not configured": "خدمة البريد غير مهيأة.",
  "We couldn't send your message. Please try again or reach us on WhatsApp.": "تعذّر إرسال رسالتك. أعد المحاولة أو راسلنا على واتساب.",
  "Failed to send message. Please try again.": "تعذّر إرسال الرسالة. أعد المحاولة.",
  "An unexpected network error occurred. Please try again later.": "حدث خطأ في الشبكة. أعد المحاولة لاحقًا.",
}

export function ContactForm() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => (arabic ? ar : en)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setIsError(false)

    try {
      // The server builds and escapes the email and always sends it to the EZvisa inbox.
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || t("Failed to send message. Please try again.", "تعذّر إرسال الرسالة. أعد المحاولة."));
      }

      setIsSuccess(true)
    } catch (error: any) {
      setIsError(true)
      const raw = error.message || "An unexpected network error occurred. Please try again later."
      setErrorMessage(arabic ? ERROR_AR[raw] || raw : raw)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="contact-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <h2 className="panel-title panel-title-lg mb-1.5 text-foreground">{t("Send us a message", "أرسل لنا رسالة")}</h2>
            <p className="mb-8 text-sm text-muted-foreground">
              {t("We'll reply by email. If your message is about an existing application, please include your EZ- reference.", "سنرد عليك بالبريد الإلكتروني. إذا كانت رسالتك عن طلب قائم، يُرجى ذكر مرجع EZ-.")}
            </p>

            {isError && (
              <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("Full name", "الاسم الكامل")}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t("John Doe", "الاسم")}
                    required
                    disabled={isSubmitting}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary/80 focus:bg-background focus:ring-4 focus:ring-primary/20 focus:outline-none shadow-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("Email", "البريد الإلكتروني")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("john@example.com", "name@example.com")}
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary/80 focus:bg-background focus:ring-4 focus:ring-primary/20 focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="subject"
                  className="text-sm font-medium text-foreground"
                >
                  {t("Subject", "الموضوع")}
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder={t("Question about visa application", "سؤال عن طلب التأشيرة")}
                  required
                  disabled={isSubmitting}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12 rounded-xl border border-border bg-background px-4 text-base text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary/80 focus:bg-background focus:ring-4 focus:ring-primary/20 focus:outline-none shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="message"
                  className="text-sm font-medium text-foreground"
                >
                  {t("Message", "الرسالة")}
                </Label>
                <Textarea
                  id="message"
                  placeholder={t("Tell us how we can help you...", "أخبرنا كيف نساعدك...")}
                  required
                  disabled={isSubmitting}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl border border-border bg-background p-4 text-base text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary/80 focus:bg-background focus:ring-4 focus:ring-primary/20 focus:outline-none shadow-xs"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-8 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    {t("Sending...", "جارٍ الإرسال...")}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t("Send message", "أرسل الرسالة")}
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success-message"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <h3 className="panel-title panel-title-lg mb-2 text-foreground">{t("Message sent", "أُرسلت الرسالة")}</h3>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
              {arabic ? (
                <>
                  شكرًا، <span className="font-medium text-foreground">{name}</span>. سيرد مختص تأشيرات على <span className="font-medium text-foreground">{email}</span>. إذا كان الأمر عاجلًا، راسلنا على واتساب.
                </>
              ) : (
                <>
                  Thanks, <span className="font-medium text-foreground">{name}</span>. A visa specialist will reply to <span className="font-medium text-foreground">{email}</span>. If it&apos;s urgent, message us on WhatsApp.
                </>
              )}
            </p>
            <Button
              onClick={() => {
                setIsSuccess(false)
                setName("")
                setEmail("")
                setSubject("")
                setMessage("")
              }}
              variant="outline"
              className="h-12 rounded-full px-6 text-sm font-semibold"
            >
              {t("Send another message", "أرسل رسالة أخرى")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
