import { Star, ArrowLeft, Quote } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"

export const metadata = {
  title: "Customer Reviews | EZvisa",
  description: "Read what 5,000+ happy travelers have to say about their seamless Schengen visa application experience with EZvisa.",
}

const testimonials = [
  {
    name: "Ahmed Al-Rashid",
    destination: "France",
    initials: "AR",
    fullStory: "I was nervous about applying for my first Schengen visa, but EZvisa guided me through every step. Their document analysis caught a small error in my bank statement that could have caused a rejection. The custom cover letter highlighted my travel history perfectly. Within 2 weeks, I had my visa approved and was on my way to Paris!",
  },
  {
    name: "Priya Sharma",
    destination: "Germany",
    initials: "PS",
    fullStory: "Excellent service. Professional and delivered everything on time. They made the impossible possible. Highly recommended for anyone traveling to Europe.",
  },
  {
    name: "Mohammed Hassan",
    destination: "Italy",
    initials: "MH",
    fullStory: "They spotted issues in my previous applications I didn't even know existed. Approved in 3 weeks! The customer service was exceptional and they were always available to answer my questions.",
  },
  {
    name: "Sarah Mitchell",
    destination: "Spain",
    initials: "SM",
    fullStory: "The best visa service I've ever used. The platform is so easy to navigate, and the team takes care of all the complex paperwork. I just had to show up for my appointment.",
  },
  {
    name: "Omar Tariq",
    destination: "Netherlands",
    initials: "OT",
    fullStory: "Fast, reliable, and incredibly professional. They prepared a flawless itinerary and cover letter for my business trip to Amsterdam. Got a multiple entry visa valid for 1 year!",
  },
  {
    name: "Fatima Ali",
    destination: "Switzerland",
    initials: "FA",
    fullStory: "I couldn't believe how smooth the process was. From booking the appointment to getting the passport back with the visa stamp, EZvisa was there every step of the way.",
  }
]

export default function ReviewsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <InnerHero 
          title="Loved by 5,000+ happy travelers" 
          description="Read genuine reviews from travelers who successfully secured their Schengen visas using our expert document preparation service."
        />
        
        <section className="py-20 md:py-28 bg-background">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
              
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-secondary/15 border border-border/40">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">4.9/5 Average</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((review, i) => (
                <div key={i} className="bg-card border border-border/60 rounded-3xl p-8 flex flex-col hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                      {review.initials}
                    </div>
                    <Quote className="h-6 w-6 text-primary/20" />
                  </div>
                  
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  
                  <p className="text-foreground/80 text-sm leading-relaxed mb-8 flex-1 italic">
                    "{review.fullStory}"
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-border/50">
                    <h4 className="font-semibold text-foreground">{review.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {review.destination} visa approved
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
