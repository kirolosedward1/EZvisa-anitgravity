// Help center content: topics and articles, English and Arabic.
// Facts come from the owner-confirmed brief (CLAUDE.md, DESIGN.md), the refund policy (content/legal/refund-policy.*.md)
// and the shared contract. Prices and upload limits are read from the contract, never typed in here.
//
// Body format: one string per paragraph. A paragraph starting with "- " is a list item (consecutive items form one
// list). Internal links are written [text](/path); the renderer turns them into locale-aware links.

import { MAX_UPLOAD_BYTES, PRICE_AED, priceAed } from "@/lib/shared/wizard-contract"

export type Localized = { en: string; ar: string }

export type HelpTopic = {
  slug: string
  title: Localized
  description: Localized
}

export type HelpArticle = {
  slug: string
  topic: string
  title: Localized
  summary: Localized
  body: { en: string[]; ar: string[] }
}

const SPOUSE = priceAed("yes")
const UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))
const EMAIL = "info@ezvisa.net"

export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: "getting-started",
    title: { en: "Getting started", ar: "البداية" },
    description: { en: "What EZvisa does, who can apply and when to start.", ar: "ما تقدّمه إيزي فيزا، ومن يمكنه التقديم، ومتى تبدأ." },
  },
  {
    slug: "pricing-and-payment",
    title: { en: "Pricing and payment", ar: "الأسعار والدفع" },
    description: { en: "What you pay us, what you pay separately and how to pay.", ar: "ما تدفعه لنا، وما تدفعه بشكل منفصل، وطرق الدفع." },
  },
  {
    slug: "documents-and-uploads",
    title: { en: "Documents and uploads", ar: "المستندات والرفع" },
    description: { en: "The documents you provide, the ones we prepare and how to upload.", ar: "المستندات التي تقدّمها، وما نجهّزه نحن، وطريقة الرفع." },
  },
  {
    slug: "your-application",
    title: { en: "Your application", ar: "طلبك" },
    description: { en: "Finishing your details, tracking progress and downloading your file.", ar: "إكمال بياناتك، ومتابعة التقدّم، وتنزيل ملفك." },
  },
  {
    slug: "visa-appointment",
    title: { en: "Visa centre appointment", ar: "موعد مركز التأشيرات" },
    description: { en: "Booking your appointment, what to bring and what happens after.", ar: "حجز موعدك، وما تحضره، وما يحدث بعده." },
  },
  {
    slug: "travel-insurance",
    title: { en: "Travel insurance", ar: "تأمين السفر" },
    description: { en: "What the embassy needs and your two options.", ar: "ما تطلبه السفارة وخياراك المتاحان." },
  },
  {
    slug: "account-and-sign-in",
    title: { en: "Account and sign-in", ar: "الحساب وتسجيل الدخول" },
    description: { en: "Creating an account, signing in and using the app.", ar: "إنشاء حساب، وتسجيل الدخول، واستخدام التطبيق." },
  },
  {
    slug: "refunds-and-cancellations",
    title: { en: "Refunds and cancellations", ar: "الاسترداد والإلغاء" },
    description: { en: "When the fee is refunded and how to ask.", ar: "متى تُسترد الرسوم وكيف تطلب ذلك." },
  },
]

export const HELP_ARTICLES: HelpArticle[] = [
  // ---------------------------------------------------------------- Getting started
  {
    slug: "what-ezvisa-does",
    topic: "getting-started",
    title: { en: "What does EZvisa do?", ar: "ماذا تقدّم إيزي فيزا؟" },
    summary: {
      en: "We prepare your Schengen visa application file so it is complete and consistent before you submit it.",
      ar: "نجهّز ملف طلب تأشيرة شنغن ليكون كاملًا ومتناسقًا قبل أن تقدّمه.",
    },
    body: {
      en: [
        "EZvisa prepares Schengen visa applications for people who live in the UAE. You answer a few questions and upload your documents, and a visa specialist prepares the rest of your file:",
        "- The completed Schengen application form",
        "- A cover letter for your trip",
        "- A day-by-day itinerary",
        "- A flight reservation and hotel reservations for your dates",
        "- A check of the documents you upload",
        "We are a private service. We are not an embassy, consulate or visa centre, and the decision on your visa is always the embassy's. We can't guarantee approval.",
      ],
      ar: [
        "تجهّز إيزي فيزا طلبات تأشيرة شنغن للمقيمين في الإمارات. تجيب عن بعض الأسئلة وترفع مستنداتك، ثم يجهّز مختص التأشيرات باقي ملفك:",
        "- نموذج طلب شنغن معبّأ",
        "- خطاب تغطية لرحلتك",
        "- برنامج رحلة يومي",
        "- حجز طيران وحجوزات فندق لتواريخ سفرك",
        "- مراجعة المستندات التي ترفعها",
        "نحن خدمة خاصة. لسنا سفارة ولا قنصلية ولا مركز تأشيرات، وقرار التأشيرة يعود دائمًا إلى السفارة. ولا نستطيع ضمان الموافقة.",
      ],
    },
  },
  {
    slug: "who-can-apply",
    topic: "getting-started",
    title: { en: "Who can use EZvisa?", ar: "من يمكنه استخدام إيزي فيزا؟" },
    summary: {
      en: "UAE residents whose passport needs a Schengen visa, for short stays of up to 90 days.",
      ar: "المقيمون في الإمارات الذين تحتاج جوازاتهم إلى تأشيرة شنغن، للإقامات القصيرة حتى 90 يومًا.",
    },
    body: {
      en: [
        "Whether you need a Schengen visa depends on your passport, not your residence. Holders of Indian, Egyptian, Jordanian, Pakistani and many other passports need one, even with a UAE residence visa or Golden Visa.",
        "UAE citizens don't need a Schengen visa for stays of up to 90 days.",
        "We prepare short-stay (Type C) applications for all 29 Schengen countries: up to 90 days in any 180-day period, for tourism and similar visits.",
      ],
      ar: [
        "حاجتك إلى تأشيرة شنغن تعتمد على جوازك، لا على إقامتك. يحتاج إليها حاملو الجوازات الهندية والمصرية والأردنية والباكستانية وكثير غيرها، حتى مع تأشيرة إقامة إماراتية أو إقامة ذهبية.",
        "لا يحتاج مواطنو الإمارات إلى تأشيرة شنغن للإقامات حتى 90 يومًا.",
        "نجهّز طلبات الإقامة القصيرة (الفئة C) لدول شنغن الـ29 كلها: حتى 90 يومًا خلال أي 180 يومًا، للسياحة والزيارات المشابهة.",
      ],
    },
  },
  {
    slug: "which-country-to-apply-to",
    topic: "getting-started",
    title: { en: "Which country should I apply to?", ar: "إلى أي دولة أقدّم الطلب؟" },
    summary: {
      en: "Apply to the country where you'll spend the most nights. If the nights are equal, apply to the one you enter first.",
      ar: "قدّم إلى الدولة التي ستقضي فيها أكبر عدد من الليالي. وإذا تساوت الليالي، فإلى الدولة التي تدخلها أولًا.",
    },
    body: {
      en: [
        "A Schengen visa lets you travel across all 29 Schengen countries, but you apply to one of them: your main destination.",
        "- Your main destination is the country where you'll spend the most nights.",
        "- If you'll spend the same number of nights in two or more countries, apply to the country you enter first.",
        "Choose that country as your destination when you start your application. Your itinerary and hotel reservations are prepared to match it.",
      ],
      ar: [
        "تتيح لك تأشيرة شنغن السفر بين دول شنغن الـ29 كلها، لكنك تقدّم الطلب إلى دولة واحدة: وجهتك الرئيسية.",
        "- وجهتك الرئيسية هي الدولة التي ستقضي فيها أكبر عدد من الليالي.",
        "- إذا تساوت الليالي في دولتين أو أكثر، فقدّم إلى الدولة التي تدخلها أولًا.",
        "اختر هذه الدولة وجهةً لك عند بدء الطلب. ونجهّز برنامج الرحلة وحجوزات الفندق بما يتوافق معها.",
      ],
    },
  },
  {
    slug: "when-to-apply",
    topic: "getting-started",
    title: { en: "How early should I apply?", ar: "متى يجب أن أبدأ التقديم؟" },
    summary: {
      en: "You can submit up to 6 months before you travel and no later than 15 days before. Starting 6 to 8 weeks ahead is safest.",
      ar: "يمكنك التقديم قبل السفر بمدة تصل إلى 6 أشهر وبما لا يقل عن 15 يومًا. والأفضل أن تبدأ قبل 6 إلى 8 أسابيع.",
    },
    body: {
      en: [
        "Embassies accept applications up to 6 months before your departure date and no later than 15 days before it.",
        "Visa centre appointments fill up quickly before the summer and winter holidays, so we recommend starting 6 to 8 weeks before you travel.",
        "Our part takes 1–2 days once we have your complete details and documents. The embassy's decision usually takes around 15 calendar days and can take up to 45 in busy periods.",
      ],
      ar: [
        "تقبل السفارات الطلبات قبل تاريخ السفر بمدة تصل إلى 6 أشهر، وبما لا يقل عن 15 يومًا.",
        "تمتلئ مواعيد مراكز التأشيرات بسرعة قبل عطلتي الصيف والشتاء، لذا ننصح بالبدء قبل السفر بـ6 إلى 8 أسابيع.",
        "يستغرق جزؤنا يومًا إلى يومين بعد استلام بياناتك ومستنداتك كاملة. أما قرار السفارة فيستغرق عادة نحو 15 يومًا تقويميًا، وقد يمتد إلى 45 يومًا في فترات الذروة.",
      ],
    },
  },
  {
    slug: "how-long-it-takes",
    topic: "getting-started",
    title: { en: "How long does it take?", ar: "كم يستغرق الأمر؟" },
    summary: {
      en: "We prepare your file in 1–2 days after receiving your complete details and documents. The embassy's decision takes longer.",
      ar: "نجهّز ملفك خلال يوم إلى يومين بعد استلام بياناتك ومستنداتك كاملة. أما قرار السفارة فيستغرق وقتًا أطول.",
    },
    body: {
      en: [
        "There are three parts to the timeline:",
        "- Preparing your file: 1–2 days after we have your complete details and documents.",
        "- Your visa centre appointment: depends on availability at the centre for your destination.",
        "- The embassy's decision: usually around 15 calendar days after your appointment, up to 45 in busy periods.",
        "Missing or unclear documents are the most common reason our part takes longer. Upload everything listed in your application to avoid delays.",
      ],
      ar: [
        "للمدة ثلاثة أجزاء:",
        "- تجهيز ملفك: يوم إلى يومان بعد استلام بياناتك ومستنداتك كاملة.",
        "- موعدك في مركز التأشيرات: يعتمد على المواعيد المتاحة في مركز وجهتك.",
        "- قرار السفارة: عادة نحو 15 يومًا تقويميًا بعد موعدك، وقد يصل إلى 45 يومًا في فترات الذروة.",
        "المستندات الناقصة أو غير الواضحة هي السبب الأكثر شيوعًا لتأخر جزئنا. ارفع كل ما هو مطلوب في طلبك لتجنّب التأخير.",
      ],
    },
  },

  // ---------------------------------------------------------------- Pricing and payment
  {
    slug: "what-it-costs",
    topic: "pricing-and-payment",
    title: { en: "How much does EZvisa cost?", ar: "كم تكلفة إيزي فيزا؟" },
    summary: {
      en: `${PRICE_AED} AED per application, or ${SPOUSE} AED when your spouse travels with you.`,
      ar: `${PRICE_AED} درهم لكل طلب، أو ${SPOUSE} درهم عندما يسافر معك الزوج أو الزوجة.`,
    },
    body: {
      en: [
        `Our service fee is ${PRICE_AED} AED per application. If your spouse travels with you, we prepare both applications together for ${SPOUSE} AED.`,
        "The fee covers everything we prepare: the application form, cover letter, itinerary, flight and hotel reservations, a document check by a visa specialist, and support until your appointment.",
        "You pay once, when you start. EZvisa is not VAT-registered, so the price shown is final. Embassy fees, visa centre charges and travel insurance are separate. See [what's not included](/help/pricing-and-payment/what-is-not-included).",
      ],
      ar: [
        `رسوم خدمتنا ${PRICE_AED} درهم لكل طلب. وإذا كان الزوج أو الزوجة مسافرًا معك، نجهّز الطلبين معًا مقابل ${SPOUSE} درهم.`,
        "تغطي الرسوم كل ما نجهّزه: نموذج الطلب، وخطاب التغطية، وبرنامج الرحلة، وحجوزات الطيران والفندق، ومراجعة المستندات من مختص تأشيرات، والدعم حتى موعدك.",
        "تدفع مرة واحدة عند البدء. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة، لذا فالسعر المعروض نهائي. رسوم السفارة ورسوم مركز التأشيرات وتأمين السفر منفصلة. اطّلع على [ما لا تشمله الرسوم](/help/pricing-and-payment/what-is-not-included).",
      ],
    },
  },
  {
    slug: "what-is-not-included",
    topic: "pricing-and-payment",
    title: { en: "What isn't included in the fee?", ar: "ما الذي لا تشمله الرسوم؟" },
    summary: {
      en: "Embassy visa fees, visa centre charges and travel insurance are paid separately.",
      ar: "رسوم تأشيرة السفارة ورسوم مركز التأشيرات وتأمين السفر تُدفع بشكل منفصل.",
    },
    body: {
      en: [
        "These costs go to the embassy, the visa centre or the insurer, not to us:",
        "- Embassy visa fee: the standard fee is €90 for adults and €45 for children aged 6–11. Children under 6 pay no visa fee, and some exemptions apply.",
        "- Visa centre service charge: set by VFS Global, BLS International or TLScontact, depending on the country.",
        "- Travel insurance: required by every embassy. Buy it through us as an extra, or provide your own policy.",
        "- Translation, attestation or courier: only needed for some documents. We'll tell you if any apply to you.",
        "Follow the visa centre's instructions for when and how to pay its fees.",
      ],
      ar: [
        "تذهب هذه التكاليف إلى السفارة أو مركز التأشيرات أو شركة التأمين، لا إلينا:",
        "- رسوم تأشيرة السفارة: الرسوم المعتادة 90 يورو للبالغين و45 يورو للأطفال من 6 إلى 11 عامًا. لا يدفع الأطفال دون 6 أعوام رسوم تأشيرة، وتنطبق بعض الإعفاءات.",
        "- رسوم خدمة مركز التأشيرات: تحددها VFS Global أو BLS International أو TLScontact حسب الدولة.",
        "- تأمين السفر: تطلبه كل السفارات. اشتره عبرنا كخدمة إضافية، أو قدّم وثيقتك الخاصة.",
        "- الترجمة أو التصديق أو التوصيل: مطلوبة لبعض المستندات فقط. سنخبرك إن كان أي منها ينطبق عليك.",
        "اتبع تعليمات مركز التأشيرات بشأن موعد دفع رسومه وطريقته.",
      ],
    },
  },
  {
    slug: "payment-methods",
    topic: "pricing-and-payment",
    title: { en: "How can I pay?", ar: "كيف يمكنني الدفع؟" },
    summary: {
      en: "By card, Apple Pay or Google Pay, through a secure payment gateway.",
      ar: "بالبطاقة أو Apple Pay أو Google Pay، عبر بوابة دفع آمنة.",
    },
    body: {
      en: [
        "You pay at the end of the application, after you've reviewed your details. The payment opens in a secure payment gateway, where you can pay by debit or credit card, Apple Pay or Google Pay.",
        "We never see or store your card details.",
        "After payment you return to EZvisa to finish your application. Your receipt is in your account.",
      ],
      ar: [
        "تدفع في نهاية الطلب بعد مراجعة بياناتك. تُفتح عملية الدفع في بوابة دفع آمنة، ويمكنك الدفع ببطاقة خصم أو ائتمان أو Apple Pay أو Google Pay.",
        "لا نطّلع على بيانات بطاقتك ولا نحتفظ بها.",
        "بعد الدفع تعود إلى إيزي فيزا لإكمال طلبك. وتجد إيصالك في حسابك.",
      ],
    },
  },
  {
    slug: "payment-did-not-go-through",
    topic: "pricing-and-payment",
    title: { en: "My payment didn't go through", ar: "لم تتم عملية الدفع" },
    summary: {
      en: "Your answers are saved. Try again from the payment page, or message us with your EZ reference if you were charged.",
      ar: "إجاباتك محفوظة. أعد المحاولة من صفحة الدفع، أو راسلنا مع مرجع EZ إذا خُصم المبلغ.",
    },
    body: {
      en: [
        "If the payment page shows an error or you closed it before finishing, your application is still saved. Open it again and retry the payment.",
        "If your bank shows a charge but your application still says unpaid, don't pay again. Message us on WhatsApp with your EZ- reference and we'll check it with the payment gateway.",
        "If you were charged twice for the same application, the duplicate payment is always refunded in full.",
      ],
      ar: [
        "إذا ظهر خطأ في صفحة الدفع أو أغلقتها قبل الإتمام، فطلبك ما زال محفوظًا. افتحه مرة أخرى وأعد محاولة الدفع.",
        "إذا ظهر خصم في حسابك البنكي وما زال طلبك غير مدفوع، فلا تدفع مرة أخرى. راسلنا عبر واتساب مع مرجع EZ- وسنتحقق منه مع بوابة الدفع.",
        "إذا خُصمت الرسوم مرتين عن الطلب نفسه، فإن الدفعة المكررة تُسترد كاملة دائمًا.",
      ],
    },
  },
  {
    slug: "receipt",
    topic: "pricing-and-payment",
    title: { en: "Where can I find my receipt?", ar: "أين أجد إيصالي؟" },
    summary: {
      en: "Open your application in your account and choose Receipt. You can download it as a PDF.",
      ar: "افتح طلبك في حسابك واختر الإيصال. ويمكنك تنزيله بصيغة PDF.",
    },
    body: {
      en: [
        "Sign in, open your application from [My applications](/dashboard) and choose Receipt. It shows the amount, the date and your EZ- reference, and you can download it as a PDF.",
        "EZvisa is not VAT-registered, so the receipt shows no VAT.",
      ],
      ar: [
        "سجّل الدخول، وافتح طلبك من [طلباتي](/dashboard) واختر الإيصال. يعرض المبلغ والتاريخ ومرجع EZ-، ويمكنك تنزيله بصيغة PDF.",
        "إيزي فيزا غير مسجّلة لضريبة القيمة المضافة، لذا لا يتضمن الإيصال ضريبة.",
      ],
    },
  },

  // ---------------------------------------------------------------- Documents and uploads
  {
    slug: "documents-you-need",
    topic: "documents-and-uploads",
    title: { en: "Which documents do I need to provide?", ar: "ما المستندات التي يجب أن أقدّمها؟" },
    summary: {
      en: "Your passport, UAE residence visa and Emirates ID, a photo, bank statements, and a salary certificate or NOC if you're employed.",
      ar: "جواز سفرك، وتأشيرة الإقامة والهوية الإماراتية، وصورة، وكشوف حساب، وشهادة راتب أو عدم ممانعة إذا كنت موظفًا.",
    },
    body: {
      en: [
        "Every Schengen country asks UAE residents for the same core documents:",
        "- Passport bio page: a clear colour copy. The passport should be valid for at least 3 months after you return.",
        "- UAE residence visa and Emirates ID: valid for at least 3 months after you return.",
        "- A recent photo with a white background.",
        "- Bank statements for the last 3–6 months, stamped by the bank.",
        "- A salary certificate or NOC from your employer, if you're employed.",
        "- Travel insurance with at least €30,000 medical cover. Buy it through us or provide your own.",
        "Some situations need extra documents, such as being self-employed or having someone else pay for the trip. See the [documents for your country](/documents) and we'll confirm what applies to you.",
      ],
      ar: [
        "تطلب كل دول شنغن من المقيمين في الإمارات المستندات الأساسية نفسها:",
        "- صفحة بيانات الجواز: نسخة ملونة واضحة. ويجب أن يكون الجواز ساريًا 3 أشهر على الأقل بعد عودتك.",
        "- تأشيرة الإقامة الإماراتية والهوية الإماراتية: ساريتان 3 أشهر على الأقل بعد عودتك.",
        "- صورة حديثة بخلفية بيضاء.",
        "- كشوف حساب بنكية لآخر 3 إلى 6 أشهر، مختومة من البنك.",
        "- شهادة راتب أو شهادة عدم ممانعة من صاحب العمل، إذا كنت موظفًا.",
        "- تأمين سفر بتغطية طبية لا تقل عن 30,000 يورو. اشتره عبرنا أو قدّم وثيقتك.",
        "تتطلب بعض الحالات مستندات إضافية، مثل العمل الحر أو تحمّل شخص آخر نفقات الرحلة. اطّلع على [مستندات دولتك](/documents) وسنؤكد لك ما ينطبق عليك.",
      ],
    },
  },
  {
    slug: "how-to-upload",
    topic: "documents-and-uploads",
    title: { en: "How do I upload my documents?", ar: "كيف أرفع مستنداتي؟" },
    summary: {
      en: `Upload each document in its box in your account or the EZvisa app. PDF, JPG or PNG, up to ${UPLOAD_MB} MB each.`,
      ar: `ارفع كل مستند في خانته في حسابك أو في تطبيق إيزي فيزا. بصيغة PDF أو JPG أو PNG، وبحجم حتى ${UPLOAD_MB} ميغابايت لكل ملف.`,
    },
    body: {
      en: [
        "After payment, open your application in [My applications](/dashboard) or in the EZvisa app. Each document has its own box: choose Upload, or drag the file onto the box.",
        `Files can be PDF, JPG or PNG, up to ${UPLOAD_MB} MB each. A photo from your phone is fine if it's sharp, well lit and shows the whole page.`,
        "You can replace a file at any time before your file is prepared. Each box shows when its document has been received.",
      ],
      ar: [
        "بعد الدفع، افتح طلبك من [طلباتي](/dashboard) أو في تطبيق إيزي فيزا. لكل مستند خانة خاصة: اختر رفع، أو اسحب الملف إلى الخانة.",
        `يمكن أن تكون الملفات بصيغة PDF أو JPG أو PNG، بحجم حتى ${UPLOAD_MB} ميغابايت لكل ملف. صورة من هاتفك مقبولة إذا كانت واضحة وجيدة الإضاءة وتُظهر الصفحة كاملة.`,
        "يمكنك استبدال أي ملف في أي وقت قبل تجهيز ملفك. وتُظهر كل خانة متى استُلم مستندها.",
      ],
    },
  },
  {
    slug: "send-documents-on-whatsapp",
    topic: "documents-and-uploads",
    title: { en: "Can I send my documents on WhatsApp or email?", ar: "هل يمكنني إرسال مستنداتي عبر واتساب أو البريد؟" },
    summary: {
      en: "No. Upload them on the website or in the app, so they're stored securely with your application.",
      ar: "لا. ارفعها على الموقع أو في التطبيق، لتُحفظ بأمان مع طلبك.",
    },
    body: {
      en: [
        "Please upload documents only on the website or in the EZvisa app. Uploads are stored privately with your application, and the specialist preparing your file sees them in one place.",
        "Documents sent on WhatsApp or by email can't be attached to your application. If an upload isn't working, message us and we'll help you fix it.",
      ],
      ar: [
        "يُرجى رفع المستندات على الموقع أو في تطبيق إيزي فيزا فقط. تُحفظ الملفات المرفوعة بشكل خاص مع طلبك، ويجدها المختص الذي يجهّز ملفك في مكان واحد.",
        "لا يمكن إرفاق المستندات المرسلة عبر واتساب أو البريد بطلبك. وإذا تعذّر الرفع، راسلنا وسنساعدك في حل المشكلة.",
      ],
    },
  },
  {
    slug: "bank-statements",
    topic: "documents-and-uploads",
    title: { en: "What should my bank statements show?", ar: "ماذا يجب أن تُظهر كشوف حسابي؟" },
    summary: {
      en: "The last 3–6 months, stamped by the bank, with enough money for your trip.",
      ar: "آخر 3 إلى 6 أشهر، مختومة من البنك، مع رصيد كافٍ لرحلتك.",
    },
    body: {
      en: [
        "Upload statements for the last 3–6 months from the account you'll use for the trip. They should be stamped by the bank or downloadable as an official statement.",
        "Each country sets a minimum amount of money per day of your stay. Use the [bank balance calculator](/tools/bank-balance-calculator) to estimate it for your destination and trip length.",
        "Regular salary deposits and a stable balance are easier for an embassy to read than a large deposit just before you apply.",
      ],
      ar: [
        "ارفع كشوف آخر 3 إلى 6 أشهر من الحساب الذي ستستخدمه في الرحلة. ويجب أن تكون مختومة من البنك أو كشوفًا رسمية قابلة للتنزيل.",
        "تحدد كل دولة حدًا أدنى من المال لكل يوم من إقامتك. استخدم [حاسبة الرصيد البنكي](/tools/bank-balance-calculator) لتقديره حسب وجهتك ومدة رحلتك.",
        "الإيداعات المنتظمة للراتب والرصيد المستقر أوضح للسفارة من إيداع كبير قبل التقديم مباشرة.",
      ],
    },
  },
  {
    slug: "not-employed",
    topic: "documents-and-uploads",
    title: { en: "I'm self-employed, a business owner or not working", ar: "أعمل لحسابي أو أملك نشاطًا تجاريًا أو لا أعمل" },
    summary: {
      en: "You don't need an NOC. Business owners provide a trade licence; if someone else pays, they provide a sponsorship letter.",
      ar: "لا تحتاج إلى شهادة عدم ممانعة. يقدّم أصحاب الأعمال الرخصة التجارية، وإذا كان شخص آخر يتحمّل النفقات فيقدّم خطاب كفالة.",
    },
    body: {
      en: [
        "The salary certificate or NOC is only for employees. Instead:",
        "- Self-employed or business owner: your trade licence and company bank statements.",
        "- Someone else pays for the trip, such as a spouse or parent: a sponsorship letter with the sponsor's passport, residence visa and bank statements.",
        "Answer the employment questions when you finish your application and we'll tell you exactly which documents to upload.",
      ],
      ar: [
        "شهادة الراتب أو عدم الممانعة مطلوبة من الموظفين فقط. وبدلًا منها:",
        "- العمل الحر أو صاحب النشاط التجاري: الرخصة التجارية وكشوف حساب الشركة.",
        "- إذا كان شخص آخر يتحمّل نفقات الرحلة، كالزوج أو أحد الوالدين: خطاب كفالة مع جواز الكفيل وتأشيرة إقامته وكشوف حسابه.",
        "أجب عن أسئلة العمل عند إكمال طلبك، وسنخبرك بالمستندات التي تحتاج إلى رفعها بالتحديد.",
      ],
    },
  },
  {
    slug: "what-we-prepare",
    topic: "documents-and-uploads",
    title: { en: "Which documents does EZvisa prepare?", ar: "ما المستندات التي تجهّزها إيزي فيزا؟" },
    summary: {
      en: "The application form, cover letter, itinerary, and flight and hotel reservations.",
      ar: "نموذج الطلب، وخطاب التغطية، وبرنامج الرحلة، وحجوزات الطيران والفندق.",
    },
    body: {
      en: [
        "We prepare the documents that have to be written or booked for your trip:",
        "- The Schengen application form, filled in from your answers",
        "- A cover letter explaining your trip, for you to sign",
        "- A day-by-day itinerary that matches your dates",
        "- A flight reservation for the visa, so you don't buy a ticket before your visa is issued",
        "- Hotel reservations covering every night of your stay",
        "We also check that these and the documents you upload are consistent: names, dates, destinations and employment details.",
      ],
      ar: [
        "نجهّز المستندات التي يجب كتابتها أو حجزها لرحلتك:",
        "- نموذج طلب شنغن، معبّأ من إجاباتك",
        "- خطاب تغطية يشرح رحلتك، لتوقّعه أنت",
        "- برنامج رحلة يومي يطابق تواريخك",
        "- حجز طيران للتأشيرة، حتى لا تشتري تذكرة قبل صدور تأشيرتك",
        "- حجوزات فندق تغطي كل ليلة من إقامتك",
        "ونتأكد أيضًا من تطابق هذه المستندات مع ما ترفعه: الأسماء والتواريخ والوجهات وبيانات العمل.",
      ],
    },
  },

  // ---------------------------------------------------------------- Your application
  {
    slug: "after-you-pay",
    topic: "your-application",
    title: { en: "What happens after I pay?", ar: "ماذا يحدث بعد الدفع؟" },
    summary: {
      en: "You finish your details, upload your documents, and we prepare your file within 1–2 days.",
      ar: "تكمل بياناتك وترفع مستنداتك، ونجهّز ملفك خلال يوم إلى يومين.",
    },
    body: {
      en: [
        "- You get an EZ- reference and your application appears in your account and the EZvisa app.",
        "- You finish your application: travel dates, accommodation plans, passport and employment details. It takes about 10 minutes and saves as you go.",
        "- You upload your documents.",
        "- A visa specialist reviews them and prepares your file within 1–2 days.",
        "- You download your file, book your visa centre appointment and submit your application there.",
      ],
      ar: [
        "- تحصل على مرجع EZ- ويظهر طلبك في حسابك وفي تطبيق إيزي فيزا.",
        "- تكمل طلبك: تواريخ السفر، وخطط الإقامة، وبيانات الجواز والعمل. يستغرق ذلك نحو 10 دقائق ويُحفظ تلقائيًا.",
        "- ترفع مستنداتك.",
        "- يراجعها مختص التأشيرات ويجهّز ملفك خلال يوم إلى يومين.",
        "- تنزّل ملفك، وتحجز موعدك في مركز التأشيرات، وتقدّم طلبك هناك.",
      ],
    },
  },
  {
    slug: "finish-your-application",
    topic: "your-application",
    title: { en: "Finishing your application after payment", ar: "إكمال طلبك بعد الدفع" },
    summary: {
      en: "Trip, passport, spouse and employment questions come after payment. Your answers save automatically.",
      ar: "تأتي أسئلة الرحلة والجواز والزوج والعمل بعد الدفع. وتُحفظ إجاباتك تلقائيًا.",
    },
    body: {
      en: [
        "Before payment we only ask for your destination, nationality and traveller details. The rest comes after payment, from Continue application in your account:",
        "- Trip details: dates, cities and where you'll stay",
        "- Passport details, if you haven't added them",
        "- Your spouse's details, if they're travelling with you",
        "- Employment details",
        "You can stop at any point and pick up where you left off, on the website or in the app.",
      ],
      ar: [
        "قبل الدفع نسأل فقط عن وجهتك وجنسيتك وبيانات المسافر. أما الباقي فيأتي بعد الدفع، من خيار إكمال الطلب في حسابك:",
        "- تفاصيل الرحلة: التواريخ والمدن ومكان الإقامة",
        "- بيانات الجواز، إذا لم تضفها بعد",
        "- بيانات الزوج أو الزوجة، إذا كان مسافرًا معك",
        "- بيانات العمل",
        "يمكنك التوقف في أي وقت والمتابعة من حيث توقفت، على الموقع أو في التطبيق.",
      ],
    },
  },
  {
    slug: "track-your-application",
    topic: "your-application",
    title: { en: "How do I track my application?", ar: "كيف أتابع طلبي؟" },
    summary: {
      en: "Sign in with the email you applied with and open My applications, or use the EZvisa app.",
      ar: "سجّل الدخول بالبريد الذي قدّمت به وافتح طلباتي، أو استخدم تطبيق إيزي فيزا.",
    },
    body: {
      en: [
        "Sign in with the same email address you used in your application and open [My applications](/dashboard). Each application shows its status, what's needed from you next, and your documents.",
        "The EZvisa app shows the same applications with the same account.",
        "Your EZ- reference identifies your application. Include it whenever you contact us.",
      ],
      ar: [
        "سجّل الدخول بالبريد الإلكتروني نفسه الذي استخدمته في طلبك، وافتح [طلباتي](/dashboard). يعرض كل طلب حالته، وما المطلوب منك بعد ذلك، ومستنداتك.",
        "يعرض تطبيق إيزي فيزا الطلبات نفسها بالحساب نفسه.",
        "مرجع EZ- يعرّف طلبك. اذكره كلما تواصلت معنا.",
      ],
    },
  },
  {
    slug: "download-your-file",
    topic: "your-application",
    title: { en: "Downloading your prepared file", ar: "تنزيل ملفك الجاهز" },
    summary: {
      en: "When your file is ready, download it from your application, print it and take it to your appointment.",
      ar: "عندما يصبح ملفك جاهزًا، نزّله من طلبك واطبعه وخذه إلى موعدك.",
    },
    body: {
      en: [
        "When your application shows File ready, open it in [My applications](/dashboard) or the app and download your file.",
        "Read it through and check your name, passport number and dates. If anything is wrong, message us before your appointment and we'll correct documents we prepared free of charge.",
        "Print the file and sign the application form and cover letter where marked.",
      ],
      ar: [
        "عندما يُظهر طلبك أن الملف جاهز، افتحه من [طلباتي](/dashboard) أو من التطبيق ونزّل ملفك.",
        "اقرأه كاملًا وتحقق من اسمك ورقم جوازك والتواريخ. إذا وجدت أي خطأ، راسلنا قبل موعدك وسنصحح المستندات التي جهّزناها مجانًا.",
        "اطبع الملف ووقّع نموذج الطلب وخطاب التغطية في الأماكن المحددة.",
      ],
    },
  },
  {
    slug: "change-your-details",
    topic: "your-application",
    title: { en: "I need to change something in my application", ar: "أحتاج إلى تعديل شيء في طلبي" },
    summary: {
      en: "Message us with your EZ reference. Changes are simplest before your file is prepared.",
      ar: "راسلنا مع مرجع EZ. التعديل أسهل قبل تجهيز ملفك.",
    },
    body: {
      en: [
        "If your travel dates, destination or personal details change, message us on WhatsApp with your EZ- reference and what has changed.",
        "Changes are simplest before preparation starts. After your file is prepared we correct our own mistakes free of charge; a change of destination or dates may need a new application.",
      ],
      ar: [
        "إذا تغيّرت تواريخ سفرك أو وجهتك أو بياناتك الشخصية، راسلنا عبر واتساب مع مرجع EZ- وما الذي تغيّر.",
        "التعديل أسهل قبل بدء التجهيز. وبعد تجهيز ملفك نصحح أخطاءنا مجانًا، أما تغيير الوجهة أو التواريخ فقد يتطلب طلبًا جديدًا.",
      ],
    },
  },
  {
    slug: "travelling-with-your-spouse",
    topic: "your-application",
    title: { en: "Applying with your spouse", ar: "التقديم مع الزوج أو الزوجة" },
    summary: {
      en: `We prepare both applications together for ${SPOUSE} AED. Your spouse's details are asked after payment.`,
      ar: `نجهّز الطلبين معًا مقابل ${SPOUSE} درهم. ونسأل عن بيانات الزوج أو الزوجة بعد الدفع.`,
    },
    body: {
      en: [
        `If your spouse is travelling with you, choose that in the application. The fee for both is ${SPOUSE} AED, and we prepare matching files so your trips line up.`,
        "After payment you'll add your spouse's details in Continue application. Each of you uploads your own passport, residence visa, photo and supporting documents.",
        "If a sponsor covers the trip, add a marriage certificate. It may need attestation and an English translation.",
      ],
      ar: [
        `إذا كان الزوج أو الزوجة مسافرًا معك، فاختر ذلك في الطلب. الرسوم للاثنين ${SPOUSE} درهم، ونجهّز ملفين متطابقين لتتوافق رحلتاكما.`,
        "بعد الدفع تضيف بيانات الزوج أو الزوجة في إكمال الطلب. ويرفع كل منكما جوازه وتأشيرة إقامته وصورته ومستنداته الداعمة.",
        "إذا كان أحدكما يكفل الآخر، فأضف عقد الزواج. وقد يحتاج إلى تصديق وترجمة إلى الإنجليزية.",
      ],
    },
  },

  // ---------------------------------------------------------------- Visa appointment
  {
    slug: "booking-your-appointment",
    topic: "visa-appointment",
    title: { en: "Booking your visa centre appointment", ar: "حجز موعدك في مركز التأشيرات" },
    summary: {
      en: "You book with the visa centre for your destination. You can also ask our team to try to find you a slot, as a separate paid service.",
      ar: "تحجز لدى مركز التأشيرات الخاص بوجهتك. ويمكنك أيضًا أن تطلب من فريقنا محاولة إيجاد موعد لك، كخدمة مدفوعة منفصلة.",
    },
    body: {
      en: [
        "Each Schengen country uses a visa centre in Dubai and Abu Dhabi: VFS Global, BLS International or TLScontact. You book your appointment on that centre's website.",
        "After you download your file, the Appointment step in your application lets you:",
        "- Add the appointment you've booked: date, time, centre and reference",
        "- Ask our team for help getting one. This is an additional paid service, and our team confirms the price with you first.",
        "- Come back to it later",
        "The visa centre for each country is listed on its [documents page](/documents).",
      ],
      ar: [
        "تستخدم كل دولة من دول شنغن مركز تأشيرات في دبي وأبوظبي: VFS Global أو BLS International أو TLScontact. وتحجز موعدك على موقع ذلك المركز.",
        "بعد تنزيل ملفك، تتيح لك خطوة الموعد في طلبك:",
        "- إضافة الموعد الذي حجزته: التاريخ والوقت والمركز والمرجع",
        "- طلب مساعدة فريقنا في الحصول على موعد. هذه خدمة إضافية مدفوعة، ويؤكد فريقنا السعر معك أولًا.",
        "- العودة إليها لاحقًا",
        "مركز التأشيرات الخاص بكل دولة مذكور في [صفحة مستنداتها](/documents).",
      ],
    },
  },
  {
    slug: "at-your-appointment",
    topic: "visa-appointment",
    title: { en: "What to bring to your appointment", ar: "ما الذي تحضره إلى موعدك" },
    summary: {
      en: "Your printed, signed file, your original passport and Emirates ID, and the fees the centre asks for.",
      ar: "ملفك مطبوعًا وموقّعًا، وجواز سفرك الأصلي وهويتك الإماراتية، والرسوم التي يطلبها المركز.",
    },
    body: {
      en: [
        "- Your prepared file, printed, with the application form and cover letter signed",
        "- Your original passport and Emirates ID",
        "- The documents you uploaded, printed",
        "- Your travel insurance certificate",
        "- Your appointment confirmation",
        "At the centre you hand in your file, pay the embassy fee and the centre's charge, and give your fingerprints and photo (unless you gave them for a Schengen visa in the last 59 months).",
      ],
      ar: [
        "- ملفك الجاهز مطبوعًا، مع توقيع نموذج الطلب وخطاب التغطية",
        "- جواز سفرك الأصلي وهويتك الإماراتية",
        "- المستندات التي رفعتها، مطبوعة",
        "- شهادة تأمين السفر",
        "- تأكيد موعدك",
        "في المركز تسلّم ملفك، وتدفع رسوم السفارة ورسوم المركز، وتسجّل بصماتك وصورتك (إلا إذا سجّلتها لتأشيرة شنغن خلال آخر 59 شهرًا).",
      ],
    },
  },
  {
    slug: "after-the-decision",
    topic: "visa-appointment",
    title: { en: "After the embassy decides", ar: "بعد قرار السفارة" },
    summary: {
      en: "The visa centre tells you when your passport is ready to collect. If the visa is refused, message us and we'll go through the letter with you.",
      ar: "يبلغك مركز التأشيرات عندما يصبح جوازك جاهزًا للاستلام. وإذا رُفضت التأشيرة، راسلنا وسنراجع خطاب الرفض معك.",
    },
    body: {
      en: [
        "Decisions usually come within 15 calendar days of your appointment, and can take up to 45 in busy periods. The visa centre tells you when your passport is ready to collect or be delivered.",
        "Check the visa in your passport: your name, the dates it's valid and the number of days allowed.",
        "If your visa is refused, the refusal letter gives the reason. Message us and a visa specialist will go through it with you and explain your options, including applying again. See [visa refusals and refunds](/help/refunds-and-cancellations/visa-refused).",
      ],
      ar: [
        "تصدر القرارات عادة خلال 15 يومًا تقويميًا من موعدك، وقد تمتد إلى 45 يومًا في فترات الذروة. ويبلغك مركز التأشيرات عندما يصبح جوازك جاهزًا للاستلام أو التوصيل.",
        "تحقق من التأشيرة في جوازك: اسمك، وتواريخ سريانها، وعدد الأيام المسموح بها.",
        "إذا رُفضت تأشيرتك، يوضح خطاب الرفض السبب. راسلنا وسيراجعه معك مختص تأشيرات ويشرح خياراتك، بما فيها التقديم من جديد. اطّلع على [رفض التأشيرة والاسترداد](/help/refunds-and-cancellations/visa-refused).",
      ],
    },
  },

  // ---------------------------------------------------------------- Travel insurance
  {
    slug: "do-i-need-insurance",
    topic: "travel-insurance",
    title: { en: "Do I need travel insurance?", ar: "هل أحتاج إلى تأمين سفر؟" },
    summary: {
      en: "Yes. Every Schengen embassy asks for medical cover of at least €30,000 for your whole trip.",
      ar: "نعم. تطلب كل سفارات شنغن تغطية طبية لا تقل عن 30,000 يورو لكامل رحلتك.",
    },
    body: {
      en: [
        "Your policy needs to:",
        "- Cover medical costs and repatriation of at least €30,000",
        "- Be valid in all Schengen countries",
        "- Cover every day of your trip",
        "Travel insurance isn't included in our service fee. You can buy a policy through us as an extra, or provide your own. See [your insurance options](/help/travel-insurance/insurance-options).",
      ],
      ar: [
        "يجب أن تكون وثيقتك:",
        "- تغطي التكاليف الطبية والإعادة إلى الوطن بما لا يقل عن 30,000 يورو",
        "- سارية في كل دول شنغن",
        "- تغطي كل أيام رحلتك",
        "تأمين السفر غير مشمول في رسوم خدمتنا. يمكنك شراء وثيقة عبرنا كخدمة إضافية، أو تقديم وثيقتك الخاصة. اطّلع على [خيارات التأمين](/help/travel-insurance/insurance-options).",
      ],
    },
  },
  {
    slug: "insurance-options",
    topic: "travel-insurance",
    title: { en: "Getting insurance through EZvisa or using your own", ar: "الحصول على التأمين عبر إيزي فيزا أو استخدام وثيقتك" },
    summary: {
      en: "After payment, choose in your application: ask us for a separate quote, or provide your own policy.",
      ar: "بعد الدفع، اختر في طلبك: اطلب منا عرض سعر منفصلًا، أو قدّم وثيقتك الخاصة.",
    },
    body: {
      en: [
        "Once your application is paid, the Insurance step in your application gives you two choices:",
        "- Buy insurance through EZvisa: we send you a quote. It's priced separately and doesn't change your service fee.",
        "- I'll provide my own: buy a policy that meets the embassy's requirements and bring the certificate to your appointment.",
        "Choosing an option doesn't buy a policy or confirm cover. With a quote, your cover starts only after you accept and pay for it.",
      ],
      ar: [
        "بعد دفع طلبك، تعرض لك خطوة التأمين في طلبك خيارين:",
        "- شراء التأمين عبر إيزي فيزا: نرسل لك عرض سعر. يُسعَّر بشكل منفصل ولا يغيّر رسوم خدمتك.",
        "- سأقدّم وثيقتي: اشترِ وثيقة تستوفي متطلبات السفارة وأحضر شهادتها إلى موعدك.",
        "اختيار أحد الخيارين لا يشتري وثيقة ولا يؤكد التغطية. وفي حالة عرض السعر، تبدأ التغطية فقط بعد موافقتك ودفعك.",
      ],
    },
  },

  // ---------------------------------------------------------------- Account and sign-in
  {
    slug: "create-an-account",
    topic: "account-and-sign-in",
    title: { en: "Creating an account", ar: "إنشاء حساب" },
    summary: {
      en: "Sign up with your email or Google. Account holders must be 18 or older.",
      ar: "سجّل باستخدام بريدك الإلكتروني أو Google. يجب أن يكون صاحب الحساب في 18 من عمره أو أكثر.",
    },
    body: {
      en: [
        "[Create an account](/signup) with your email and a password, or continue with Google. We ask for your name and date of birth, and you confirm you're 18 or older.",
        "Use the same email address as your application, so your applications appear in your account automatically.",
        "Travellers you've applied for are saved in your account, so you can reuse their details next time.",
      ],
      ar: [
        "[أنشئ حسابًا](/signup) ببريدك الإلكتروني وكلمة مرور، أو تابع باستخدام Google. نسألك عن اسمك وتاريخ ميلادك، وتؤكد أن عمرك 18 عامًا أو أكثر.",
        "استخدم البريد الإلكتروني نفسه الذي في طلبك، لتظهر طلباتك في حسابك تلقائيًا.",
        "يُحفظ المسافرون الذين قدّمت لهم في حسابك، لتستخدم بياناتهم مرة أخرى لاحقًا.",
      ],
    },
  },
  {
    slug: "cant-sign-in",
    topic: "account-and-sign-in",
    title: { en: "I can't sign in", ar: "لا أستطيع تسجيل الدخول" },
    summary: {
      en: "Use the email from your application, try an email sign-in link, or reset your password.",
      ar: "استخدم البريد الذي في طلبك، أو جرّب رابط تسجيل الدخول بالبريد، أو أعد تعيين كلمة المرور.",
    },
    body: {
      en: [
        "- Check you're using the same email address as your application.",
        "- On the [sign-in page](/login), choose Email link to get a one-time sign-in link, no password needed.",
        "- Forgot your password? [Reset it](/forgot-password) and follow the link in the email.",
        "- Signed up with Google? Use Continue with Google instead of a password.",
        "Sign-in emails can take a few minutes. Check your spam or promotions folder. If you still can't get in, message us on WhatsApp.",
      ],
      ar: [
        "- تأكد أنك تستخدم البريد الإلكتروني نفسه الذي في طلبك.",
        "- في [صفحة تسجيل الدخول](/login)، اختر رابط البريد لتحصل على رابط دخول لمرة واحدة، دون كلمة مرور.",
        "- نسيت كلمة المرور؟ [أعد تعيينها](/forgot-password) واتبع الرابط في البريد.",
        "- سجّلت باستخدام Google؟ استخدم المتابعة باستخدام Google بدلًا من كلمة المرور.",
        "قد تستغرق رسائل تسجيل الدخول بضع دقائق. راجع مجلد الرسائل غير المرغوب فيها أو العروض. وإذا تعذّر الدخول، راسلنا عبر واتساب.",
      ],
    },
  },
  {
    slug: "website-and-app",
    topic: "account-and-sign-in",
    title: { en: "Using the website and the app", ar: "استخدام الموقع والتطبيق" },
    summary: {
      en: "The website and the EZvisa app use the same account and show the same applications.",
      ar: "يستخدم الموقع وتطبيق إيزي فيزا الحساب نفسه ويعرضان الطلبات نفسها.",
    },
    body: {
      en: [
        "Sign in with the same account on the website and in the EZvisa app. Your applications, documents and progress are the same in both.",
        "You can start on one and continue on the other, for example uploading documents from your phone.",
      ],
      ar: [
        "سجّل الدخول بالحساب نفسه على الموقع وفي تطبيق إيزي فيزا. طلباتك ومستنداتك وتقدّمك متطابقة في الاثنين.",
        "يمكنك البدء في أحدهما والمتابعة في الآخر، كرفع المستندات من هاتفك مثلًا.",
      ],
    },
  },

  // ---------------------------------------------------------------- Refunds and cancellations
  {
    slug: "when-is-the-fee-refunded",
    topic: "refunds-and-cancellations",
    title: { en: "When is the fee refunded?", ar: "متى تُسترد الرسوم؟" },
    summary: {
      en: "In full if you cancel before preparation starts, if we can't deliver, or if you paid twice.",
      ar: "كاملة إذا ألغيت قبل بدء التجهيز، أو إذا تعذّر علينا التسليم، أو إذا دفعت مرتين.",
    },
    body: {
      en: [
        "You get the full service fee back if:",
        "- You cancel before preparation starts, meaning before our team begins working on your file",
        "- We fail to deliver the service you paid for",
        "- You were charged twice for the same application",
        "There is no refund once preparation has started, or for a visa refusal or delay, a missed appointment, or a change of plans. Embassy, visa centre and insurance fees are paid to them and follow their own policies.",
        "The [refund policy](/refund-policy) has the full terms.",
      ],
      ar: [
        "تستردّ رسوم الخدمة كاملة إذا:",
        "- ألغيت قبل بدء التجهيز، أي قبل أن يبدأ فريقنا العمل على ملفك",
        "- لم نقدّم الخدمة التي دفعت مقابلها",
        "- خُصمت الرسوم مرتين عن الطلب نفسه",
        "لا يوجد استرداد بعد بدء التجهيز، ولا بسبب رفض التأشيرة أو تأخرها، أو فوات الموعد، أو تغيّر الخطط. رسوم السفارة ومركز التأشيرات والتأمين تُدفع لتلك الجهات وتخضع لسياساتها.",
        "تجد الشروط كاملة في [سياسة الاسترداد](/refund-policy).",
      ],
    },
  },
  {
    slug: "request-a-refund",
    topic: "refunds-and-cancellations",
    title: { en: "How do I request a refund?", ar: "كيف أطلب استرداد الرسوم؟" },
    summary: {
      en: `Email ${EMAIL} or message us on WhatsApp with your EZ reference. We reply within 3 business days.`,
      ar: `راسلنا على ${EMAIL} أو عبر واتساب مع مرجع EZ. نرد خلال 3 أيام عمل.`,
    },
    body: {
      en: [
        `Send your request with your EZ- reference to ${EMAIL} or on WhatsApp.`,
        "- We reply within 3 business days.",
        "- Approved refunds go back to your original payment method within 7 business days of approval.",
        "- How long the money takes to appear depends on your bank or card issuer.",
      ],
      ar: [
        `أرسل طلبك مع مرجع EZ- إلى ${EMAIL} أو عبر واتساب.`,
        "- نرد خلال 3 أيام عمل.",
        "- تُعاد المبالغ المعتمدة إلى وسيلة الدفع الأصلية خلال 7 أيام عمل من الموافقة.",
        "- تعتمد مدة ظهور المبلغ على بنكك أو جهة إصدار بطاقتك.",
      ],
    },
  },
  {
    slug: "visa-refused",
    topic: "refunds-and-cancellations",
    title: { en: "My visa was refused", ar: "رُفضت تأشيرتي" },
    summary: {
      en: "The service fee isn't refunded for a refusal, but we'll go through the refusal letter with you and explain your options.",
      ar: "لا تُسترد رسوم الخدمة عند رفض التأشيرة، لكننا سنراجع خطاب الرفض معك ونشرح خياراتك.",
    },
    body: {
      en: [
        "The embassy makes the decision, and the service fee isn't refunded when a visa is refused. Our work on your file is complete by then.",
        "Message us with your EZ- reference and a photo of the refusal letter. A visa specialist will explain the reason given and your options, which may include applying again with a new application.",
        "Embassy and visa centre fees are paid to them and aren't refundable through us.",
      ],
      ar: [
        "السفارة هي صاحبة القرار، ولا تُسترد رسوم الخدمة عند رفض التأشيرة، إذ يكون عملنا على ملفك قد اكتمل.",
        "راسلنا مع مرجع EZ- وصورة من خطاب الرفض. سيشرح لك مختص التأشيرات السبب المذكور وخياراتك، وقد تشمل التقديم من جديد بطلب جديد.",
        "رسوم السفارة ومركز التأشيرات تُدفع لتلك الجهات ولا يمكن استردادها عبرنا.",
      ],
    },
  },
]

export function helpTopic(slug: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.slug === slug)
}

export function helpArticle(topic: string, slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.topic === topic && article.slug === slug)
}

export function topicArticles(topic: string): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.topic === topic)
}

export const helpArticleHref = (article: Pick<HelpArticle, "topic" | "slug">) => `/help/${article.topic}/${article.slug}`
