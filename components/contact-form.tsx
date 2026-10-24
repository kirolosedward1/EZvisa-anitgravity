"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function ContactForm() {
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
        throw new Error(data.message || "Failed to send message. Please try again.");
      }

      setIsSuccess(true)
    } catch (error: any) {
      setIsError(true)
      setErrorMessage(error.message || "An unexpected network error occurred. Please try again later.")
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
            <h2 className="panel-title panel-title-lg mb-1.5 text-foreground">Send us a message</h2>
            <p className="mb-8 text-sm text-muted-foreground">
              We reply by email. For anything about an application you&apos;ve started, include your EZ- reference.
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
                    Full name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
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
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="john@example.com"
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
                  Subject
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Question about visa application"
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
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us how we can help you..."
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send message
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
            <h3 className="panel-title panel-title-lg mb-2 text-foreground">Message sent</h3>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
              Thanks, <span className="font-medium text-foreground">{name}</span>. A visa specialist will reply to <span className="font-medium text-foreground">{email}</span>. If it&apos;s urgent, message us on WhatsApp.
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
              Send another message
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
