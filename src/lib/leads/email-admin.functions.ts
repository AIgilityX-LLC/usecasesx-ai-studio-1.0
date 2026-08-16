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
    const { buildDeliveryHealthReport, dispatchDeliveryAlerts } = await import(
      "@/lib/leads/email-health.server"
    );
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
