import { Lora } from "next/font/google"
import { LangText } from "@/components/lang-text"

const journalSerif = Lora({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-journal-serif", display: "swap" })

export function BlogHero() {
  return (
    <header className={`ez-journal-masthead ${journalSerif.variable}`}>
      <div>
        <h1 data-site-reveal="rise"><LangText en={<>Before you <em>go.</em></>} ar={<>قبل أن <em>تسافر.</em></>} /></h1>
      </div>
      <p data-site-reveal="rise" data-site-delay="80" className="ez-journal-intro"><LangText
        en="A little know-how for the journey ahead. Visa advice, document checklists, and the details that make a difference."
        ar="خطوتك الأولى لرحلة أسهل. نصائح التأشيرة، وقوائم المستندات، والتفاصيل التي تصنع الفرق."
      /></p>
    </header>
  )
}
