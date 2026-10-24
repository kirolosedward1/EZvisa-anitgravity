import type { DisplayLocale } from "@/lib/currency"
import {
  DETAILS,
  FAQS,
  HERO_SCREENS,
  PRICE_LABEL,
  SCREENS,
  STATUS_POINTS,
  STATUS_STEPS,
  WALKTHROUGH_STEPS,
  type Detail,
  type Faq,
  type Screen,
  type StatusStep,
  type WalkthroughStep,
} from "@/components/app/content"

export interface AppCopy {
  priceLabel: string
  screens: Record<string, Screen>
  heroScreens: Screen[]
  walkthrough: WalkthroughStep[]
  statusPoints: string[]
  statusSteps: StatusStep[]
  details: Detail[]
  faqs: Faq[]
}

const AR_SCREENS: Record<string, Screen> = {
  home: {
    ...SCREENS.home,
    label: "الرئيسية",
    alt: "الشاشة الرئيسية لتطبيق إيزي فيزا: طلب ألمانيا بحالة مدفوع، مع شريط التقدّم وخط الحالة وزر أكمل الطلب",
  },
  apply: {
    ...SCREENS.apply,
    label: "التقديم",
    alt: "خطوة التقديم في تطبيق إيزي فيزا تسأل إلى أين تريد السفر، مع قائمة دول شنغن وألمانيا محددة",
  },
  pay: {
    ...SCREENS.pay,
    label: "الدفع",
    alt: "شاشة المراجعة والدفع في تطبيق إيزي فيزا لطلب ألمانيا، تعرض رسم الخدمة 249 درهم وزر الدفع عبر زينة",
  },
  upload: {
    ...SCREENS.upload,
    label: "الرفع",
    alt: "شاشة رفع المستندات في تطبيق إيزي فيزا: جواز السفر والهوية الإماراتية وكشف الحساب وشهادة الراتب مع تقدّم الرفع",
  },
  track: {
    ...SCREENS.track,
    label: "المتابعة",
    alt: "شاشة الطلب في تطبيق إيزي فيزا لألمانيا: خط الحالة وتفاصيل الموعد وقائمة المستندات",
  },
}

const AR_WALKTHROUGH: WalkthroughStep[] = [
  {
    id: "apply",
    tab: "قدّم",
    title: "سؤال واحد في كل شاشة",
    body: "الوجهة والتواريخ والجواز والعمل، كل منها في شاشة مستقلة مع شريط تقدّم وزر رجوع. تُحفظ الإجابات لحظة الضغط على متابعة.",
    details: ["ابحث في 29 دولة شنغن", "حفظ تلقائي بعد كل إجابة", "أكمل من السؤال نفسه على أي جهاز"],
    screen: AR_SCREENS.apply,
  },
  {
    id: "pay",
    tab: "ادفع",
    title: "راجع، ثم ادفع 249 درهم",
    body: "راجع إجاباتك في صفحة واحدة، ثم ادفع عبر زينة. السعر يحدده الخادم، فما تراه هو ما تدفعه.",
    details: [
      "249 درهم عن كل طلب",
      "الدفع كضيف، ثم تسجيل الدخول لاحقًا بالبريد نفسه",
      "رسوم السفارة ومركز التأشيرات تُدفع في موعدك",
      "إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية.",
    ],
    screen: AR_SCREENS.pay,
  },
  {
    id: "upload",
    tab: "ارفع",
    title: "أكمل بعد الدفع",
    body: "يفتح الدفع خطوة أكمل الطلب: بيانات العمل باختصار، ثم رفع المستندات من الكاميرا أو الملفات.",
    details: ["بيانات العمل، نحو دقيقتين", "الكاميرا أو الملفات، بأي ترتيب", "يستأنف الرفع إذا انقطع الاتصال"],
    screen: AR_SCREENS.upload,
  },
  {
    id: "track",
    tab: "تابع",
    title: "الحالة الفعلية، مع الوقت",
    body: "مُرسل، مدفوع، قيد المراجعة، الملف جاهز، كل مرحلة مع وقت حدوثها، إضافة إلى تفاصيل الموعد التي يدخلها الفريق.",
    details: ["كل تغيّر في الحالة مختوم بالوقت", "مركز الموعد وتاريخه ووقته يضيفهما الفريق", "واتساب أو البريد أو الهاتف مع مرجع طلبك"],
    screen: AR_SCREENS.track,
  },
]

const AR_STATUS_STEPS: StatusStep[] = [
  { label: "مُرسل", detail: "2 مارس، 14:05" },
  { label: "مدفوع", detail: "2 مارس، 14:09" },
  { label: "قيد المراجعة", detail: "3 مارس، 09:30" },
  { label: "الملف جاهز", detail: "6 مارس، 11:20" },
  { label: "الموعد", detail: "VFS Global، دبي · 14 مارس، 10:30" },
]

const AR_STATUS_POINTS = [
  "مسودة، مُرسل، مدفوع، قيد المراجعة، الملف جاهز، ملغى: الحالات الفعلية، من دون وصف مبهم بينها.",
  "مركز الموعد وتاريخه ووقته، يدخلها الفريق حال توفرها.",
  "تحتاج إلى شخص؟ واتساب أو البريد أو الهاتف، مع إرفاق مرجع الطلب تلقائيًا.",
]

const AR_DETAILS: Detail[] = DETAILS.map((item, index) => {
  const copy: Array<Pick<Detail, "title" | "body" | "linkLabel">> = [
    { title: "العربية والإنجليزية", body: "بدّل اللغة من الإعدادات فينقلب التطبيق كله من اليمين إلى اليسار." },
    { title: "قفل بصمة الوجه", body: "اختياري. يُبقي بيانات جوازك خاصة على هاتف مشترك." },
    { title: "الرفع يتحمّل ضعف الإشارة", body: "إذا انقطع الاتصال أثناء الرفع، يستأنف عندما تعود إلى الشبكة." },
    { title: "حفظ تلقائي ومتابعة من أي مكان", body: "كل إجابة تُحفظ وأنت تتقدّم. افتح التطبيق أو الموقع وأكمل من السؤال نفسه." },
    { title: "ادفع عندما تكون جاهزًا", body: "أنهِ الأسئلة أولًا. يأتي الدفع بعد المراجعة: 249 درهم عن كل طلب." },
    {
      title: "قواعد استرداد واضحة",
      body: "استرداد كامل إذا ألغيت قبل أن نبدأ مراجعة مستنداتك، أو إذا تعذّر التسليم بسبب خطأ من جانبنا. لا استرداد عند رفض التأشيرة: القرار للسفارة.",
      linkLabel: "سياسة الاسترداد",
    },
  ]
  return { ...item, ...copy[index] }
})

const AR_FAQS: Faq[] = [
  {
    question: "هل توجد نسخة لأندرويد؟",
    answer:
      "ليس بعد. تطبيق آيفون متاح الآن، وأندرويد قيد التطوير، وسيعمل شعار Google Play في هذه الصفحة عند الإطلاق. حتى ذلك الحين يعمل الموقع في أي متصفح على أندرويد بالحساب نفسه.",
  },
  {
    question: "كم التكلفة؟",
    answer:
      "تنزيل التطبيق مجاني. الخدمة 249 درهم عن كل طلب، تُدفع في التطبيق عبر زينة بعد مراجعة إجاباتك. رسوم السفارة ومركز التأشيرات تُدفع منفصلة في موعدك. إيزي فيزا غير مسجّلة لضريبة القيمة المضافة؛ الأسعار المعروضة نهائية.",
  },
  {
    question: "بدأت على الموقع. هل يظهر الطلب في التطبيق؟",
    answer: "نعم. سجّل الدخول بالبريد نفسه فيظهر الطلب عند السؤال الذي توقفت عنده. والعكس صحيح.",
  },
  {
    question: "أي مستندات أرفعها من التطبيق؟",
    answer:
      "ما تطلبه قائمتك: جواز السفر، والهوية الإماراتية، وكشف الحساب، وشهادة الراتب، وشهادة عدم الممانعة، والصورة. صوّر بالكاميرا أو اختر ملفًا أو صورة من الملفات. يُفتح الرفع بعد الدفع ويستأنف إذا انقطع الاتصال.",
  },
  {
    question: "هل يمكنني قفل التطبيق؟",
    answer: "نعم. فعّل قفل بصمة الوجه من الإعدادات فيطلب التطبيق البصمة قبل أن يفتح. طلبك في الحساب والخادم نفسيهما كما في الموقع.",
    href: "/privacy-policy",
    linkLabel: "كيف نتعامل مع البيانات",
  },
]

export function appCopy(locale: DisplayLocale): AppCopy {
  if (locale === "en") {
    return {
      priceLabel: PRICE_LABEL,
      screens: SCREENS,
      heroScreens: HERO_SCREENS,
      walkthrough: WALKTHROUGH_STEPS,
      statusPoints: STATUS_POINTS,
      statusSteps: STATUS_STEPS,
      details: DETAILS,
      faqs: FAQS,
    }
  }
  return {
    priceLabel: "249 درهم",
    screens: AR_SCREENS,
    heroScreens: [AR_SCREENS.home, AR_SCREENS.apply, AR_SCREENS.track],
    walkthrough: AR_WALKTHROUGH,
    statusPoints: AR_STATUS_POINTS,
    statusSteps: AR_STATUS_STEPS,
    details: AR_DETAILS,
    faqs: AR_FAQS,
  }
}
