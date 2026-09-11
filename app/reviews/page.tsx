import { Star, ArrowLeft, Quote } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { InnerHero } from "@/components/inner-hero"

export const metadata = {
  title: "Customer Reviews | EZvisa",
  description: "Read genuine feedback from UAE residents who prepared their Schengen visa application files with EZvisa.",
  alternates: {
    canonical: "https://www.ezvisa.net/reviews",
  },
}

const testimonials = [
  {
    name: "Ahmed Al-Rashid",
    destination: "France",
    initials: "AR",
    fullStory: "I was nervous about preparing my first Schengen visa file, but EZvisa guided me through every step. Their document analysis caught a small error in my bank statement that could have caused delays. The custom cover letter and itinerary were prepared flawlessly.",
  },
  {
    name: "Priya Sharma",
    destination: "Germany",
    initials: "PS",
    fullStory: "Excellent service. Professional, thorough, and delivered my complete document pack on time. Highly recommended for anyone in the UAE planning a trip to Europe.",
  },
  {
    name: "Mohammed Hassan",
    destination: "Italy",
    initials: "MH",
    fullStory: "They spotted issues in my previous paperwork I didn't even know existed. Everything was organized, verified, and ready for my appointment. The customer support was prompt and reassuring.",
  },
  {
    name: "Sarah Mitchell",
    destination: "Spain",
    initials: "SM",
    fullStory: "The best visa document service I've used. The platform is straightforward, and the team handles all the complicated paperwork so you can focus on your trip.",
  },
  {
    name: "Omar Tariq",
    destination: "Netherlands",
    initials: "OT",
    fullStory: "Fast, reliable, and incredibly professional. They prepared a detailed itinerary and cover letter for my business trip to Amsterdam. Every paper was in perfect order.",
  },
  {
    name: "Fatima Ali",
    destination: "Switzerland",
    initials: "FA",
    fullStory: "I couldn't believe how smooth the document preparation was. From filling out the details to receiving the complete dossier in 24 hours, EZvisa was helpful every step of the way.",
  }
]

export default function ReviewsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <InnerHero 
          title="Customer Reviews & Experiences" 
          description="Read genuine reviews from travelers who prepared their Schengen visa application files with EZvisa."
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
                      Traveled to {review.destination}
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
