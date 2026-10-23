import { PRICE_AED } from "@/lib/shared/wizard-contract"

// What actually happens from payment to the embassy's decision, in the order the customer meets it.
const STEPS = [
  {
    when: "Right after you pay",
    title: "A receipt and your EZ reference",
    body: `You get an email with your ${PRICE_AED} AED receipt and an EZ- reference. The application is in your account and in the EZvisa app from that moment.`,
  },
  {
    when: "Same day",
    title: "Finish your application",
    body: "Add your travel dates, where you plan to stay, your passport and your job details. It takes about ten minutes and saves as you go.",
  },
  {
    when: "Same day",
    title: "Upload your documents",
    body: "Passport, Emirates ID, residence visa, photo, bank statement, and a salary certificate or NOC. Upload each one on the website or in the app, from your phone if that's easier.",
  },
  {
    when: "Within 1–2 days",
    title: "Your file is ready",
    body: "A visa specialist checks your documents and prepares the application form, cover letter, itinerary, and flight and hotel reservations. You download them from your account.",
  },
  {
    when: "Your appointment",
    title: "Submit at the visa centre",
    body: "Book a slot with the country's visa centre (VFS Global, BLS or TLScontact), pay the embassy fee there, give your fingerprints and hand in the file.",
  },
  {
    when: "Usually 15 days",
    title: "The embassy decides",
    body: "Most decisions come within 15 calendar days, and can take up to 45 in busy months. The visa centre tells you when your passport is ready to collect.",
  },
]

export function AfterPaymentTimeline() {
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5 lg:sticky lg:top-32 lg:self-start">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">After you pay</span>
          <h2 className="text-balance text-foreground">What happens, and when.</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Our part takes one to two days. The rest depends on your appointment date and the embassy.
          </p>
        </div>

        <ol className="flex flex-col rounded-3xl border border-border/70 bg-card">
          {STEPS.map((step) => (
            <li key={step.title} className="grid grid-cols-1 gap-2 border-b border-border/70 px-6 py-6 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:px-8">
              <span className="text-sm font-medium text-primary sm:pt-0.5">{step.when}</span>
              <div className="flex flex-col gap-1.5">
                <h3 className="panel-title text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
