import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for EZvisa - Read our terms and conditions for using our visa assistance services.",
  alternates: { canonical: "https://www.ezvisa.net/terms-of-service" },
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader forceBackground={true} />
      <InnerHero
        badge="Legal"
        title="Terms of Service"
        description="Last updated: January 7, 2026"
        gradientType="default"
      />
      <div className="container mx-auto px-6 py-12 max-w-4xl">

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using EZvisa's website and services, you agree to be bound by these Terms of Service. If
              you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Description of Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              EZvisa provides visa application document assistance services, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Visa application form completion assistance</li>
              <li>Flight booking confirmations for visa purposes</li>
              <li>Hotel reservation confirmations</li>
              <li>Travel itinerary preparation</li>
              <li>Cover letter drafting</li>
              <li>Document review and guidance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Important Disclaimers</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-foreground font-medium mb-2">Please read carefully:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  <strong>EZvisa is NOT a travel agency.</strong>
                </li>
                <li>
                  We do NOT guarantee visa approval. The final decision rests solely with the respective embassy or
                  consulate.
                </li>
                <li>We are NOT responsible for visa rejections or delays caused by embassy processing.</li>
                <li>We do NOT help find or book visa appointment slots.</li>
                <li>
                  Flight reservations and hotel reservations provided are verifiable reservations for your visa application and may be subject to
                  cancellation policies.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">By using our services, you agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate, complete, and truthful information</li>
              <li>Ensure all documents submitted are genuine and valid</li>
              <li>Review all prepared documents before submission to the embassy</li>
              <li>Comply with all visa application requirements of the destination country</li>
              <li>Not use our services for any illegal or fraudulent purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Payment Terms</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All fees must be paid in full before services are rendered</li>
              <li>EZvisa is not VAT-registered; prices shown are final.</li>
              <li>Payments are processed through secure third-party payment providers</li>
              <li>All prices are displayed in the currency indicated at checkout</li>
            </ul>
          </section>

          <section>
            {/* LEGAL DRAFT – pending Legal Auditor (refund-policy.md, Terms §6 clause) */}
            <h2 className="text-xl font-semibold text-foreground mb-4">
              <LangText en="6. Cancellation and Refunds" ar="٦. الإلغاء والاسترداد" />
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText
                en={<>You may cancel your order and receive a full refund of the EZvisa service fee at any time before preparation of your application starts. Preparation starts when our team begins reviewing your documents or drafting any part of your application, and we will notify you when this happens. Once preparation has started, or once your documents have been prepared or submitted, the service fee is non-refundable. If EZvisa fails to deliver the service you paid for, you will receive a full refund. Duplicate payments are refunded in full. No refund is given for a visa refusal or delay, because the decision rests solely with the embassy or consulate. Government, embassy and visa centre fees are not collected by EZvisa and are not refundable by us. Full details are in our <LocaleLink href="/refund-policy" className="text-primary underline">Refund Policy</LocaleLink>, which forms part of these Terms.</>}
                ar={<>يمكنك إلغاء طلبك والحصول على استرداد كامل لرسوم خدمة إيزي فيزا في أي وقت قبل بدء تجهيز طلبك. يبدأ التجهيز عندما يبدأ فريقنا مراجعة مستنداتك أو صياغة أي جزء من طلبك، وسنُعلمك عند حدوث ذلك. بعد بدء التجهيز، أو بعد تجهيز مستنداتك أو تقديمها، تصبح رسوم الخدمة غير قابلة للاسترداد. إذا أخفقت إيزي فيزا في تقديم الخدمة التي دفعت مقابلها، فستحصل على استرداد كامل. الدفعات المكرّرة تُسترد بالكامل. لا يُمنح أي استرداد عند رفض التأشيرة أو تأخيرها، لأن القرار يعود حصريًا إلى السفارة أو القنصلية. لا تحصّل إيزي فيزا الرسوم الحكومية ورسوم السفارات ومراكز التأشيرات، ولا نستردها. التفاصيل الكاملة في <LocaleLink href="/refund-policy" className="text-primary underline">سياسة الاسترداد</LocaleLink>، وهي جزء من هذه الشروط.</>}
              />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on this website, including text, graphics, logos, and software, is the property of EZvisa and
              is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works
              without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, EZvisa shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of profits, data, or other
              intangible losses, resulting from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless EZvisa and its officers, directors, employees, and agents from
              any claims, damages, losses, or expenses arising from your use of our services or violation of these
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of the United Arab
              Emirates. Any disputes arising from these terms shall be resolved in the courts of Dubai, UAE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately
              upon posting to this page. Your continued use of our services constitutes acceptance of the modified
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-foreground font-medium">EZvisa</p>
              <p className="text-muted-foreground">Email: info@ezvisa.net</p>
              <p className="text-muted-foreground">WhatsApp: +971 54 710 9533</p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
