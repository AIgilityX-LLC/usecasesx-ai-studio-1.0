/**
 * Confirmation-email delivery for captured leads.
 *
 * Each marketing flow maps to one fixed template and one validated recipient.
 * Delivery is idempotent per reference code, so a retried submission does not
 * send twice.
 */
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

export interface LeadConfirmationInput {
  fullName: string;
  email: string;
  referenceId: string;
  triggerCase: string;
  interestArea?: string | null;
}

export type LeadConfirmationResult = { sent: boolean; reason?: string };

const ADVISOR_TRIGGERS = ["ai-strategy-session", "advisor", "contact"];

export function confirmationTemplate(triggerCase: string): "advisor-confirmation" | "waitlist-confirmation" {
  const value = triggerCase.toLowerCase();
  return ADVISOR_TRIGGERS.some((t) => value.includes(t))
    ? "advisor-confirmation"
    : "waitlist-confirmation";
}

export async function deliverLeadConfirmation(
  input: LeadConfirmationInput,
): Promise<LeadConfirmationResult> {
  const template = confirmationTemplate(input.triggerCase);
  try {
    const result = await sendTemplateEmail(template, input.email, {
      templateData: {
        name: input.fullName,
        referenceId: input.referenceId,
        interestArea: input.interestArea ?? null,
      },
      idempotencyKey: `${template}-${input.referenceId}`,
    });
    return { sent: result.sent, ...(result.sent ? {} : { reason: result.reason ?? "not_sent" }) };
  } catch (error) {
    // A mail-side failure (unverified domain, rate limit) must not fail the
    // capture: the lead is already stored and the reference code is shown.
    console.warn("[usecasex:leads] confirmation email failed", {
      template,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { sent: false, reason: "delivery_failed" };
  }
}
