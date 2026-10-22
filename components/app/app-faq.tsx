"use client"

import Link from "next/link"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Faq } from "./content"

export function AppFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.question} value={`faq-${index}`} className="border-border/60">
          <AccordionTrigger className="py-5 text-start text-base font-medium hover:text-primary hover:no-underline md:text-lg [&>svg]:h-5 [&>svg]:w-5">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 pe-8 text-base leading-relaxed text-muted-foreground">
            {faq.answer}
            {faq.href && faq.linkLabel && (
              <>
                {" "}
                <Link href={faq.href} className="font-medium text-primary hover:underline">
                  {faq.linkLabel}
                </Link>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
