import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  referenceId: z
    .string()
    .trim()
    .regex(/^UCX-[0-9A-F]{8}$/),
  triggerCase: z.string().trim().max(80),
  interestArea: z.string().trim().max(120).nullable().optional(),
});

/**
 * Sends the confirmation email for a captured lead (waitlist or advisor).
 *
 * The recipient is never taken from the browser as a free-form target: the
 * address is validated here and the template is fixed per flow, so this cannot
 * be used as a generic mail relay.
 */
export const sendLeadConfirmation = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { deliverLeadConfirmation } = await import("@/lib/leads/lead-confirmation.server");
    const result = await deliverLeadConfirmation(data);
    // Record the first delivery attempt so admins see pending/failed leads and
    // the retry pass can pick them up. Privileged client is used because the
    // capture itself is anonymous; the row is located by its reference code and
    // only delivery-status columns are written.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: lead } = await supabaseAdmin
        .from("lead_captures")
        .select("id, confirmation_attempts")
        .eq("reference_id", data.referenceId)
        .maybeSingle();
      if (lead) {
        const { recordDeliveryOutcome } = await import("@/lib/leads/lead-confirmation.server");
        await recordDeliveryOutcome(supabaseAdmin, {
          leadId: lead.id,
          attempts: (lead.confirmation_attempts ?? 0) + 1,
          result,
          actorLabel: "system",
          correlationId: data.referenceId,
        });
      }
    } catch (error) {
      console.warn("[usecasex:leads] delivery status not recorded", error);
    }
    return result;
  });
