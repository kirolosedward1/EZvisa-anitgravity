import { createClient } from "@supabase/supabase-js";
import { Templates } from "./templates";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "EZvisa";
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "noreply@ezvisa.net";
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "support@ezvisa.net";
const FROM_EMAIL = `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`;

const ADMIN_EMAIL = process.env.EMAIL_ADMIN_ADDRESS || "ezvisa.net@gmail.com";
const IS_SANDBOX_MODE = process.env.NODE_ENV === "development";

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export class EmailService {
  /**
   * Send a transactional event email
   * Provides idempotency using Supabase 'email_logs' table.
   */
  static async sendEvent({
    event,
    entityId,
    recipient,
    language = "en",
    data
  }: {
    event: keyof typeof Templates;
    entityId: string;
    recipient: string;
    language?: "en" | "ar";
    data: any;
  }) {
    const supabase = getSupabase();

    // 1. Idempotency Check
    if (supabase) {
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id, status")
        .eq("event_type", event)
        .eq("entity_id", entityId)
        .single();

      if (existingLog && existingLog.status === "sent") {
        console.log(`[EmailService] Idempotency hit: Event ${event} already sent for ${entityId}`);
        return { success: true, reason: "idempotent" };
      }
    }

    if (!RESEND_API_KEY) {
      console.warn("[EmailService] RESEND_API_KEY not configured. Skipping email.");
      return { success: false, reason: "no_api_key" };
    }

    // 2. Render Template
    const templateFn = Templates[event];
    if (!templateFn) {
      throw new Error(`Template for event ${event} not found`);
    }
    const { subject, html } = templateFn(data, language);

    // 3. Handle Sandbox mode
    let finalRecipient = recipient;
    let finalSubject = subject;

    if (IS_SANDBOX_MODE && recipient !== ADMIN_EMAIL) {
      finalRecipient = ADMIN_EMAIL;
      finalSubject = `[TEST MODE: ${recipient}] ${subject}`;
    }

    // 4. Send Email via Resend
    let providerMessageId = null;
    let deliveryStatus = "failed";
    let errorReason = null;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: finalRecipient,
          reply_to: EMAIL_REPLY_TO,
          subject: finalSubject,
          html: html,
        }),
      });

      const result = await response.json();

      if (response.ok && result.id) {
        providerMessageId = result.id;
        deliveryStatus = "sent";
      } else {
        errorReason = result.message || JSON.stringify(result);
      }
    } catch (err: any) {
      errorReason = err.message;
    }

    // 5. Log to Supabase
    if (supabase) {
      await supabase.from("email_logs").upsert({
        event_type: event,
        entity_id: entityId,
        recipient,
        template: event,
        status: deliveryStatus,
        provider_message_id: providerMessageId,
        error_reason: errorReason,
        language,
        sent_at: deliveryStatus === "sent" ? new Date().toISOString() : null,
      }, { onConflict: "event_type,entity_id" });
    }

    return { success: deliveryStatus === "sent", providerMessageId, errorReason };
  }
}
