import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PREVIEW_TEMPLATES } from "@/lib/leads/email-health";

const PreviewInput = z.object({
  referenceId: z.string().trim().max(40).optional(),
  focusArea: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().max(120).optional(),
});

/** Renders both confirmation templates with sample data — never sends. */
export const previewConfirmationTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PreviewInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { renderTemplatePreview } = await import("@/lib/leads/email-preview.server");
    return Promise.all(
      PREVIEW_TEMPLATES.map((template) =>
        renderTemplatePreview({
          template,
          referenceId: data.referenceId,
          focusArea: data.focusArea ?? null,
          name: data.name,
        }),
      ),
    );
  });

const HealthInput = z
  .object({ windowHours: z.number().int().min(1).max(720).optional() })
  .default({});

/** Delivery health for the sender domain plus the alerts it currently raises. */
export const getEmailDeliveryHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => HealthInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { buildDeliveryHealthReport } = await import("@/lib/leads/email-health.server");
    return buildDeliveryHealthReport(context.supabase, { windowHours: data.windowHours });
  });

/** Sends the current alerts to the configured operations destination. */
export const notifyEmailDeliveryAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => HealthInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { buildDeliveryHealthReport, dispatchDeliveryAlerts } =
      await import("@/lib/leads/email-health.server");
    const report = await buildDeliveryHealthReport(context.supabase, {
      windowHours: data.windowHours,
    });
    const dispatch = await dispatchDeliveryAlerts(report);
    return { ...dispatch, summary: report.summary };
  });

const ResendInput = z.object({
  leadId: z.string().uuid(),
  note: z.string().trim().max(500).nullable().optional(),
});

/** Triggers one more confirmation attempt for a single lead, on demand. */
export const resendLeadConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { resendConfirmationForLead } = await import("@/lib/leads/leads.server");
    const actorLabel = (context.claims as { email?: string } | null)?.email ?? context.userId;
    return resendConfirmationForLead(context.supabase, {
      leadId: data.leadId,
      note: data.note ?? null,
      actorId: context.userId,
      actorLabel,
    });
  });

const AuthTestInput = z.object({
  type: z.enum(["magiclink", "recovery"]),
  recipient: z.string().trim().email().max(200),
  redirectTo: z.string().trim().url().max(300),
});

/** Sends one branded auth email (magic link or password reset) for verification. */
export const sendBrandedAuthTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AuthTestInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { sendAuthTestEmail, readAuthEmailLogs } =
      await import("@/lib/leads/auth-email-test.server");
    // Test emails may only go to the caller's own address, and only redirect
    // back to this app's origin, so the action cannot mail arbitrary people.
    const callerEmail = ((context.claims as { email?: string } | null)?.email ?? "").toLowerCase();
    if (!callerEmail || data.recipient.toLowerCase() !== callerEmail) {
      throw new Error("Test emails can only be sent to your own address.");
    }
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const appOrigin = new URL(getRequestUrl()).origin;
    if (new URL(data.redirectTo).origin !== appOrigin) {
      throw new Error("Redirect must point to this application.");
    }
    const send = await sendAuthTestEmail(data.type, data.recipient, data.redirectTo);
    const logs = await readAuthEmailLogs(data.recipient);
    return { send, logs };
  });

const AuthLogInput = z.object({ recipient: z.string().trim().max(200).optional() }).default({});

/** Delivery events Lovable recorded, optionally narrowed to one recipient. */
export const getAuthEmailDeliveryLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => AuthLogInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { readAuthEmailLogs } = await import("@/lib/leads/auth-email-test.server");
    return readAuthEmailLogs(data.recipient?.trim() || undefined);
  });
