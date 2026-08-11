import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { observedHost, requirePlatformAdmin } from "./ops.access";

/**
 * Production configuration report. Platform-admin only: it names the
 * server-side secrets the deployment expects, so the shape itself is
 * operational information. Values are never read into the result.
 */
export const getProductionConfigFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only platform admins can read the production configuration.");
    const { collectProductionConfig } = await import("@/lib/ops/production-config.server");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      context.userId;
    let observedHost = "unknown";
    try {
      observedHost = new URL(getRequest().url).host;
    } catch {
      observedHost = "unknown";
    }
    return collectProductionConfig({ observedHost, actor: email });
  });

/**
 * Production data audit. Platform-admin only: it enumerates role grants and
 * anonymous exposure, which is operational information in its own right.
 */
export const getProductionDataAuditFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actor = await requirePlatformAdmin(context);
    const { collectProductionData } = await import("@/lib/ops/production-data.server");
    return collectProductionData({ observedHost: observedHost(), actor });
  });

/**
 * Revokes one platform role grant. Deliberately narrow: it removes a role, not
 * an account or any content, and always writes an audit event.
 */
export const revokePlatformGrantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.string().min(1).max(64),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const actor = await requirePlatformAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot revoke your own platform role from this page.");
    }
    const { revokeGrant } = await import("@/lib/ops/production-data.server");
    return revokeGrant({ ...data, actorId: context.userId, actor });
  });

/**
 * Flags the workspaces and organizations of demo-named accounts as demo, so
 * analytics can exclude them. Additive: it sets a label and removes nothing.
 */
export const flagDemoTenantsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actor = await requirePlatformAdmin(context);
    const { flagDemoTenants } = await import("@/lib/ops/production-data.server");
    return flagDemoTenants({ actorId: context.userId, actor });
  });

/** Records a named sign-off (or rejection) of the production data checklist. */
export const signOffProductionDataFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        verdict: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(1000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const actor = await requirePlatformAdmin(context);
    const { recordDataSignOff } = await import("@/lib/ops/production-data.server");
    return recordDataSignOff({ ...data, actorId: context.userId, actor });
  });
