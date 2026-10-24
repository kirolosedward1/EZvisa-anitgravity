import { headers } from "next/headers"
import { ltr } from "@/lib/bidi"
import { formatAedLabel } from "@/lib/currency"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

const priceEn = formatAedLabel(PRICE_AED, "en")
const priceAr = formatAedLabel(PRICE_AED, "ar")
const days = ltr("1–2")

// What actually happens from payment to the embassy's decision, in the order the customer meets it.
const STEPS = [
  {
    when: { en: "Right after you pay", ar: "فور الدفع" },
    title: { en: "A receipt and your EZ reference", ar: `إيصال ومرجع ${ltr("EZ-")}` },
    body: {
      en: `You get an email with your ${priceEn} receipt and an EZ- reference. The application is in your account and in the EZvisa app from that moment.`,
      ar: `يصلك بريد فيه إيصال ${priceAr} ومرجع ${ltr("EZ-")}. يصبح الطلب في حسابك وفي تطبيق ${ltr("EZvisa")} من تلك اللحظة.`,
    },
  },
  {
    when: { en: "Same day", ar: "في اليوم نفسه" },
    title: { en: "Finish your application", ar: "أكمل طلبك" },
    body: {
      en: "Add your travel dates, where you plan to stay, your passport and your job details. It takes about ten minutes and saves as you go.",
      ar: "أضف تواريخ السفر ومكان الإقامة وبيانات الجواز والعمل. يستغرق ذلك نحو عشر دقائق ويُحفظ أولًا بأول.",
    },
  },
  {
    when: { en: "Same day", ar: "في اليوم نفسه" },
    title: { en: "Upload your documents", ar: "ارفع مستنداتك" },
    body: {
      en: "Passport, Emirates ID, residence visa, photo, bank statement, and a salary certificate or NOC. Upload each one on the website or in the app, from your phone if that's easier.",
      ar: `جواز السفر، و${ltr("Emirates ID")}، وتأشيرة الإقامة، والصورة، وكشف الحساب، وشهادة الراتب أو ${ltr("NOC")}. ارفع كل مستند على الموقع أو في التطبيق، ومن هاتفك إن كان ذلك أسهل.`,
    },
  },
  {
    when: { en: "Within 1–2 days", ar: `خلال ${days} يوم` },
    title: { en: "Your file is ready", ar: "ملفك جاهز" },
    body: {
      en: "A visa specialist checks your documents and prepares the application form, cover letter, itinerary, and flight and hotel reservations. You download them from your account.",
      ar: "يراجع مختص التأشيرات مستنداتك ويجهّز نموذج الطلب وخطاب التغطية وبرنامج الرحلة وحجوزات الطيران والفندق. تنزّلها من حسابك.",
    },
  },
  {
    when: { en: "Your appointment", ar: "موعدك" },
    title: { en: "Submit at the visa centre", ar: "قدّم في مركز التأشيرات" },
    body: {
      en: "Book a slot with the country's visa centre (VFS Global, BLS or TLScontact), pay the embassy fee there, give your fingerprints and hand in the file.",
      ar: `احجز موعدًا في مركز تأشيرات الدولة (${ltr("VFS Global")} أو ${ltr("BLS")} أو ${ltr("TLScontact")})، وادفع رسوم السفارة هناك، وقدّم بصماتك وسلّم الملف.`,
    },
  },
  {
    when: { en: "Usually 15 days", ar: "عادة 15 يومًا" },
    title: { en: "The embassy decides", ar: "السفارة تقرّر" },
    body: {
      en: "Most decisions come within 15 calendar days, and can take up to 45 in busy months. The visa centre tells you when your passport is ready to collect.",
      ar: "تصل معظم القرارات خلال 15 يومًا، وقد تصل إلى 45 يومًا في الأشهر المزدحمة. يخبرك مركز التأشيرات عندما يصبح جوازك جاهزًا للاستلام.",
    },
  },
]

export async function AfterPaymentTimeline() {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  const pick = (copy: { en: string; ar: string }) => (arabic ? copy.ar : copy.en)
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5 lg:sticky lg:top-32 lg:self-start">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {pick({ en: "After you pay", ar: "بعد الدفع" })}
          </span>
          <h2 className="text-balance text-foreground">
            {pick({ en: "What happens, and when.", ar: "ماذا يحدث، ومتى." })}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {pick({
              en: "Our part takes one to two days. The rest depends on your appointment date and the embassy.",
              ar: "جزءنا يستغرق يومًا أو يومين. والباقي يعتمد على تاريخ موعدك وعلى السفارة.",
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
