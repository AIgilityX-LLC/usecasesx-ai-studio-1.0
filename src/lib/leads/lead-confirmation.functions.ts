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
    return deliverLeadConfirmation(data);
  });
