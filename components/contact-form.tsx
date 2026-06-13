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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    setIsSubmitting(false)
    setIsSuccess(true)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Low-opacity dot grid pattern decoration */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(circle at 50% 50%, black 75%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 75%, transparent 100%)",
        }}
      />

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="contact-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <h2 className="text-2xl font-bold mb-2 text-primary">Send us a message</h2>
            <p className="text-sm text-muted-foreground mb-8 font-medium">
              Fill out the form below and one of our visa coordinators will get in touch with you shortly.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    disabled={isSubmitting}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 rounded-xl border border-border/80 bg-background/50 px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none shadow-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-xl border border-border/80 bg-background/50 px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="subject"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
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
                  className="h-14 rounded-xl border border-border/80 bg-background/50 px-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="message"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2 block"
                >
                  Your Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us how we can help you..."
                  required
                  disabled={isSubmitting}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl border border-border/80 bg-background/50 p-4 text-base font-medium text-foreground transition-all duration-300 placeholder:text-muted-foreground/60 hover:border-primary/50 hover:bg-background focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none shadow-xs"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 h-12 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 transition-all cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
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
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Message Sent!</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed font-medium">
              Thank you for reaching out, <span className="text-foreground font-semibold">{name}</span>. One of our visa coordinators will review your query and get back to you at <span className="text-foreground font-semibold">{email}</span> within 2 hours.
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
              className="rounded-xl border-border hover:bg-muted font-bold text-sm h-12 px-6"
            >
              Send another message
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
