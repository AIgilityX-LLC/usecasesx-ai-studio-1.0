import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_STATUSES,
} from "@/lib/feedback/feedback.model";
import { REQUEST_PRIORITIES } from "@/lib/feedback/sla";

const SubmitInput = z.object({
  category: z.enum([
    "bug",
    "usability",
    "data_quality",
    "missing_capability",
    "performance",
    "enterprise_interest",
    "other",
  ]),
  severity: z.enum(["low", "normal", "high", "blocking"]),
  message: z.string().trim().min(FEEDBACK_MESSAGE_MIN).max(FEEDBACK_MESSAGE_MAX),
  contextRoute: z.string().trim().max(300).nullable().optional(),
  entityType: z.string().trim().max(80).nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  evidenceUrl: z.string().trim().url().max(600).nullable().optional(),
  allowContact: z.boolean(),
  contactEmail: z.string().trim().email().max(255).nullable().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { insertFeedback } = await import("@/lib/feedback/feedback.server");
    const record = await insertFeedback(context.supabase, {
      userId: context.userId,
      category: data.category,
      severity: data.severity,
      message: data.message,
      contextRoute: data.contextRoute ?? null,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      evidenceUrl: data.evidenceUrl ?? null,
      allowContact: data.allowContact,
      contactEmail: data.contactEmail ?? null,
      workspaceId: data.workspaceId ?? null,
      organizationId: data.organizationId ?? null,
    });
    const { writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    await writeProductEvent(
      {
        supabase: context.supabase,
        userId: context.userId,
        tenant: {
          workspaceId: data.workspaceId ?? null,
          organizationId: data.organizationId ?? null,
        },
      },
      {
        event: "feedback.submitted",
        entity: { type: "product_feedback", id: record.id },
        // Category and severity only — never the message body.
        properties: { category: data.category, severity: data.severity },
      },
    );
    return record;
  });

export const listMyFeedbackFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listMyFeedback } = await import("@/lib/feedback/feedback.server");
    return listMyFeedback(context.supabase, context.userId);
  });

const QueueInput = z.object({
  status: z.enum(FEEDBACK_STATUSES).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  includeDemo: z.boolean().default(false),
});

export const getFeedbackQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => QueueInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { listFeedbackQueue } = await import("@/lib/feedback/feedback.server");
    return listFeedbackQueue(context.supabase, {
      status: data.status ?? null,
      category: data.category ?? null,
      includeDemo: data.includeDemo,
    });
  });

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(FEEDBACK_STATUSES),
  resolutionNote: z.string().trim().max(2000).nullable().optional(),
});

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { setFeedbackStatus } = await import("@/lib/feedback/feedback.server");
    const record = await setFeedbackStatus(context.supabase, {
      id: data.id,
      status: data.status,
      resolutionNote: data.resolutionNote ?? null,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "product_feedback", id: record.id },
        next: { status: record.status },
        source: "feedback-queue",
      },
    );
    return record;
  });

const TriageInput = z.object({
  id: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
  priority: z.enum(REQUEST_PRIORITIES.map((p) => p.value) as [string, ...string[]]),
  dueAt: z.string().datetime(),
});

/** Assign an owner, set priority and set the SLA due date on one request. */
export const setRequestTriage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TriageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { setFeedbackTriage } = await import("@/lib/feedback/feedback.server");
    const record = await setFeedbackTriage(context.supabase, {
      id: data.id,
      assignedTo: data.assignedTo,
      priority: data.priority,
      dueAt: data.dueAt,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "product_feedback", id: record.id },
        next: { assignedTo: record.assignedTo, priority: record.priority, dueAt: record.dueAt },
        source: "requests-inbox-triage",
      },
    );
    return record;
  });

/** Platform admins who can own a request, for the assignment picker. */
export const listRequestOwners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { listAssignableOwners } = await import("@/lib/feedback/owners.server");
    return listAssignableOwners();
  });

export const listMyRequestAlertsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listMyRequestAlerts } = await import("@/lib/feedback/feedback.server");
    return listMyRequestAlerts(context.supabase, context.userId);
  });

const MarkReadInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) });

export const markRequestAlertsReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MarkReadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { markRequestAlertsRead } = await import("@/lib/feedback/feedback.server");
    const updated = await markRequestAlertsRead(context.supabase, context.userId, data.ids);
    return { updated };
  });
