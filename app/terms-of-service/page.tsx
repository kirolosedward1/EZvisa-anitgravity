import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { WHATSAPP_DISPLAY } from "@/lib/contact"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Terms of Service",
      description: "Terms of Service for EZvisa - Read our terms and conditions for using our visa assistance services.",
      alternates: { canonical: "https://www.ezvisa.net/terms-of-service" },
    },
    {
      title: "شروط الخدمة",
      description: "شروط استخدام خدمات إيزي فيزا لتجهيز طلب التأشيرة.",
      path: "/ar/terms-of-service",
    },
  )
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader forceBackground={true} />
      <InnerHero
        badge={<LangText en="Legal" ar="قانوني" />}
        title={<LangText en="Terms of Service" ar="شروط الخدمة" />}
        description={<LangText en="Last updated: January 7, 2026" ar="آخر تحديث: 7 يناير 2026" />}
        variant="plain"
      />
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">

        <div className="legal-copy">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="1. Agreement to Terms" ar="1. الموافقة على الشروط" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="By accessing or using EZvisa's website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services." ar="باستخدامك موقع إيزي فيزا وخدماتها أو الوصول إليها، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدماتنا." />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="2. Description of Services" ar="2. وصف الخدمات" /></h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <LangText en="EZvisa provides visa application document assistance services, including but not limited to:" ar="تقدّم إيزي فيزا خدمات المساعدة في إعداد مستندات طلبات التأشيرة، بما في ذلك على سبيل المثال لا الحصر:" />
            </p>
            <ul className="list-disc ps-6 text-muted-foreground space-y-2">
              <li><LangText en="Visa application form completion assistance" ar="المساعدة في تعبئة نموذج طلب التأشيرة" /></li>
              <li><LangText en="Flight booking confirmations for visa purposes" ar="تأكيدات حجز الطيران لأغراض التأشيرة" /></li>
              <li><LangText en="Hotel reservation confirmations" ar="تأكيدات حجز الفنادق" /></li>
              <li><LangText en="Travel itinerary preparation" ar="إعداد خط سير الرحلة" /></li>
              <li><LangText en="Cover letter drafting" ar="صياغة خطاب التغطية" /></li>
              <li><LangText en="Document review and guidance" ar="مراجعة المستندات والإرشاد بشأنها" /></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="3. Important Disclaimers" ar="3. إخلاءات مسؤولية مهمة" /></h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-foreground font-medium mb-2"><LangText en="Please read carefully:" ar="يرجى القراءة بعناية:" /></p>
              <ul className="list-disc ps-6 text-muted-foreground space-y-2">
                <li><strong><LangText en="EZvisa is NOT a travel agency." ar="إيزي فيزا ليست وكالة سفر." /></strong></li>
                <li><LangText en="We do NOT guarantee visa approval. The final decision rests solely with the respective embassy or consulate." ar="لا نضمن الموافقة على التأشيرة. القرار النهائي يعود حصريًا إلى السفارة أو القنصلية المختصة." /></li>
                <li><LangText en="We are NOT responsible for visa rejections or delays caused by embassy processing." ar="لسنا مسؤولين عن رفض التأشيرة أو التأخير الناتج عن إجراءات السفارة." /></li>
                <li><LangText en="We do NOT help find or book visa appointment slots." ar="لا نساعد في إيجاد مواعيد التأشيرة أو حجزها." /></li>
                <li><LangText en="Flight reservations and hotel reservations provided are verifiable reservations for your visa application and may be subject to cancellation policies." ar="حجوزات الطيران والفنادق المقدّمة حجوزات قابلة للتحقق لطلب التأشيرة، وقد تخضع لسياسات الإلغاء." /></li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="4. User Responsibilities" ar="4. مسؤوليات المستخدم" /></h2>
            <p className="text-muted-foreground leading-relaxed mb-4"><LangText en="By using our services, you agree to:" ar="باستخدامك لخدماتنا، فإنك توافق على ما يلي:" /></p>
            <ul className="list-disc ps-6 text-muted-foreground space-y-2">
              <li><LangText en="Provide accurate, complete, and truthful information" ar="تقديم معلومات دقيقة وكاملة وصحيحة" /></li>
              <li><LangText en="Ensure all documents submitted are genuine and valid" ar="التأكد من أن جميع المستندات المقدّمة أصلية وسارية" /></li>
              <li><LangText en="Review all prepared documents before submission to the embassy" ar="مراجعة جميع المستندات المُعدّة قبل تقديمها إلى السفارة" /></li>
              <li><LangText en="Comply with all visa application requirements of the destination country" ar="الالتزام بجميع متطلبات طلب التأشيرة الخاصة بدولة الوجهة" /></li>
              <li><LangText en="Not use our services for any illegal or fraudulent purposes" ar="عدم استخدام خدماتنا لأي أغراض غير قانونية أو احتيالية" /></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="5. Payment Terms" ar="5. شروط الدفع" /></h2>
            <ul className="list-disc ps-6 text-muted-foreground space-y-2">
              <li><LangText en="All fees must be paid in full before services are rendered" ar="يجب دفع جميع الرسوم كاملةً قبل تقديم الخدمات" /></li>
              <li><LangText en="EZvisa is not VAT-registered; prices shown are final." ar="إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ والأسعار المعروضة نهائية." /></li>
              <li><LangText en="Payments are processed through secure third-party payment providers" ar="تتم معالجة المدفوعات عبر مزوّدي دفع خارجيين آمنين" /></li>
              <li><LangText en="All prices are displayed in the currency indicated at checkout" ar="تُعرض جميع الأسعار بالعملة الموضّحة عند إتمام الدفع" /></li>
            </ul>
          </section>

          <section>
            {/* LEGAL DRAFT – pending Legal Auditor (refund-policy.md, Terms §6 clause) */}
            <h2 className="text-xl font-semibold text-foreground mb-4">
              <LangText en="6. Cancellation and Refunds" ar="6. الإلغاء والاسترداد" />
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText
                en={<>You may cancel your order and receive a full refund of the EZvisa service fee at any time before preparation of your application starts. Preparation starts when our team begins reviewing your documents or drafting any part of your application, and we will notify you when this happens. Once preparation has started, or once your documents have been prepared or submitted, the service fee is non-refundable. If EZvisa fails to deliver the service you paid for, you will receive a full refund. Duplicate payments are refunded in full. No refund is given for a visa refusal or delay, because the decision rests solely with the embassy or consulate. Government, embassy and visa centre fees are not collected by EZvisa and are not refundable by us. Full details are in our <LocaleLink href="/refund-policy" className="text-primary underline">Refund Policy</LocaleLink>, which forms part of these Terms.</>}
                ar={<>يمكنك إلغاء طلبك والحصول على استرداد كامل لرسوم خدمة إيزي فيزا في أي وقت قبل بدء تجهيز طلبك. يبدأ التجهيز عندما يبدأ فريقنا مراجعة مستنداتك أو صياغة أي جزء من طلبك، وسنُعلمك عند حدوث ذلك. بعد بدء التجهيز، أو بعد تجهيز مستنداتك أو تقديمها، تصبح رسوم الخدمة غير قابلة للاسترداد. إذا أخفقت إيزي فيزا في تقديم الخدمة التي دفعت مقابلها، فستحصل على استرداد كامل. الدفعات المكرّرة تُسترد بالكامل. لا يُمنح أي استرداد عند رفض التأشيرة أو تأخيرها، لأن القرار يعود حصريًا إلى السفارة أو القنصلية. لا تحصّل إيزي فيزا الرسوم الحكومية ورسوم السفارات ومراكز التأشيرات، ولا نستردها. التفاصيل الكاملة في <LocaleLink href="/refund-policy" className="text-primary underline">سياسة الاسترداد</LocaleLink>، وهي جزء من هذه الشروط.</>}
              />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="7. Intellectual Property" ar="7. الملكية الفكرية" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="All content on this website, including text, graphics, logos, and software, is the property of EZvisa and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission." ar="جميع المحتويات على هذا الموقع، بما في ذلك النصوص والرسومات والشعارات والبرمجيات، مملوكة لإيزي فيزا ومحمية بموجب قوانين الملكية الفكرية. لا يجوز لك نسخها أو توزيعها أو إنشاء أعمال مشتقة منها دون إذن كتابي صريح منا." />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="8. Limitation of Liability" ar="8. حدود المسؤولية" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="To the fullest extent permitted by law, EZvisa shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses, resulting from your use of our services." ar="إلى أقصى حد يسمح به القانون، لا تتحمّل إيزي فيزا المسؤولية عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية، بما في ذلك على سبيل المثال لا الحصر خسارة الأرباح أو البيانات أو غيرها من الخسائر غير الملموسة، الناتجة عن استخدامك لخدماتنا." />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="9. Indemnification" ar="9. التعويض" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="You agree to indemnify and hold harmless EZvisa and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of our services or violation of these terms." ar="توافق على تعويض إيزي فيزا ومسؤوليها ومديريها وموظفيها ووكلائها وإبراء ذمتهم من أي مطالبات أو أضرار أو خسائر أو نفقات تنشأ عن استخدامك لخدماتنا أو مخالفتك لهذه الشروط." />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="10. Governing Law" ar="10. القانون الواجب التطبيق" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="These Terms of Service shall be governed by and construed in accordance with the laws of the United Arab Emirates. Any disputes arising from these terms shall be resolved in the courts of Dubai, UAE." ar="تخضع شروط الخدمة هذه لقوانين دولة الإمارات العربية المتحدة وتُفسَّر وفقًا لها. وتختص محاكم دبي، الإمارات العربية المتحدة، بالفصل في أي نزاعات تنشأ عن هذه الشروط." />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="11. Changes to Terms" ar="11. التعديلات على الشروط" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to this page. Your continued use of our services constitutes acceptance of the modified terms." ar="نحتفظ بحق تعديل شروط الخدمة هذه في أي وقت. تسري التعديلات فور نشرها على هذه الصفحة، ويُعدّ استمرارك في استخدام خدماتنا قبولًا للشروط المعدّلة." />
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4"><LangText en="12. Contact Information" ar="12. معلومات التواصل" /></h2>
            <p className="text-muted-foreground leading-relaxed">
              <LangText en="For questions about these Terms of Service, please contact us at:" ar="للاستفسارات حول شروط الخدمة هذه، يرجى التواصل معنا عبر:" />
            </p>
            <div className="mt-4 rounded-2xl bg-secondary/60 p-5">
              <p className="text-foreground font-medium"><LangText en="EZvisa" ar="إيزي فيزا" /></p>
              <p className="text-muted-foreground"><LangText en="Email:" ar="البريد الإلكتروني:" /> <span dir="ltr">hello@ezvisa.net</span></p>
              <p className="text-muted-foreground"><WhatsAppIcon className="me-1 inline-block size-4 align-text-bottom" /><LangText en="WhatsApp:" ar="واتساب:" /> <span dir="ltr">{WHATSAPP_DISPLAY}</span></p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
