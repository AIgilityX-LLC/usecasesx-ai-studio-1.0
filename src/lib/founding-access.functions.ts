import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmitInput = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  workEmail: z.string().trim().email("Enter a valid work email").max(320),
  organization: z.string().trim().min(1, "Organization is required").max(200),
  roleTitle: z.string().trim().max(120).nullable().optional(),
});

/** Public pre-signup capture — no auth. Inserts request + notifies info@. */
export const submitFoundingAccessRequestFn = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { submitFoundingAccessRequest } = await import("@/lib/founding-access.server");
    return submitFoundingAccessRequest(supabaseAdmin as never, {
      fullName: data.fullName,
      workEmail: data.workEmail,
      organization: data.organization,
      roleTitle: data.roleTitle ?? null,
    });
  });

const ListInput = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
});

export const listFoundingAccessRequestsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListInput.parse(d ?? { status: "pending" }))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listFoundingAccessRequests } = await import("@/lib/founding-access.server");
    return listFoundingAccessRequests(supabaseAdmin as never, data.status);
  });

const ReviewInput = z.object({
  requestId: z.string().uuid(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const approveFoundingAccessRequestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { approveFoundingAccessRequest } = await import("@/lib/founding-access.server");
    const result = await approveFoundingAccessRequest(supabaseAdmin as never, {
      requestId: data.requestId,
      actorId: context.userId,
      notes: data.notes ?? null,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "founding_access_request", id: data.requestId },
        next: { status: "approved", user_id: result.userId, emailed: result.emailed },
        source: "founding-access",
      },
    );
    // Do not return invite links — only status.
    return { requestId: result.requestId, emailed: result.emailed };
  });

export const rejectFoundingAccessRequestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rejectFoundingAccessRequest } = await import("@/lib/founding-access.server");
    const result = await rejectFoundingAccessRequest(supabaseAdmin as never, {
      requestId: data.requestId,
      actorId: context.userId,
      notes: data.notes ?? null,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "founding_access_request", id: data.requestId },
        next: { status: "rejected" },
        source: "founding-access",
      },
    );
    return result;
  });
