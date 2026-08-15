/**
 * Confirmation-email delivery for captured leads.
 *
 * Each marketing flow maps to one fixed template and one validated recipient,
 * keyed by the lead reference code so a retried submission cannot send twice.
 *
 * Sending activates once the app's email sender domain is verified; until then
 * the capture still succeeds and the visitor is shown their reference code plus
 * the direct advisor mailbox, so no lead is ever left without a next step.
 */
export interface LeadConfirmationInput {
  fullName: string;
  email: string;
  referenceId: string;
  triggerCase: string;
  interestArea?: string | null;
}

export type LeadConfirmationResult = { sent: boolean; reason?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const ADVISOR_TRIGGERS = ["ai-strategy-session", "advisor", "contact"];

export type LeadTemplate = "advisor-confirmation" | "waitlist-confirmation";

export function confirmationTemplate(triggerCase: string): LeadTemplate {
  const value = triggerCase.toLowerCase();
  return ADVISOR_TRIGGERS.some((t) => value.includes(t))
    ? "advisor-confirmation"
    : "waitlist-confirmation";
}

/** Loads the scaffolded template sender when the email domain is configured. */
async function loadSender(): Promise<
  | ((
      template: string,
      to: string,
      options: { templateData: Record<string, unknown>; idempotencyKey: string },
    ) => Promise<{ sent: boolean; reason?: string }>)
  | null
> {
  // Resolved through a variable so the app still builds before the email
  // sender domain is configured and the template module exists.
  const moduleId = "../email-templates/send-email";
  try {
    const mod = (await import(/* @vite-ignore */ moduleId)) as {
      sendTemplateEmail?: (
        template: string,
        to: string,
        options: { templateData: Record<string, unknown>; idempotencyKey: string },
      ) => Promise<{ sent: boolean; reason?: string }>;
    };
    return mod.sendTemplateEmail ?? null;
  } catch {
    return null;
  }
}

export async function deliverLeadConfirmation(
  input: LeadConfirmationInput,
): Promise<LeadConfirmationResult> {
  const template = confirmationTemplate(input.triggerCase);
  const send = await loadSender();
  if (!send) return { sent: false, reason: "email_sender_not_configured" };
  try {
    const result = await send(template, input.email, {
      templateData: {
        name: input.fullName,
        referenceId: input.referenceId,
        interestArea: input.interestArea ?? null,
      },
      idempotencyKey: `${template}-${input.referenceId}`,
    });
    return result.sent ? { sent: true } : { sent: false, reason: result.reason ?? "not_sent" };
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

/**
 * Persists the outcome of one delivery attempt on the lead and appends it to
 * the lead's timeline, scheduling the next retry with capped backoff.
 */
export async function recordDeliveryOutcome(
  supabase: Client,
  input: {
    leadId: string;
    attempts: number;
    result: LeadConfirmationResult;
    actorId?: string | null;
    actorLabel?: string | null;
    correlationId?: string | null;
  },
): Promise<void> {
  const { nextRetryAt, MAX_DELIVERY_ATTEMPTS } = await import("./leads.model");
  const now = new Date();
  const suppressed = input.result.reason === "recipient_suppressed";
  const status = input.result.sent
    ? "sent"
    : suppressed
      ? "suppressed"
      : input.attempts >= MAX_DELIVERY_ATTEMPTS
        ? "failed"
        : "pending";

  const { error } = await supabase
    .from("lead_captures")
    .update({
      confirmation_status: status,
      confirmation_attempts: input.attempts,
      confirmation_last_attempt_at: now.toISOString(),
      confirmation_sent_at: input.result.sent ? now.toISOString() : null,
      confirmation_next_retry_at: status === "pending" ? nextRetryAt(input.attempts, now) : null,
      confirmation_last_error: input.result.sent ? null : (input.result.reason ?? "not_sent"),
    })
    .eq("id", input.leadId);
  if (error) console.warn("[usecasex:leads] delivery status write failed", error.message);

  const { recordLeadEvents } = await import("./leads.server");
  await recordLeadEvents(supabase, [
    {
      lead_id: input.leadId,
      event_type: "email_attempt",
      from_status: null,
      to_status: status,
      actor_id: input.actorId ?? null,
      actor_label: input.actorLabel ?? "system",
      detail: input.result.sent
        ? `Confirmation email sent (attempt ${input.attempts})`
        : `Attempt ${input.attempts} failed: ${input.result.reason ?? "not_sent"}`,
      correlation_id: input.correlationId ?? null,
    },
  ]);
}
