import { ArrowUpRight, CalendarDays, Calculator, Wallet } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { LangText } from "@/components/lang-text"
const tools = [
  { href: "/tools/schengen-calculator", icon: CalendarDays, title: "Schengen stay calculator", ar: "حاسبة الإقامة في شنغن", text: "Plan your visits around the 90/180-day rule.", textAr: "خطّط لزياراتك وفق قاعدة ٩٠ يومًا خلال ١٨٠ يومًا." },
  { href: "/tools/bank-balance-calculator", icon: Wallet, title: "Bank balance calculator", ar: "حاسبة الرصيد البنكي", text: "Estimate the funds you’ll need for your trip.", textAr: "قدّر المبلغ الذي تحتاجه لرحلتك." },
  { href: "/tools/appointment-guide", icon: Calculator, title: "Appointment guide", ar: "دليل المواعيد", text: "Find the next steps for your visa appointment.", textAr: "تعرّف على خطوات حجز موعد التأشيرة." },
]
export function PlanningTools() {
  return <section className="ez-tools"><div data-site-reveal="rise" className="ez-section-heading"><div><h2><LangText en="Plan the practical details" ar="خطّط للتفاصيل العملية" /></h2></div><LocaleLink href="/tools" className="ez-destination-link"><LangText en="All planning tools" ar="كل أدوات التخطيط" /><ArrowUpRight size={16} /></LocaleLink></div><div data-site-stagger className="ez-tools-grid">{tools.map(tool => <LocaleLink key={tool.href} href={tool.href} data-site-reveal="rise" className="ez-tool"><tool.icon size={24} strokeWidth={1.3} /><h3><LangText en={tool.title} ar={tool.ar} /></h3><p><LangText en={tool.text} ar={tool.textAr} /></p><ArrowUpRight size={18} className="ez-tool-arrow" /></LocaleLink>)}</div></section>
}
