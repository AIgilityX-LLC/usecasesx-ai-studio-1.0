/**
 * Demo scenario server functions — thin wrappers only (AGENTS.md §3).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
    const { resetDemoScenarioTemplates } = await import("@/lib/demo/demo-scenarios.server");
    return resetDemoScenarioTemplates();
  });
