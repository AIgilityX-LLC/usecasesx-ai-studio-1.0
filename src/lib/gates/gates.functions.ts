/**
 * Decision gate server functions — thin wrappers only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  closeOpenItemInputSchema,
  decideGateInputSchema,
  gateKeySchema,
  submitGateInputSchema,
} from "./model";

export const listGateCatalogueFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { DEFAULT_GATES } = await import("./model");
    return DEFAULT_GATES.map((g) => ({
      key: g.key,
      label: g.label,
      description: g.description,
      requiredFields: [...g.requiredFields],
      requiredEvidenceFields: [...g.requiredEvidenceFields],
      decisionAuthority: g.decisionAuthority,
      slaHours: g.slaHours,
      sodEnabled: g.sodEnabled,
    }));
  });

export const listReviewsForUseCaseFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ useCaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listReviewsForUseCase, listOpenItems } = await import("./gates.server");
    const reviews = await listReviewsForUseCase(context.supabase, data.useCaseId);
    return Promise.all(
      reviews.map(async (r) => ({
        ...r,
        openItems: await listOpenItems(context.supabase, r.id),
      })),
    );
  });

export const listReviewInboxFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listInbox } = await import("./gates.server");
    return listInbox(context.supabase, data.workspaceId);
  });

export const previewMissingInputsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        gateKey: gateKeySchema,
        fields: z.record(z.string(), z.string().nullable()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { previewMissingInputs } = await import("./gates.server");
    return previewMissingInputs(data.gateKey, data.fields);
  });

export const submitGateReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => submitGateInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { submitGateReview } = await import("./gates.server");
    const { resolveSubject } = await import("@/lib/authz.server");

    const { data: uc, error } = await context.supabase
      .from("ai_use_cases")
      .select("workspace_id")
      .eq("id", data.useCaseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const workspaceId = (uc as { workspace_id?: string } | null)?.workspace_id ?? null;
    const authz = await resolveSubject(context.supabase, context.userId, workspaceId);

    return submitGateReview(
      context.supabase,
      context.userId,
      {
        workspaceRole: authz.workspaceRole,
        isPlatformAdmin: authz.isPlatformAdmin,
      },
      data,
    );
  });

export const decideGateReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => decideGateInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { decideGateReview } = await import("./gates.server");
    const { resolveSubject } = await import("@/lib/authz.server");

    const { data: review, error } = await (context.supabase as any)
      .from("decision_gate_reviews")
      .select("workspace_id")
      .eq("id", data.reviewId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const workspaceId = (review as { workspace_id?: string } | null)?.workspace_id ?? null;
    const authz = await resolveSubject(context.supabase, context.userId, workspaceId);

    return decideGateReview(
      context.supabase,
      context.userId,
      {
        workspaceRole: authz.workspaceRole,
        isPlatformAdmin: authz.isPlatformAdmin,
      },
      data,
    );
  });

export const closeGateOpenItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => closeOpenItemInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { closeOpenItem } = await import("./gates.server");
    const { resolveSubject } = await import("@/lib/authz.server");

    const { data: item, error } = await (context.supabase as any)
      .from("decision_gate_open_items")
      .select("workspace_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const workspaceId = (item as { workspace_id?: string } | null)?.workspace_id ?? null;
    const authz = await resolveSubject(context.supabase, context.userId, workspaceId);

    return closeOpenItem(
      context.supabase,
      context.userId,
      {
        workspaceRole: authz.workspaceRole,
        isPlatformAdmin: authz.isPlatformAdmin,
      },
      data,
    );
  });

export const listGateEventsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reviewId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listEvents } = await import("./gates.server");
    return listEvents(context.supabase, data.reviewId);
  });
