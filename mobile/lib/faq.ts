// Home FAQ (EN + AR). Single source: /workspace/ezvisa/faq.md mirrors this file for the website.
// Facts only from the website copy (start-application box, terms of service, payment step) and the app's own data.
// No approval guarantees, no processing times, no refund or appointment claims: embassies decide.
import { COUNTRY_LIST } from "./countries";

export type Faq = { id: string; q: { en: string; ar: string }; a: { en: string; ar: string } };
const N = COUNTRY_LIST.length;

export const FAQ: Faq[] = [
  { id: "what", q: { en: "What is a Schengen visa?", ar: "ما هي تأشيرة شنغن؟" },
    a: { en: `A short-stay visa for the Schengen area. It allows stays of up to 90 days in any 180-day period across all ${N} Schengen countries.`,
         ar: `تأشيرة إقامة قصيرة لمنطقة شنغن. تسمح بالإقامة حتى 90 يومًا خلال أي فترة 180 يومًا في جميع دول شنغن الـ${N}.` } },
  { id: "countries", q: { en: "Which countries can I visit?", ar: "ما الدول التي يمكنني زيارتها؟" },
    a: { en: `All ${N} Schengen countries listed in the app. One visa covers the whole area.`,
         ar: `جميع دول شنغن الـ${N} الموجودة في التطبيق. تأشيرة واحدة تغطي المنطقة كلها.` } },
  { id: "who", q: { en: "Can I apply from the UAE?", ar: "هل يمكنني التقديم من الإمارات؟" },
    a: { en: "Yes, if you live in the UAE and your nationality needs a Schengen visa. The app lists those nationalities when you start.",
         ar: "نعم، إذا كنت مقيمًا في الإمارات وجنسيتك تحتاج إلى تأشيرة شنغن. يعرض التطبيق هذه الجنسيات عند البدء." } },
  { id: "service", q: { en: "What does EZvisa do for me?", ar: "ماذا تقدّم لي EZvisa؟" },
    a: { en: "We help complete the visa application form, prepare flight and hotel reservation confirmations for visa purposes, a travel itinerary and a cover letter, and review your documents.",
         ar: "نساعدك في تعبئة نموذج طلب التأشيرة، ونجهّز تأكيدات حجز الطيران والفندق لأغراض التأشيرة، وخط سير الرحلة، وخطاب التغطية، ونراجع مستنداتك." } },
  { id: "chances", q: { en: "Does EZvisa improve my chances?", ar: "هل تزيد EZvisa فرص قبولي؟" },
    a: { en: "A complete, correct and consistent file avoids common mistakes. The decision is always the embassy's, so no one can guarantee approval.",
         ar: "الملف الكامل والصحيح والمتّسق يتجنّب الأخطاء الشائعة. القرار دائمًا للسفارة، لذا لا يمكن لأحد ضمان القبول." } },
  { id: "cost", q: { en: "How much does it cost?", ar: "كم التكلفة؟" },
    a: { en: "249 AED, or 498 AED with an accompanying spouse. Embassy fees are separate and paid at your appointment.",
         ar: "249 درهمًا، أو 498 درهمًا مع الزوج/الزوجة المرافق. رسوم السفارة منفصلة وتُدفع في موعدك." } },
  { id: "documents", q: { en: "What documents will I need?", ar: "ما المستندات التي سأحتاجها؟" },
    a: { en: "Passport, Emirates ID and UAE visa, a 35×45 mm photo, bank statements, a salary certificate or NOC if you're employed, and travel insurance.",
         ar: "جواز السفر، والهوية الإماراتية وتأشيرة الإمارات، وصورة 35×45 مم، وكشوف الحساب البنكي، وشهادة راتب أو عدم ممانعة إذا كنت موظفًا، وتأمين السفر." } },
  { id: "later", q: { en: "Can I pay first and finish later?", ar: "هل يمكنني الدفع أولًا والإكمال لاحقًا؟" },
    a: { en: "Yes. After payment, open Continue application to add your remaining details, then upload your documents.",
         ar: "نعم. بعد الدفع، افتح «متابعة الطلب» لإضافة بقية بياناتك، ثم ارفع مستنداتك." } },
  { id: "prep-time", q: { en: "How long does EZvisa take?", ar: "كم يستغرق EZvisa؟" },
    a: { en: "We prepare your application in 1–2 days after you pay and send your documents. The embassy decides on the visa and sets its own timeline.", ar: "نجهّز طلبك خلال يوم إلى يومين بعد الدفع وإرسال مستنداتك. السفارة هي التي تقرر بشأن التأشيرة وتحدد مدتها." } },
];
