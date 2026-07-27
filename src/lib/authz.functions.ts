import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Authoritative authorization context for the signed-in caller.
 * The browser mirrors this for UI gating; server handlers re-check with
 * `assertEntitled` so hidden buttons are never the security boundary.
 */
export const getAuthzContextFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveSubject } = await import("@/lib/authz.server");
    const { evaluateAll } = await import("@/lib/authz/permission-service");
    const subject = await resolveSubject(context.supabase as any, context.userId);
    return { subject, permissions: evaluateAll(subject) };
  });

/** Server-side re-check of a single entitlement (used by protected actions). */
export const checkEntitlementFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ key: z.string(), workspaceId: z.string().uuid().optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { resolveSubject } = await import("@/lib/authz.server");
    const { evaluate, isEntitlementKey } = await import("@/lib/authz");
    if (!isEntitlementKey(data.key)) throw new Error("Unknown entitlement key");
    const subject = await resolveSubject(
      context.supabase as any,
      context.userId,
      data.workspaceId ?? null,
    );
    const decision = evaluate(subject, data.key);
    return {
      allowed: decision.allowed,
      reason: decision.reason ?? null,
      message: decision.message ?? null,
      requiredEdition: decision.requiredEdition,
    };
  });
