/**
 * Message templates used by the console (quick replies, broadcasts, reminders), English and Arabic. Variables in
 * braces fill from the case. Pure. WhatsApp Business is not connected: the console opens WhatsApp with the text.
 */
export type TemplateKey = "status" | "documents" | "appointment" | "greeting" | "documents_reminder" | "slots_opened" | "pay_reminder"

export const TEMPLATES: Record<TemplateKey, { label: string; en: string; ar: string; broadcast?: boolean }> = {
  status: { label: "Status update", en: "Hi {first_name}, quick update on {reference}: your application is at the {stage} stage. You can follow it on your dashboard: {dashboard_link}", ar: "مرحباً {first_name}، تحديث سريع لطلبك {reference}: طلبك الآن في مرحلة {stage}. يمكنك المتابعة من لوحة التحكم: {dashboard_link}" },
  documents: { label: "Which documents", en: "Hi {first_name}, for your {destination} file we still need: {missing_documents}. Upload them from your dashboard whenever ready: {dashboard_link}", ar: "مرحباً {first_name}، لملف {destination} ما زلنا بحاجة إلى: {missing_documents}. ارفعها من لوحة التحكم عندما تكون جاهزة: {dashboard_link}" },
  appointment: { label: "Appointment help", en: "Happy to help with the appointment, {first_name}. Which days work for you, and morning or afternoon? We will book the earliest slot and save it to your case.", ar: "يسعدنا مساعدتك في الموعد يا {first_name}. ما الأيام المناسبة لك، صباحاً أم مساءً؟ سنحجز أقرب موعد ونحفظه في ملفك." },
  greeting: { label: "Arabic greeting", en: "Hi {first_name}, this is the EZvisa team. How can we help you today?", ar: "مرحباً {first_name}، معك فريق EZvisa. كيف يمكننا مساعدتك اليوم؟" },
  documents_reminder: { label: "Documents reminder", broadcast: true, en: "Hi {first_name}, your {destination} file is waiting for {missing_documents}. Upload them here and we take it from there: {dashboard_link}", ar: "مرحباً {first_name}، ملف {destination} بانتظار {missing_documents}. ارفعها هنا ونتولى الباقي: {dashboard_link}" },
  slots_opened: { label: "Appointment slots opened", broadcast: true, en: "Hi {first_name}, new appointment slots opened for {destination}. Save your appointment on your dashboard or reply and we can help: {dashboard_link}", ar: "مرحباً {first_name}، فُتحت مواعيد جديدة لـ {destination}. احفظ موعدك من لوحة التحكم أو راسلنا لنساعدك: {dashboard_link}" },
  pay_reminder: { label: "Unpaid draft reminder", broadcast: true, en: "Hi {first_name}, your {destination} application is saved. Pay the service fee from your dashboard to start the document check: {dashboard_link}", ar: "مرحباً {first_name}، طلب {destination} محفوظ. ادفع رسوم الخدمة من لوحة التحكم لنبدأ تدقيق المستندات: {dashboard_link}" },
}

export type TemplateVars = { first_name: string; reference: string; stage: string; destination: string; missing_documents: string; dashboard_link: string }

export function fillTemplate(text: string, vars: Partial<TemplateVars>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: keyof TemplateVars) => (vars[k] !== undefined && vars[k] !== "" ? String(vars[k]) : m))
}

export function waUrl(phone: string, text?: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 8) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
