import type { Metadata } from "next"
import { Check } from "lucide-react"
import { InnerHero } from "@/components/inner-hero"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { withArabicMeta } from "@/lib/page-meta"
import { requestLocale } from "@/lib/request-locale"

// A sample No Objection Certificate (NOC) from a UAE employer, for a Schengen tourist visa. Opened from the app's
// "What a good NOC says" card (in-app browser) and linked from /documents. The bracketed parts are what the employer
// fills in; the checklist repeats the app's wording so both say the same thing.

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Sample NOC Letter for a Schengen Visa (UAE Employer)",
      description: "What a good No Objection Certificate looks like: a sample letter from a UAE employer for a Schengen tourist visa, and the details every NOC needs.",
      alternates: { canonical: "https://www.ezvisa.net/documents/noc-sample", languages: { en: "https://www.ezvisa.net/documents/noc-sample", ar: "https://www.ezvisa.net/ar/documents/noc-sample" } },
    },
    {
      title: "نموذج خطاب عدم ممانعة لتأشيرة شنغن",
      description: "كيف يبدو خطاب عدم الممانعة الجيد: نموذج من جهة عمل في الإمارات لتأشيرة شنغن السياحية، والتفاصيل التي يحتاجها كل خطاب.",
      path: "/ar/documents/noc-sample",
    },
  )
}

const CHECKLIST = {
  en: [
    "On the company letterhead, with the company's address and phone number",
    "Dated recently, before you apply",
    "Addressed to the embassy or consulate of the country you're visiting",
    "Your full name as in your passport, and your passport number",
    "Your job title, the date you started, and your monthly salary",
    "Your approved leave dates, matching your trip",
    "That the company has no objection, and that you'll return to work after the trip",
    "Name and title of the person signing, signed and stamped",
  ],
  ar: [
    "على الورق الرسمي للشركة، مع عنوانها ورقم هاتفها",
    "بتاريخ حديث، قبل تقديم الطلب",
    "موجّه إلى سفارة أو قنصلية الدولة التي ستزورها",
    "اسمك الكامل كما في جواز السفر، ورقم الجواز",
    "مسمّاك الوظيفي وتاريخ بدء العمل وراتبك الشهري",
    "تواريخ إجازتك المعتمدة، مطابقة لرحلتك",
    "أن الشركة لا تمانع، وأنك ستعود إلى العمل بعد الرحلة",
    "اسم الموقّع ومنصبه، مع التوقيع والختم",
  ],
}

/** A bracketed part the employer fills in. */
function Fill({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-primary/10 px-1 font-medium text-primary">{children}</span>
}

export default async function NocSamplePage() {
  const arabic = (await requestLocale()) === "ar"
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader forceBackground={true} />
      <main className="flex-1">
        <InnerHero
          variant="plain"
          title={arabic ? "كيف يبدو خطاب عدم الممانعة الجيد" : "What a good NOC looks like"}
          description={arabic ? "نموذج خطاب من جهة عمل في الإمارات لتأشيرة شنغن السياحية. أعطه لشركتك لتكتبه على ورقها الرسمي." : "A sample letter from a UAE employer for a Schengen tourist visa. Give it to your company to put on its letterhead."}
        />
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-20 lg:flex-row lg:items-start">
          <article dir="ltr" lang="en" aria-label={arabic ? "نموذج الخطاب (بالإنجليزية)" : "Sample letter"} className="flex-1 rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-card-foreground shadow-sm sm:p-10">
            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <p className="text-base font-semibold"><Fill>[Company name]</Fill></p>
              <p className="text-muted-foreground"><Fill>[Address, Dubai, United Arab Emirates]</Fill> · <Fill>[Phone]</Fill></p>
            </div>
            <div className="flex flex-col gap-4 pt-6">
              <p>Date: <Fill>[DD Month YYYY]</Fill></p>
              <p>To: The Embassy of <Fill>[France]</Fill>, Abu Dhabi</p>
              <p className="font-semibold">Subject: No Objection Certificate</p>
              <p>Dear Sir or Madam,</p>
              <p>
                This is to certify that <Fill>[Mr / Ms Full Name]</Fill>, holder of <Fill>[Indian]</Fill> passport number <Fill>[N1234567]</Fill>, has been employed with{" "}
                <Fill>[Company name]</Fill> as <Fill>[Job title]</Fill> since <Fill>[DD Month YYYY]</Fill>. Their monthly salary is AED <Fill>[15,000]</Fill>.
              </p>
              <p>
                <Fill>[He / She]</Fill> has been granted annual leave from <Fill>[DD Month YYYY]</Fill> to <Fill>[DD Month YYYY]</Fill> to travel to{" "}
                <Fill>[France]</Fill> for tourism. The company has no objection to this trip, and <Fill>[he / she]</Fill> will resume work on{" "}
                <Fill>[DD Month YYYY]</Fill>.
              </p>
              <p>Please do not hesitate to contact us for any further information.</p>
              <p>Yours faithfully,</p>
              <div className="flex items-end justify-between gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold"><Fill>[Name of the signatory]</Fill></p>
                  <p className="text-muted-foreground"><Fill>[HR Manager]</Fill></p>
                  <p className="text-muted-foreground"><Fill>[email@company.com]</Fill></p>
                </div>
                <div aria-hidden="true" className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/40 text-center text-xs text-primary/70">Company stamp</div>
              </div>
            </div>
          </article>
          <aside className="flex w-full flex-col gap-4 lg:w-80">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{arabic ? "قائمة التحقق" : "Checklist"}</span>
            <h2 className="text-xl font-semibold tracking-tight">{arabic ? "ما يحتاجه كل خطاب" : "What every NOC needs"}</h2>
            <ul className="flex flex-col gap-3">
              {CHECKLIST[arabic ? "ar" : "en"].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {arabic
                ? "إذا كانت شركتك تستخدم نموذجها الخاص فلا بأس، ما دام يتضمن هذه التفاصيل. ارفع الخطاب الموقّع والمختوم في التطبيق أو على الموقع."
                : "If your company has its own format, that's fine as long as it covers these details. Upload the signed and stamped letter in the app or on the website."}
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}
