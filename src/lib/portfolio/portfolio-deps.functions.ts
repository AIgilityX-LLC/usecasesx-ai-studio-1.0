/**
 * Thin server functions for portfolio dependencies & scenarios.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dependencyInputSchema, scenarioDraftSchema } from "./dependencies-scenarios";

export const listPortfolioDependenciesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ portfolioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listDependencies } = await import("./portfolio-deps.server");
    return listDependencies(context.supabase, data.portfolioId);
  });

export const addPortfolioDependencyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => dependencyInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { addDependency } = await import("./portfolio-deps.server");
    return addDependency(context.supabase, context.userId, data);
  });

export const deletePortfolioDependencyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { softDeleteDependency } = await import("./portfolio-deps.server");
    await softDeleteDependency(context.supabase, data.id);
    return { ok: true };
  });

export const listPortfolioScenariosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ portfolioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listScenarios } = await import("./portfolio-deps.server");
    return listScenarios(context.supabase, data.portfolioId);
  });

export const savePortfolioScenarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        portfolioId: z.string().uuid(),
        draft: scenarioDraftSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { saveScenario } = await import("./portfolio-deps.server");
    return saveScenario(context.supabase, context.userId, data.portfolioId, data.draft);
  });

export const deletePortfolioScenarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { softDeleteScenario } = await import("./portfolio-deps.server");
    await softDeleteScenario(context.supabase, data.id);
    return { ok: true };
  });
