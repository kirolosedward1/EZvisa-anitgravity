import type { ReactNode } from "react"
import { headers } from "next/headers"
import { ltr } from "@/lib/bidi"
import { formatAedLabel } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

const priceEn = formatAedLabel(PRICE_AED, "en")
const priceAr = formatAedLabel(PRICE_AED, "ar")

// What actually happens from payment to the embassy's decision, in the order the customer meets it.
const STEPS = [
  {
    when: { en: "Right after you pay", ar: "فور الدفع" },
    title: { en: "Confirmation and receipt", ar: "التأكيد والإيصال" },
    body: {
      en: `You receive a confirmation email with your ${priceEn} receipt and your EZ- reference number. Your application appears in your account and in the EZvisa app.`,
      ar: `يصلك بريد تأكيد فيه إيصال ${priceAr} ورقم مرجع ${ltr("EZ-")}. ويظهر طلبك في حسابك وفي تطبيق ${ltr("EZvisa")}.`,
    },
  },
  {
    when: { en: "Same day", ar: "في اليوم نفسه" },
    title: { en: "Finish your application", ar: "أكمل طلبك" },
    body: {
      en: "Add your travel dates, accommodation plans, passport and employment details. This takes about 10 minutes, and your answers are saved automatically.",
      ar: "أضف تواريخ السفر وخطط الإقامة وبيانات الجواز والعمل. يستغرق ذلك نحو 10 دقائق، وتُحفظ إجاباتك تلقائيًا.",
    },
  },
  {
    when: { en: "Same day", ar: "في اليوم نفسه" },
    title: { en: "Upload your documents", ar: "ارفع مستنداتك" },
    body: {
      en: "Upload your passport, Emirates ID, residence visa, photo, bank statement, and salary certificate or NOC on the website or in the EZvisa app.",
      ar: `ارفع جواز السفر و${ltr("Emirates ID")} وتأشيرة الإقامة والصورة وكشف الحساب وشهادة الراتب أو ${ltr("NOC")} على الموقع أو في تطبيق ${ltr("EZvisa")}.`,
    },
  },
  {
    when: { en: "Within 1–2 days", ar: <>خلال <bdi dir="ltr">1–2</bdi> يوم</> },
    title: { en: "Your file is ready", ar: "ملفك جاهز" },
    body: {
      en: "A visa specialist reviews your documents and prepares your application form, cover letter, itinerary, and flight and hotel reservations. You can download everything from your account.",
      ar: "يراجع مختص التأشيرات مستنداتك ويجهّز نموذج الطلب وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق. ويمكنك تنزيلها كلها من حسابك.",
    },
  },
  {
    when: { en: "Your appointment", ar: "موعدك" },
    title: { en: "Submit at the visa centre", ar: "قدّم في مركز التأشيرات" },
    body: {
      en: "Book an appointment with the visa centre for your destination (VFS Global, BLS International or TLScontact). On the day, you submit your file, pay the embassy fee and give your fingerprints.",
      ar: `احجز موعدًا في مركز التأشيرات الخاص بوجهتك (${ltr("VFS Global")} أو ${ltr("BLS International")} أو ${ltr("TLScontact")}). وفي يوم الموعد تقدّم ملفك وتدفع رسوم السفارة وتسجّل بصماتك.`,
    },
  },
  {
    when: { en: "Usually 15 days", ar: "عادة 15 يومًا" },
    title: { en: "The embassy decides", ar: "السفارة تقرّر" },
    body: {
      en: "Embassies usually decide within 15 calendar days. In busy periods this can take up to 45 days. The visa centre lets you know when your passport is ready to collect.",
      ar: "تصدر السفارات قرارها عادة خلال 15 يومًا تقويميًا، وقد يمتد ذلك إلى 45 يومًا في فترات الذروة. ويبلغك مركز التأشيرات عندما يصبح جوازك جاهزًا للاستلام.",
    },
  },
]

export async function AfterPaymentTimeline() {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  const pick = (copy: { en: ReactNode; ar: ReactNode }) => (arabic ? copy.ar : copy.en)
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5 lg:sticky lg:top-32 lg:self-start">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {pick({ en: "After you pay", ar: "بعد الدفع" })}
          </span>
          <h2 className="text-balance text-foreground">
            {pick({ en: "What happens after payment", ar: "ماذا يحدث بعد الدفع" })}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {pick({
              en: "We prepare your file within 1–2 days of receiving your documents. The rest of the timeline depends on your appointment date and the embassy.",
              ar: "نجهّز ملفك خلال يوم إلى يومين من استلام مستنداتك. وتعتمد بقية المدة على تاريخ موعدك وعلى السفارة.",
            })}
          </p>
        </div>

        <ol className="flex flex-col rounded-3xl border border-border/70 bg-card">
          {STEPS.map((step) => (
            <li key={step.title.en} className="grid grid-cols-1 gap-2 border-b border-border/70 px-6 py-6 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:px-8">
              <span className="text-sm font-medium text-primary sm:pt-0.5">
                {pick(step.when)}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="panel-title text-foreground">
                  {pick(step.title)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pick(step.body)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
