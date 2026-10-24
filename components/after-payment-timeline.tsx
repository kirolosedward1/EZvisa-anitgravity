import { PRICE_AED } from "@/lib/shared/wizard-contract"

// What actually happens from payment to the embassy's decision, in the order the customer meets it.
const STEPS = [
  {
    when: "Right after you pay",
    title: "Confirmation and receipt",
    body: `You receive a confirmation email with your ${PRICE_AED} AED receipt and your EZ- reference number. Your application appears in your account and in the EZvisa app.`,
  },
  {
    when: "Same day",
    title: "Finish your application",
    body: "Add your travel dates, accommodation plans, passport and employment details. This takes about 10 minutes, and your answers are saved automatically.",
  },
  {
    when: "Same day",
    title: "Upload your documents",
    body: "Upload your passport, Emirates ID, residence visa, photo, bank statement, and salary certificate or NOC on the website or in the EZvisa app.",
  },
  {
    when: "Within 1–2 days",
    title: "Your file is ready",
    body: "A visa specialist reviews your documents and prepares your application form, cover letter, itinerary, and flight and hotel reservations. You can download everything from your account.",
  },
  {
    when: "Your appointment",
    title: "Submit at the visa centre",
    body: "Book an appointment with the visa centre for your destination (VFS Global, BLS International or TLScontact). On the day, you submit your file, pay the embassy fee and give your fingerprints.",
  },
  {
    when: "Usually 15 days",
    title: "The embassy decides",
    body: "Embassies usually decide within 15 calendar days. In busy periods this can take up to 45 days. The visa centre lets you know when your passport is ready to collect.",
  },
]

export function AfterPaymentTimeline() {
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5 lg:sticky lg:top-32 lg:self-start">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">After you pay</span>
          <h2 className="text-balance text-foreground">What happens after payment</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            We prepare your file within 1–2 days of receiving your documents. The rest of the timeline depends on your appointment date and the embassy.
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
