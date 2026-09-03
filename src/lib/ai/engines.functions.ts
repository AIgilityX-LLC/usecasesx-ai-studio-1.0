/**
 * Research engine server functions — thin wrappers (AGENTS.md §3).
 *
 * Platform-admin actions re-check the caller's role on the server. Key values
 * enter here and never come back out: responses carry masked hints only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { engineUpsertSchema } from "@/lib/ai/engines";

const slugInput = z.object({ slug: z.string().trim().min(2).max(48) });
const keyInput = slugInput.extend({ apiKey: z.string().trim().min(8).max(400) });

async function subjectFor(context: { supabase: any; userId: string }) {
  const { resolveSubject } = await import("@/lib/authz.server");
  return resolveSubject(context.supabase, context.userId);
}

/** Engines the signed-in caller may select in the Studio. */
export const listStudioEnginesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const subject = await subjectFor(context);
    const { listUsableEngines } = await import("@/lib/ai/engines.server");
    return { engines: await listUsableEngines(subject.edition, subject.workspaceId ?? null) };
  });

/** Full catalog plus usage — administration only. */
export const listEngineAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context as never);
    const subject = await subjectFor(context);
    const { listEngines, engineUsage } = await import("@/lib/ai/engines.server");
    const [engines, usage] = await Promise.all([
      listEngines(subject.workspaceId ?? null),
      engineUsage(),
    ]);
    return { engines, usage };
  });

export const saveEngineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => engineUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    const actor = await requirePlatformAdmin(context as never);
    const { upsertEngine } = await import("@/lib/ai/engines.server");
    await upsertEngine(data, actor);
    return { ok: true as const };
  });

export const toggleEngineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slugInput.extend({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context as never);
    const { setEngineEnabled } = await import("@/lib/ai/engines.server");
    await setEngineEnabled(data.slug, data.enabled);
    return { ok: true as const };
  });

export const setDefaultEngineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slugInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context as never);
    const { setDefaultEngine } = await import("@/lib/ai/engines.server");
    await setDefaultEngine(data.slug);
    return { ok: true as const };
  });

export const savePlatformEngineKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => keyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    const actor = await requirePlatformAdmin(context as never);
    const { setPlatformKey } = await import("@/lib/ai/engines.server");
    await setPlatformKey(data.slug, data.apiKey, context.userId);
    console.info("[ai-engines] platform key stored", { slug: data.slug, actor });
    return { ok: true as const };
  });

export const clearPlatformEngineKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slugInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context as never);
    const { clearPlatformKey } = await import("@/lib/ai/engines.server");
    await clearPlatformKey(data.slug);
    return { ok: true as const };
  });

export const testEngineFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slugInput.parse(d))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin } = await import("@/lib/ops/ops.access");
    await requirePlatformAdmin(context as never);
    const subject = await subjectFor(context);
    const { testEngine } = await import("@/lib/ai/engines.server");
    return testEngine(data.slug, subject.workspaceId ?? null);
  });

/* ------------------------------------------------ workspace-level keys */

async function requireWorkspaceManager(context: { supabase: any; userId: string }) {
  const subject = await subjectFor(context);
  if (!subject.workspaceId) throw new Error("No workspace is active for this account.");
  const { data } = await context.supabase.rpc("workspace_can_manage", {
    _user_id: context.userId,
    _workspace_id: subject.workspaceId,
  });
  if (!data) throw new Error("Only workspace owners and admins can manage AI engine keys.");
  return subject.workspaceId as string;
}

export const saveWorkspaceEngineKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => keyInput.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await requireWorkspaceManager(context);
    const { setWorkspaceKey } = await import("@/lib/ai/engines.server");
    await setWorkspaceKey(workspaceId, data.slug, data.apiKey, context.userId);
    return { ok: true as const };
  });

export const clearWorkspaceEngineKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slugInput.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await requireWorkspaceManager(context);
    const { clearWorkspaceKey } = await import("@/lib/ai/engines.server");
    await clearWorkspaceKey(workspaceId, data.slug);
    return { ok: true as const };
  });
