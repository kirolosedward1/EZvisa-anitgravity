import { generateEmailLayout } from "../layout";
import { EmailButton, EmailCard, EmailCardRow, EmailNotice, EmailText } from "../components";

type AppData = {
  id?: string;
  trackingToken?: string;
  firstName: string;
  destination: string;
  paymentAmount?: number;
  currency?: string;
};

function getTrackUrl(trackingToken?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.ezvisa.net";
  return trackingToken ? `${baseUrl}/track/${trackingToken}` : baseUrl;
}

export const Templates = {
  "application.submitted": (data: AppData, lang: "en" | "ar" = "en") => {
    const isAr = lang === "ar";
    const subject = isAr ? `تم استلام طلب تأشيرة ${data.destination}` : `We received your ${data.destination} visa application`;
    const html = generateEmailLayout({
      language: lang,
      title: subject,
      previewText: isAr ? "لقد استلمنا طلبك بنجاح." : "We have successfully received your visa application.",
      content: `
        ${EmailText({ children: isAr ? `مرحباً ${data.firstName}،` : `Dear ${data.firstName},` })}
        ${EmailText({ children: isAr ? `لقد استلمنا طلب تأشيرة <strong>${data.destination}</strong> الخاص بك بنجاح.` : `We have successfully received your visa application for <strong>${data.destination}</strong>.` })}
        
        ${EmailCard({ children: `
          ${EmailCardRow({ label: isAr ? "الوجهة" : "Destination", value: data.destination })}
          ${data.id ? EmailCardRow({ label: isAr ? "رقم الطلب" : "Application ID", value: data.id }) : ""}
        `})}
        
        ${EmailNotice({
          type: "info",
          title: isAr ? "ما الخطوة التالية؟" : "What happens next?",
          text: isAr 
            ? "يرجى إكمال الدفع للبدء في معالجة الطلب. سيقوم خبراؤنا بمراجعة ملفك في غضون 24 ساعة بمجرد تأكيد الدفع." 
            : "Please complete your payment to start processing. Our visa experts will review your application within 24 hours once payment is confirmed."
        })}
        
        ${data.trackingToken ? EmailButton({ text: isAr ? "تتبع الطلب" : "Track Application", url: getTrackUrl(data.trackingToken) }) : ""}
      `
    });
    return { subject, html };
  },

  "payment.completed": (data: AppData, lang: "en" | "ar" = "en") => {
    const isAr = lang === "ar";
    const subject = isAr ? `الدفع ناجح - EZvisa` : `Payment received — EZvisa`;
    const html = generateEmailLayout({
      language: lang,
      title: subject,
      previewText: isAr ? "تم استلام الدفعة بنجاح. نحن نعمل على طلبك." : "Your payment was successful. We are now processing your application.",
      content: `
        ${EmailNotice({
          type: "success",
          title: isAr ? "تم تأكيد الدفع" : "Payment Confirmed",
          text: isAr ? "لقد استلمنا دفعتك بنجاح." : "We have successfully received your payment."
        })}
        ${EmailText({ children: isAr ? `مرحباً ${data.firstName}،` : `Dear ${data.firstName},` })}
        ${EmailText({ children: isAr ? `شكراً لك. طلب تأشيرة ${data.destination} قيد المعالجة الآن.` : `Thank you. Your ${data.destination} visa application is now in progress!` })}
        
        ${EmailCard({ children: `
          ${EmailCardRow({ label: isAr ? "الوجهة" : "Destination", value: data.destination })}
          ${EmailCardRow({ label: isAr ? "المبلغ" : "Amount", value: `${data.paymentAmount} ${data.currency}` })}
          ${data.id ? EmailCardRow({ label: isAr ? "المرجع" : "Reference", value: data.id }) : ""}
        `})}
        
        ${data.trackingToken ? EmailButton({ text: isAr ? "عرض الطلب" : "View Application", url: getTrackUrl(data.trackingToken) }) : ""}
      `
    });
    return { subject, html };
  },

  "payment.failed": (data: AppData, lang: "en" | "ar" = "en") => {
    const isAr = lang === "ar";
    const subject = isAr ? "لم يكتمل الدفع" : "Your EZvisa payment could not be completed";
    const html = generateEmailLayout({
      language: lang,
      title: subject,
      previewText: isAr ? "واجهنا مشكلة في معالجة الدفع الخاص بك." : "We encountered an issue processing your payment.",
      content: `
        ${EmailNotice({
          type: "warning",
          title: isAr ? "فشل الدفع" : "Payment Failed",
          text: isAr ? "لم نتمكن من معالجة دفعتك بأمان. لا تقلق، لم يتم خصم أي مبلغ." : "We could not securely process your payment. Don't worry, you haven't been charged."
        })}
        ${EmailText({ children: isAr ? `مرحباً ${data.firstName}،` : `Dear ${data.firstName},` })}
        ${EmailText({ children: isAr ? "يرجى المحاولة مرة أخرى باستخدام طريقة دفع مختلفة لإكمال طلبك." : "Please try again using a different payment method to complete your application." })}
        
        ${data.trackingToken ? EmailButton({ text: isAr ? "إعادة المحاولة" : "Try Payment Again", url: getTrackUrl(data.trackingToken) }) : ""}
      `
    });
    return { subject, html };
  },

  "documents.ready": (data: AppData, lang: "en" | "ar" = "en") => {
    const isAr = lang === "ar";
    const subject = isAr ? `ملف تأشيرة ${data.destination} جاهز` : `Your ${data.destination} visa file is ready`;
    const html = generateEmailLayout({
      language: lang,
      title: subject,
      previewText: isAr ? "لقد أكملنا إعداد مستنداتك وهي جاهزة للتنزيل." : "We have finished preparing your documents. They are ready to download.",
      content: `
        ${EmailText({ children: isAr ? `مرحباً ${data.firstName}،` : `Dear ${data.firstName},` })}
        ${EmailText({ children: isAr ? "أخبار رائعة! لقد أكمل خبراؤنا إعداد ملف طلب التأشيرة الخاص بك." : "Great news! Our experts have finished preparing your complete visa application file." })}
        
        ${EmailNotice({
          type: "info",
          title: isAr ? "ماذا يتضمن الملف؟" : "What's included?",
          text: isAr 
            ? "يتضمن الملف الخاص بك استمارة الطلب المكتملة، وخطاب التغطية، وحجوزات الطيران والفنادق، وخطة السفر." 
            : "Your file includes your completed application form, cover letter, flight and hotel reservations, and travel itinerary."
        })}
        
        ${data.trackingToken ? EmailButton({ text: isAr ? "تنزيل ملف التأشيرة" : "Download Your Visa File", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.ezvisa.net"}/api/download-document?token=${data.trackingToken}` }) : ""}
      `
    });
    return { subject, html };
  },

  "documents.requested": (data: AppData, lang: "en" | "ar" = "en") => {
    const isAr = lang === "ar";
    const subject = isAr ? `مطلوب مستندات لطلب تأشيرة ${data.destination}` : `Documents required for your ${data.destination} application`;
    const html = generateEmailLayout({
      language: lang,
      title: subject,
      previewText: isAr ? "يرجى تحميل المستندات المطلوبة لإكمال طلبك." : "Please upload the required documents to complete your application.",
      content: `
        ${EmailNotice({
          type: "warning",
          title: isAr ? "إجراء مطلوب" : "Action Required",
          text: isAr ? "نحن بحاجة إلى مستندات إضافية لمعالجة طلبك." : "We need additional documents to process your application."
        })}
        ${EmailText({ children: isAr ? `مرحباً ${data.firstName}،` : `Dear ${data.firstName},` })}
        ${EmailText({ children: isAr ? `يرجى تحميل المستندات المطلوبة الخاصة بطلب تأشيرة ${data.destination} حتى نتمكن من المتابعة.` : `Please upload the required documents for your ${data.destination} visa application so we can proceed.` })}
        
        ${data.trackingToken ? EmailButton({ text: isAr ? "تحميل المستندات" : "Upload Documents", url: `${getTrackUrl(data.trackingToken)}/upload` }) : ""}
      `
    });
    return { subject, html };
  }
};
