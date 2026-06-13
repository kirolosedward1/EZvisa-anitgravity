import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"

export const metadata: Metadata = {
  title: "Refund Policy - EZvisa Terms and Conditions",
  description:
    "Understanding EZvisa's refund policy for visa application services. Clear terms and conditions for service fees.",
}

export default function RefundPolicyPage() {
  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-gray-50">
        <InnerHero
          badge="Legal"
          title="Refund Policy"
          description="Last updated: January 2026"
          gradientType="default"
        />

        {/* Content */}
        <section className="container mx-auto px-4 py-12 lg:py-16 max-w-3xl">
          <div className="bg-white rounded-lg border p-8 prose prose-gray max-w-none">
            <h2>Service Fee Refund Policy</h2>
            <p>
              At EZvisa, we're committed to providing excellent service. Our refund policy for the service fee (249 AED
              / 70 USD) is as follows:
            </p>

            <h3>Eligible for Full Refund:</h3>
            <ul>
              <li>
                <strong>Before Document Review:</strong> If you request a refund before our team has begun reviewing
                your documents and preparing your application.
              </li>
              <li>
                <strong>Service Error:</strong> If we cannot process your application due to an error on our part or
                inability to provide the promised service.
              </li>
              <li>
                <strong>Duplicate Payment:</strong> If you accidentally made a duplicate payment for the same
                application.
              </li>
            </ul>

            <h3>Not Eligible for Refund:</h3>
            <ul>
              <li>
                <strong>After Submission:</strong> Once your application has been submitted to the embassy or consulate.
              </li>
              <li>
                <strong>Visa Rejection:</strong> If your visa is rejected by the embassy due to incomplete documents,
                ineligibility, or other factors beyond our control.
              </li>
              <li>
                <strong>Change of Mind:</strong> After document review has been completed and personalized guidance has
                been provided.
              </li>
              <li>
                <strong>Embassy Fees:</strong> Embassy or consulate visa fees are non-refundable as they are paid
                directly to the government authorities.
              </li>
            </ul>

            <h3>Refund Process:</h3>
            <ol>
              <li>
                <strong>Request:</strong> Submit a refund request via email to{" "}
                <a href="mailto:info@ezvisa.net">info@ezvisa.net</a> with your application reference number.
              </li>
              <li>
                <strong>Review:</strong> Our team will review your request within 3-5 business days.
              </li>
              <li>
                <strong>Approval:</strong> If approved, refunds will be processed within 7-10 business days to your
                original payment method.
              </li>
            </ol>

            <h3>Partial Refunds:</h3>
            <p>
              In certain cases, we may offer a partial refund if significant work has been completed but the service
              cannot be fully delivered. Each case is evaluated individually.
            </p>

            <h3>Important Notes:</h3>
            <ul>
              <li>Embassy visa application fees are separate from our service fee and are non-refundable.</li>
              <li>Processing times and visa approval decisions are made by embassy authorities, not by EZvisa.</li>
              <li>We recommend reviewing all requirements carefully before making a payment.</li>
            </ul>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 not-prose mt-8">
              <h4 className="font-bold mb-2">Have Questions?</h4>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about our refund policy, please don't hesitate to contact us.
              </p>
              <Link href="/contact">
                <Button variant="outline">Contact Support</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
