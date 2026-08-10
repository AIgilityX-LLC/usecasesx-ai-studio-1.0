/**
 * Demo scenario server functions — thin wrappers only (AGENTS.md §3).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const scopeSchema = z.object({
  scenarioKeys: z.array(z.string().min(1)).max(20).optional(),
  includeSampleCopies: z.boolean().optional(),
});

export const copyDemoScenarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ scenarioKey: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { copyScenarioForUser } = await import("@/lib/demo/demo-scenarios.server");
    return copyScenarioForUser(context.supabase, context.userId, data.scenarioKey);
  });

export const listMySampleCopiesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("demo_sample_copies")
      .select("id, scenario_key, scenario_label, template_version, entity_counts, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resetDemoScenarioTemplatesFn = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { demoResetAuthorized } = await import("@/lib/demo/demo-reset.server");
    if (!demoResetAuthorized(data.password)) {
      throw new Error("Demo reset is not authorized in this environment.");
    }
    const { resetDemoScenarioTemplates, assertResetAllowed, logDemoReset } = await import(
      "@/lib/demo/demo-scenarios.server"
    );
    await assertResetAllowed("templates");
    const result = await resetDemoScenarioTemplates();
    await logDemoReset({ scope: "templates", actorLabel: "demo credential", result });
    return result;
  });

/**
 * Signed-in, role-checked reset. Scoped by `demo_scenario_key`; optionally also
 * clears the caller's own sample copies in their own workspace.
 */
export const resetDemoScenariosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scopeSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const {
      resetDemoScenarioTemplates,
      deleteSampleCopiesForUser,
      assertResetAllowed,
      logDemoReset,
    } = await import("@/lib/demo/demo-scenarios.server");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    const email = (profile?.email ?? "").toLowerCase();

    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    const isDemoPersona = email.endsWith("@demo.usecasex.app");
    if (!isAdmin && !isDemoPersona) {
      throw new Error("Only platform admins or demonstration accounts can reset demo scenarios.");
    }

    const scope = data.scenarioKeys?.length ? data.scenarioKeys.join(",") : "all";
    await assertResetAllowed(scope);

    // Templates are service-role work; only platform admins may re-seed them.
    const templates = isAdmin
      ? await resetDemoScenarioTemplates({ scenarioKeys: data.scenarioKeys })
      : { resetAt: new Date().toISOString(), results: [], note: "templates skipped (not admin)" };

    const samples = data.includeSampleCopies
      ? await deleteSampleCopiesForUser(context.supabase, context.userId, data.scenarioKeys)
      : null;

    await logDemoReset({
      actorId: context.userId,
      actorLabel: profile?.full_name ?? email ?? null,
      scope,
      scenarioKey: data.scenarioKeys?.length === 1 ? data.scenarioKeys[0] : null,
      result: { templates, samples } as unknown as Record<string, unknown>,
    });

    return { ...templates, samples };
  });

export const listDemoResetLogFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listDemoResetLog } = await import("@/lib/demo/demo-scenarios.server");
    try {
      return await listDemoResetLog(context.supabase);
    } catch {
      return [];
    }
  });
