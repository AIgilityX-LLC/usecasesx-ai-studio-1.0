/**
 * Active email adapter — delegates to Lovable managed email.
 * Server-only.
 */

import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import {
  EMAIL_ADAPTER_CATALOGUE,
  type EmailPort,
  type EmailSendRequest,
  type EmailSendResult,
} from "@/lib/ports/email.port";

export const lovableEmailAdapter: EmailPort = {
  meta: { ...EMAIL_ADAPTER_CATALOGUE.lovable_email, port: "email" },
  async sendTemplate(req: EmailSendRequest): Promise<EmailSendResult> {
    try {
      const result = await sendTemplateEmail(req.templateName, req.to, {
        templateData: req.templateData,
        idempotencyKey: req.idempotencyKey,
        replyTo: req.replyTo,
        from: req.from,
      });
      if (result.sent) return { sent: true };
      return { sent: false, reason: "recipient_suppressed" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/LOVABLE_API_KEY|not configured/i.test(message)) {
        return { sent: false, reason: "not_configured" };
      }
      throw error;
    }
  },
};
