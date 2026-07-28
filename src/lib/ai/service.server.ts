/**
 * AIService — the provider-neutral AI boundary.
 *
 * Server-only. Every AI capability in the product is a method here. Each call:
 *   1. re-checks the caller's `ai.assist` entitlement (never trusts the UI),
 *   2. enforces fair-use limits from `ai_usage_events`,
 *   3. resolves a model from the provider-neutral registry,
 *   4. validates the structured output with Zod BEFORE returning it,
 *   5. records an attributable usage event (success or failure),
 *   6. stamps provenance so no caller can mistake AI text for human text.
 *
 * Failures degrade to a typed, user-safe `AiResult` — never a throw — so the
 * core journey keeps working when AI is unavailable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { evaluate } from "@/lib/authz/permission-service";
import { resolveSubject } from "@/lib/authz.server";
import { callGateway } from "./gateway.server";
import { evaluateFairUse, isMetered, limitsForEdition } from "./fair-use";
import { resolveModel, type ProviderAlias } from "./models";
import { promptFor, type AiTask } from "./prompts";
import { OUTPUT_SCHEMAS, TOOL_SCHEMAS } from "./schemas";
import type {
  EnrichOpportunityOutput,
  DraftUseCaseOutput,
  RecommendCapabilitiesOutput,
  ExplainScoreOutput,
  FindSimilarUseCasesOutput,
  GenerateExecutiveSummaryOutput,
} from "./schemas";
import { aiFailure, type AiFairUse, type AiResult } from "./types";

export type AiCallContext = {
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  /** Optional entity the output relates to, recorded for attribution. */
  entity?: { type: string; id: string } | null;
  providerAlias?: ProviderAlias | null;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function countUsage(
  supabase: SupabaseClient<any, any, any>,
  column: "user_id" | "workspace_id",
  value: string,
  since: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .eq("status", "ok")
    .gte("created_at", since);
  if (error) {
    console.error("[ai] fair-use count failed", { column, code: error.code });
    return 0;
  }
  return count ?? 0;
}

async function recordUsage(
  ctx: AiCallContext,
  subject: { organizationId: string | null; workspaceId: string | null },
  row: {
    task: AiTask;
    model: string;
    providerAlias: string;
    status: "ok" | "error";
    errorKind?: string | null;
    durationMs: number;
    usage?: { prompt: number | null; completion: number | null; total: number | null };
    promptVersion: string;
  },
) {
  const { error } = await ctx.supabase.from("ai_usage_events").insert({
    user_id: ctx.userId,
    organization_id: subject.organizationId,
    workspace_id: subject.workspaceId,
    task: row.task,
    model: row.model,
    provider_alias: row.providerAlias,
    status: row.status,
    error_kind: row.errorKind ?? null,
    duration_ms: row.durationMs,
    prompt_tokens: row.usage?.prompt ?? null,
    completion_tokens: row.usage?.completion ?? null,
    total_tokens: row.usage?.total ?? null,
    entity_type: ctx.entity?.type ?? null,
    entity_id: ctx.entity?.id ?? null,
    prompt_version: row.promptVersion,
  });
  // Usage logging must never break the user's action.
  if (error) console.error("[ai] usage logging failed", { code: error.code });
}

/** Generic execution pipeline shared by every AIService method. */
async function run<T>(
  task: AiTask,
  ctx: AiCallContext,
  userPrompt: string,
): Promise<AiResult<T>> {
  const prompt = promptFor(task);
  const schema = OUTPUT_SCHEMAS[task] as z.ZodType<T>;
  const alias = ctx.providerAlias ?? null;
  const model = resolveModel(prompt.tier, alias);

  let subject: Awaited<ReturnType<typeof resolveSubject>>;
  try {
    subject = await resolveSubject(ctx.supabase, ctx.userId);
  } catch (error) {
    console.error("[ai] subject resolution failed", error);
    return aiFailure("unauthenticated");
  }

  // 1. Entitlement — the server is the security boundary, not hidden buttons.
  if (!evaluate(subject, "ai.assist").allowed) return aiFailure("forbidden");

  // 2. Fair use.
  let fairUse: AiFairUse | null = null;
  if (isMetered(task)) {
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const since = windowStart.toISOString();
    const limits = limitsForEdition(subject.edition, process.env);
    const [usedByUser, usedByWorkspace] = await Promise.all([
      countUsage(ctx.supabase, "user_id", ctx.userId, since),
      subject.workspaceId
        ? countUsage(ctx.supabase, "workspace_id", subject.workspaceId, since)
        : Promise.resolve(0),
    ]);
    const verdict = evaluateFairUse(usedByUser, usedByWorkspace, limits, windowStart);
    fairUse = { used: verdict.used, limit: verdict.limit, resetsAt: verdict.resetsAt };
    if (!verdict.allowed) return aiFailure("fair_use_exceeded", fairUse);
  }

  // 3. Provider call.
  const startedAt = Date.now();
  const response = await callGateway({
    model,
    system: prompt.system,
    user: userPrompt,
    tool: TOOL_SCHEMAS[task],
    toolName: (TOOL_SCHEMAS[task] as any).function.name,
    timeoutMs: prompt.timeoutMs,
    retries: prompt.retries,
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    await recordUsage(ctx, subject, {
      task,
      model,
      providerAlias: alias ?? prompt.tier,
      status: "error",
      errorKind: response.kind,
      durationMs,
      promptVersion: prompt.version,
    });
    return aiFailure(response.kind, fairUse);
  }

  // 4. Validate before anything is returned or written.
  const parsed = schema.safeParse(response.args);
  if (!parsed.success) {
    console.error("[ai] structured output failed validation", { task, model });
    await recordUsage(ctx, subject, {
      task,
      model,
      providerAlias: alias ?? prompt.tier,
      status: "error",
      errorKind: "invalid_output",
      durationMs,
      usage: response.usage,
      promptVersion: prompt.version,
    });
    return aiFailure("invalid_output", fairUse);
  }

  await recordUsage(ctx, subject, {
    task,
    model,
    providerAlias: alias ?? prompt.tier,
    status: "ok",
    durationMs,
    usage: response.usage,
    promptVersion: prompt.version,
  });

  return {
    ok: true,
    data: parsed.data,
    provenance: {
      task,
      providerAlias: alias,
      model,
      promptVersion: prompt.version,
      generatedAt: new Date().toISOString(),
      durationMs,
      aiGenerated: true,
    },
    fairUse: fairUse
      ? { ...fairUse, used: fairUse.used + 1 }
      : null,
    error: null,
  };
}

function lines(parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join("\n");
}

/* ------------------------------------------------------------- AIService */

export const AIService = {
  enrichOpportunity(
    ctx: AiCallContext,
    input: { title: string; description: string; industry?: string; organization?: string },
  ): Promise<AiResult<EnrichOpportunityOutput>> {
    return run("enrichOpportunity", ctx, lines([
      input.organization && `Organisation: ${input.organization}`,
      input.industry && `Industry: ${input.industry}`,
      `Opportunity title: ${input.title}`,
      `Description as captured by the author:\n${input.description}`,
    ]));
  },

  draftUseCase(
    ctx: AiCallContext,
    input: { organization: string; industry?: string; objective: string; context?: string },
  ): Promise<AiResult<DraftUseCaseOutput>> {
    return run("draftUseCase", ctx, lines([
      `Organisation: ${input.organization}`,
      input.industry && `Industry: ${input.industry}`,
      `Objective / question: ${input.objective}`,
      input.context && `Additional context:\n${input.context}`,
    ]));
  },

  recommendCapabilities(
    ctx: AiCallContext,
    input: { title: string; description: string; dataAvailable?: string[] },
  ): Promise<AiResult<RecommendCapabilitiesOutput>> {
    return run("recommendCapabilities", ctx, lines([
      `Use case: ${input.title}`,
      `Description:\n${input.description}`,
      input.dataAvailable?.length && `Data already available: ${input.dataAvailable.join(", ")}`,
    ]));
  },

  explainScore(
    ctx: AiCallContext,
    input: {
      title: string;
      totalScore: number;
      dimensions: Record<string, number>;
    },
  ): Promise<AiResult<ExplainScoreOutput>> {
    const dims = Object.entries(input.dimensions)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");
    return run("explainScore", ctx, lines([
      `Use case: ${input.title}`,
      `Weighted total score: ${input.totalScore}`,
      `Dimension scores (0-5):\n${dims}`,
    ]));
  },

  findSimilarUseCases(
    ctx: AiCallContext,
    input: {
      reference: { title: string; summary: string };
      candidates: Array<{ slug: string; title: string; summary?: string }>;
    },
  ): Promise<AiResult<FindSimilarUseCasesOutput>> {
    const candidates = input.candidates
      .slice(0, 60)
      .map((c) => `- ${c.slug} :: ${c.title}${c.summary ? ` — ${c.summary}` : ""}`)
      .join("\n");
    return run("findSimilarUseCases", ctx, lines([
      `Reference use case: ${input.reference.title}`,
      `Reference summary: ${input.reference.summary}`,
      `Candidates (choose only from these slugs):\n${candidates}`,
    ]));
  },

  generateExecutiveSummary(
    ctx: AiCallContext,
    input: {
      portfolioName: string;
      useCases: Array<{ title: string; priority?: string; score?: number }>;
      objective?: string;
    },
  ): Promise<AiResult<GenerateExecutiveSummaryOutput>> {
    const items = input.useCases
      .slice(0, 80)
      .map(
        (u) =>
          `- ${u.title}${u.priority ? ` (priority: ${u.priority})` : ""}${
            typeof u.score === "number" ? ` (score: ${u.score})` : ""
          }`,
      )
      .join("\n");
    return run("generateExecutiveSummary", ctx, lines([
      `Portfolio: ${input.portfolioName}`,
      input.objective && `Stated objective: ${input.objective}`,
      `Use cases in the portfolio (${input.useCases.length} total):\n${items}`,
    ]));
  },
};

export type AIServiceApi = typeof AIService;
