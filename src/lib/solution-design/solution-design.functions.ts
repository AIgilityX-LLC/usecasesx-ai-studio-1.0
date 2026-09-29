/**
 * Solution design server functions — thin wrappers only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { solutionDesignDraftSchema } from "./model";

export const getSolutionDesignFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ useCaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getSolutionDesign } = await import("./solution-design.server");
    return getSolutionDesign(context.supabase, data.useCaseId);
  });

export const saveSolutionDesignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        useCaseId: z.string().uuid(),
        draft: solutionDesignDraftSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { upsertSolutionDesign } = await import("./solution-design.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");

    const saved = await upsertSolutionDesign(
      context.supabase,
      context.userId,
      data.useCaseId,
      data.draft,
    );

    await writeAuditEvent(
      {
        supabase: context.supabase,
        userId: context.userId,
        tenant: {
          organizationId: saved.organizationId,
          workspaceId: saved.workspaceId,
        },
      },
      {
        event: AUDIT_EVENTS.entityUpdated,
        entity: { type: "solution_design", id: saved.id },
        next: {
          useCaseId: saved.useCaseId,
          solutionType: saved.solutionType,
          autonomyLevel: saved.autonomyLevel,
        },
      },
    );

    return saved;
  });

/** Readiness check for Pilot Authorization (agentic controls). */
export const checkPilotAuthorizationFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ useCaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getSolutionDesign } = await import("./solution-design.server");
    const { emptySolutionDesign, pilotAuthorizationReadiness } = await import("./model");
    const row = await getSolutionDesign(context.supabase, data.useCaseId);
    return pilotAuthorizationReadiness(row ?? emptySolutionDesign());
  });
