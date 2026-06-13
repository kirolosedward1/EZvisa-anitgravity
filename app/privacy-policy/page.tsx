import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"

export const metadata = {
  title: "Privacy Policy - EZvisa",
  description: "Privacy Policy for EZvisa - Learn how we collect, use, and protect your personal information.",
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader forceBackground={true} />
      <InnerHero
        badge="Legal"
        title="Privacy Policy"
        description="Last updated: January 7, 2026"
        gradientType="default"
      />
      <div className="container mx-auto px-6 py-12 max-w-4xl">

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              EZvisa ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you visit our website and use our visa
              application assistance services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-foreground mb-2">Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you use our services, we may collect the following personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Full name and contact information (email, phone number, address)</li>
              <li>Passport details and nationality</li>
              <li>Date of birth and marital status</li>
              <li>Employment information and income details</li>
              <li>Travel plans and itinerary information</li>
              <li>Photographs and document uploads</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-2 mt-6">Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>IP address and browser type</li>
              <li>Device information and operating system</li>
              <li>Pages visited and time spent on our website</li>
              <li>Referring website addresses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We use the collected information for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Processing and preparing your visa application documents</li>
              <li>Communicating with you about your application status</li>
              <li>Providing customer support and responding to inquiries</li>
              <li>Processing payments for our services</li>
              <li>Improving our website and services</li>
              <li>Complying with legal obligations</li>
              <li>Sending service-related communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction. Your data is stored on
              secure servers and we use encryption for sensitive information transmission.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Form data may be temporarily stored in your browser's local storage to preserve your progress. This data
              remains on your device and is not transmitted to our servers until you submit your application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Service providers who assist in our operations (payment processors, hosting providers)</li>
              <li>Professional advisors (lawyers, accountants) when necessary</li>
              <li>Law enforcement or government agencies when required by law</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not sell, trade, or rent your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on our website. You can manage
              your cookie preferences through your browser settings or our cookie consent banner. For more details,
              please see our cookie preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Under the General Data Protection Regulation (GDPR) and other applicable laws, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Rectification:</strong> Request correction of inaccurate data
              </li>
              <li>
                <strong>Erasure:</strong> Request deletion of your personal data
              </li>
              <li>
                <strong>Restriction:</strong> Request limitation of data processing
              </li>
              <li>
                <strong>Portability:</strong> Receive your data in a structured format
              </li>
              <li>
                <strong>Objection:</strong> Object to certain types of data processing
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw previously given consent
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at info@ezvisa.net
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information only for as long as necessary to fulfill the purposes for which it was
              collected, typically for the duration of your visa application process plus an additional period for legal
              and administrative purposes (usually up to 3 years).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. We
              ensure appropriate safeguards are in place to protect your data in compliance with applicable data
              protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal
              information from children. If you are a parent or guardian and believe your child has provided us with
              personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-foreground font-medium">EZvisa</p>
              <p className="text-muted-foreground">Email: info@ezvisa.net</p>
              <p className="text-muted-foreground">WhatsApp: +971 50 123 4567</p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
