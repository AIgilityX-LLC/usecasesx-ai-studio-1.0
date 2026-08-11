import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Tenancy = {
  workspaceId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
};

const ExportInput = z.object({
  scope: z.array(z.string().trim().max(40)).max(20).default([]),
  ...Tenancy,
});

export const requestDataExportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ExportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { createExportRequest, runExportRequest } = await import("@/lib/legal/privacy.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const tenant = {
      workspaceId: data.workspaceId ?? null,
      organizationId: data.organizationId ?? null,
    };
    const created = await createExportRequest(context.supabase, {
      userId: context.userId,
      scope: data.scope,
      workspaceId: tenant.workspaceId,
      organizationId: tenant.organizationId,
    });
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant },
      {
        event: "data.export_requested",
        entity: { type: "data_export_request", id: created.id },
        severity: "notice",
        next: { scope: created.scope },
      },
    );
    const finished = await runExportRequest(
      context.supabase,
      context.userId,
      created.id,
      created.scope,
    );
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant },
      {
        event: "data.export_completed",
        entity: { type: "data_export_request", id: finished.id },
        severity: "notice",
        next: { rowCounts: finished.rowCounts, bytes: finished.payloadBytes },
      },
    );
    return finished;
  });

export const listDataExportsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listExportRequests } = await import("@/lib/legal/privacy.server");
    return listExportRequests(context.supabase, context.userId);
  });

export const downloadDataExportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { readExportPayload } = await import("@/lib/legal/privacy.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const result = await readExportPayload(context.supabase, context.userId, data.requestId);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "data.export_downloaded",
        entity: { type: "data_export_request", id: data.requestId },
        severity: "notice",
      },
    );
    return result;
  });

const DeletionInput = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
  confirmation: z.string().trim().max(80),
  ...Tenancy,
});

export const requestDataDeletionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeletionInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.confirmation.toUpperCase() !== "DELETE") {
      throw new Error("Type DELETE to confirm this request.");
    }
    const { createDeletionRequest } = await import("@/lib/legal/privacy.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const tenant = {
      workspaceId: data.workspaceId ?? null,
      organizationId: data.organizationId ?? null,
    };
    const record = await createDeletionRequest(context.supabase, {
      userId: context.userId,
      reason: data.reason ?? null,
      workspaceId: tenant.workspaceId,
      organizationId: tenant.organizationId,
    });
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId, tenant },
      {
        event: "data.deletion_requested",
        entity: { type: "data_deletion_request", id: record.id },
        severity: "warning",
        next: { effectiveAt: record.effectiveAt, graceDays: record.graceDays },
      },
    );
    return record;
  });

export const cancelDataDeletionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { cancelDeletionRequest } = await import("@/lib/legal/privacy.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const record = await cancelDeletionRequest(context.supabase, context.userId, data.requestId);
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "data.deletion_cancelled",
        entity: { type: "data_deletion_request", id: record.id },
        severity: "notice",
      },
    );
    return record;
  });

export const getDeletionRequestFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveDeletionRequest } = await import("@/lib/legal/privacy.server");
    return getActiveDeletionRequest(context.supabase, context.userId);
  });

const ConsentInput = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
  policyVersion: z.string().trim().min(1).max(20),
  source: z.enum(["banner", "preferences_center", "account"]),
  ...Tenancy,
});

export const recordConsentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ConsentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { recordConsent } = await import("@/lib/legal/privacy.server");
    return recordConsent(context.supabase, {
      userId: context.userId,
      analytics: data.analytics,
      marketing: data.marketing,
      policyVersion: data.policyVersion,
      source: data.source,
      workspaceId: data.workspaceId ?? null,
      organizationId: data.organizationId ?? null,
    });
  });

export const getConsentFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getLatestConsent } = await import("@/lib/legal/privacy.server");
    return getLatestConsent(context.supabase, context.userId);
  });
