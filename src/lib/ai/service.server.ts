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
import { sharedGatewayCircuit } from "./circuit-breaker";
import {
  BURST_WINDOW_MS,
  burstLimitsForEdition,
  evaluateBurst,
  evaluateFairUse,
  isMetered,
  limitsForEdition,
} from "./fair-use";
import { FENCE_NOTICE, fenceUntrusted } from "./sanitize";
import { resolveModel, type ProviderAlias } from "./models";
import { briefToLines, type StudioBrief } from "./engines";
import { promptFor, type AiTask } from "./prompts";
import { OUTPUT_SCHEMAS, TOOL_SCHEMAS } from "./schemas";
import type {
  EnrichOpportunityOutput,
  DraftUseCaseOutput,
  RecommendCapabilitiesOutput,
  ExplainScoreOutput,
  SuggestScoreEvidenceOutput,
  FindSimilarUseCasesOutput,
  GenerateExecutiveSummaryOutput,
  RewriteTextOutput,
  ClassifyContentOutput,
  CompareOptionsOutput,
  FindGapsOutput,
  GenerateQuestionsOutput,
  SummarizeEvidenceOutput,
  DraftBriefOutput,
} from "./schemas";
import { aiFailure, type AiFairUse, type AiResult } from "./types";
import { AI_CONFIDENCE_CAVEAT, TRAINING_POLICY } from "./feedback";
import { writeAuditEvent } from "@/lib/telemetry/recorder.server";
import { AUDIT_EVENTS } from "@/lib/telemetry/events";

export type AiCallContext = {
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  /** Optional entity the output relates to, recorded for attribution. */
  entity?: { type: string; id: string } | null;
  providerAlias?: ProviderAlias | null;
  /** Configured research engine slug. Overrides the alias when resolvable. */
  engineSlug?: string | null;
  /** Authorized grounded sources (from retrieveAuthorizedContext). */
  citations?: Array<{ id: string; kind: string; title: string }>;
  /** Extra prompt block from authorized retrieval — never secrets. */
  groundedPromptBlock?: string | null;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function countUsage(
  supabase: SupabaseClient<any, any, any>,
  column: "user_id" | "workspace_id",
  value: string,
  since: string,
  /** Burst counting includes failures: a failed call still costs a request. */
  onlySuccess = true,
): Promise<number> {
  let query = supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", since);
  if (onlySuccess) query = query.eq("status", "ok");
  const { count, error } = await query;
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
async function run<T>(task: AiTask, ctx: AiCallContext, userPrompt: string): Promise<AiResult<T>> {
  const prompt = promptFor(task);
  const schema = OUTPUT_SCHEMAS[task] as unknown as z.ZodType<T>;
  const alias = ctx.providerAlias ?? null;
  let model = resolveModel(prompt.tier, alias);
  let endpoint: string | null = null;
  let engineKey: string | null = null;
  let engineSlug: string | null = null;

  let subject: Awaited<ReturnType<typeof resolveSubject>>;
  try {
    subject = await resolveSubject(ctx.supabase, ctx.userId);
  } catch (error) {
    console.error("[ai] subject resolution failed", error);
    return aiFailure("unauthenticated");
  }

  // 1. Entitlement — the server is the security boundary, not hidden buttons.
  if (!evaluate(subject, "ai.assist").allowed) {
    await writeAuditEvent(
      { supabase: ctx.supabase, userId: ctx.userId, tenant: subject },
      {
        event: AUDIT_EVENTS.aiAssistDenied,
        entity: { type: ctx.entity?.type ?? "ai_task", id: ctx.entity?.id ?? null },
        next: { task, reason: "entitlement" },
        severity: "notice",
        source: "ai",
      },
    );
    return aiFailure("forbidden");
  }

  // 1a. Tenant AI-provider route policy (V2-18 / FR-18).
  if (subject.organizationId) {
    try {
      const { assertAiRouteAllowed } = await import("@/lib/enterprise/tenant-policy");
      const { data: orgRow } = await ctx.supabase
        .from("organizations")
        .select("allowed_ai_provider_routes")
        .eq("id", subject.organizationId)
        .maybeSingle();
      const routes = (orgRow as { allowed_ai_provider_routes?: string[] } | null)
        ?.allowed_ai_provider_routes;
      const gate = assertAiRouteAllowed(routes, alias);
      if (!gate.allowed) {
        await writeAuditEvent(
          { supabase: ctx.supabase, userId: ctx.userId, tenant: subject },
          {
            event: AUDIT_EVENTS.aiAssistDenied,
            entity: { type: ctx.entity?.type ?? "ai_task", id: ctx.entity?.id ?? null },
            next: { task, reason: gate.reason, route: gate.route },
            severity: "notice",
            source: "ai",
          },
        );
        return aiFailure("forbidden");
      }
    } catch (error) {
      console.error("[ai] tenant route policy check failed", error);
    }
  }

  // 1b. Research engine — admin-configured catalog wins over the alias.
  if (ctx.engineSlug) {
    try {
      const { resolveEngineForCall } = await import("./engines.server");
      const engine = await resolveEngineForCall(
        ctx.engineSlug,
        subject.workspaceId ?? null,
        subject.edition,
      );
      if (engine) {
        model = engine.model;
        endpoint = engine.endpoint;
        engineKey = engine.apiKey;
        engineSlug = engine.slug;
      }
    } catch (error) {
      // A misconfigured engine must never break the journey — fall back.
      console.error("[ai] engine resolution failed", { slug: ctx.engineSlug, error });
    }
  }

  // 2. Fair use.
  let fairUse: AiFairUse | null = null;
  if (isMetered(task)) {
    // 2a. Burst window first — it is the cheapest way to stop cost abuse.
    const burstStart = new Date(Date.now() - BURST_WINDOW_MS);
    const burstSince = burstStart.toISOString();
    const burstLimits = burstLimitsForEdition(subject.edition, process.env);
    const [burstUser, burstWorkspace] = await Promise.all([
      countUsage(ctx.supabase, "user_id", ctx.userId, burstSince, false),
      subject.workspaceId
        ? countUsage(ctx.supabase, "workspace_id", subject.workspaceId, burstSince, false)
        : Promise.resolve(0),
    ]);
    const burst = evaluateBurst(burstUser, burstWorkspace, burstLimits, burstStart);
    if (!burst.allowed) {
      const { recordRateLimitEnforced } = await import("@/lib/observability/observability.server");
      await recordRateLimitEnforced(ctx.supabase, ctx.userId, {
        task,
        kind: "burst",
        used: burst.used,
        limit: burst.limit,
        resetsAt: burst.resetsAt,
        workspaceId: subject.workspaceId,
        organizationId: subject.organizationId,
      });
      return aiFailure("rate_limited", {
        used: burst.used,
        limit: burst.limit,
        resetsAt: burst.resetsAt,
      });
    }

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
    if (!verdict.allowed) {
      const { recordRateLimitEnforced } = await import("@/lib/observability/observability.server");
      await recordRateLimitEnforced(ctx.supabase, ctx.userId, {
        task,
        kind: "fair_use",
        used: verdict.used,
        limit: verdict.limit,
        resetsAt: verdict.resetsAt,
        workspaceId: subject.workspaceId,
        organizationId: subject.organizationId,
      });
      return aiFailure("fair_use_exceeded", fairUse);
    }
  }

  // 2b. Circuit breaker — pause after repeated upstream failures.
  const circuit = sharedGatewayCircuit();
  if (!circuit.allow()) {
    return aiFailure("circuit_open", fairUse);
  }

  // 3. Provider call.
  const startedAt = Date.now();
  const grounded = ctx.groundedPromptBlock?.trim() ? `\n\n${ctx.groundedPromptBlock.trim()}` : "";
  const response = await callGateway({
    model,
    system: `${prompt.system}\n\n${FENCE_NOTICE}`,
    user: `${fenceUntrusted(userPrompt)}${grounded}`,
    tool: TOOL_SCHEMAS[task],
    toolName: (TOOL_SCHEMAS[task] as any).function.name,
    timeoutMs: prompt.timeoutMs,
    retries: prompt.retries,
    endpoint,
    apiKey: engineKey,
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    if (
      response.kind === "upstream" ||
      response.kind === "network" ||
      response.kind === "timeout" ||
      response.kind === "rate_limited"
    ) {
      circuit.recordFailure();
    }
    await recordUsage(ctx, subject, {
      task,
      model,
      providerAlias: engineSlug ?? alias ?? prompt.tier,
      status: "error",
      errorKind: response.kind,
      durationMs,
      promptVersion: prompt.version,
    });
    return aiFailure(response.kind, fairUse);
  }

  circuit.recordSuccess();

  // 4. Validate before anything is returned or written.
  const parsed = schema.safeParse(response.args);
  if (!parsed.success) {
    console.error("[ai] structured output failed validation", { task, model });
    await recordUsage(ctx, subject, {
      task,
      model,
      providerAlias: engineSlug ?? alias ?? prompt.tier,
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
    providerAlias: engineSlug ?? alias ?? prompt.tier,
    status: "ok",
    durationMs,
    usage: response.usage,
    promptVersion: prompt.version,
  });

  await writeAuditEvent(
    { supabase: ctx.supabase, userId: ctx.userId, tenant: subject },
    {
      event: AUDIT_EVENTS.aiAssistUsed,
      entity: { type: ctx.entity?.type ?? "ai_task", id: ctx.entity?.id ?? null },
      // Redacted: task/model/version/latency only — never prompt or output bodies.
      next: { task, model, prompt_version: prompt.version, duration_ms: durationMs },
      source: "ai",
    },
  );

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
    fairUse: fairUse ? { ...fairUse, used: fairUse.used + 1 } : null,
    citations: (ctx.citations ?? []).map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
    })),
    confidenceCaveat: AI_CONFIDENCE_CAVEAT,
    trainingPolicy: TRAINING_POLICY,
    error: null,
  };
}

function lines(parts: Array<unknown>): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join("\n");
}

/* ------------------------------------------------------------- AIService */

export const AIService = {
  enrichOpportunity(
    ctx: AiCallContext,
    input: { title: string; description: string; industry?: string; organization?: string },
  ): Promise<AiResult<EnrichOpportunityOutput>> {
    return run(
      "enrichOpportunity",
      ctx,
      lines([
        input.organization && `Organisation: ${input.organization}`,
        input.industry && `Industry: ${input.industry}`,
        `Opportunity title: ${input.title}`,
        `Description as captured by the author:\n${input.description}`,
      ]),
    );
  },

  draftUseCase(
    ctx: AiCallContext,
    input: {
      organization: string;
      industry?: string;
      objective: string;
      context?: string;
      brief?: StudioBrief | null;
    },
  ): Promise<AiResult<DraftUseCaseOutput>> {
    const brief = input.brief ? briefToLines(input.brief).join("\n") : "";
    return run(
      "draftUseCase",
      ctx,
      lines([
        `Organisation: ${input.organization}`,
        input.industry && `Industry: ${input.industry}`,
        `Objective / question: ${input.objective}`,
        input.context && `Additional context:\n${input.context}`,
        brief && `Brief parameters set by the author:\n${brief}`,
      ]),
    );
  },

  recommendCapabilities(
    ctx: AiCallContext,
    input: { title: string; description: string; dataAvailable?: string[] },
  ): Promise<AiResult<RecommendCapabilitiesOutput>> {
    return run(
      "recommendCapabilities",
      ctx,
      lines([
        `Use case: ${input.title}`,
        `Description:\n${input.description}`,
        input.dataAvailable?.length && `Data already available: ${input.dataAvailable.join(", ")}`,
      ]),
    );
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
    return run(
      "explainScore",
      ctx,
      lines([
        `Use case: ${input.title}`,
        `Weighted total score: ${input.totalScore}`,
        `Dimension scores (0-5):\n${dims}`,
      ]),
    );
  },

  /**
   * Propose evidence for scoring criteria. The output schema carries no numeric
   * field, so this can never influence the deterministic score — it only tells
   * a reviewer what to go and find.
   */
  suggestScoreEvidence(
    ctx: AiCallContext,
    input: {
      title: string;
      context?: string;
      criteria: Array<{ id: string; label: string; dimension: string; help?: string }>;
    },
  ): Promise<AiResult<SuggestScoreEvidenceOutput>> {
    const criteria = input.criteria
      .slice(0, 40)
      .map((c) => `- ${c.id} :: [${c.dimension}] ${c.label}${c.help ? ` — ${c.help}` : ""}`)
      .join("\n");
    return run(
      "suggestScoreEvidence",
      ctx,
      lines([
        `Use case: ${input.title}`,
        input.context && `Use-case context supplied by the author:\n${input.context}`,
        `Criteria to support (return one item per criterionId, verbatim):\n${criteria}`,
      ]),
    );
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
    return run(
      "findSimilarUseCases",
      ctx,
      lines([
        `Reference use case: ${input.reference.title}`,
        `Reference summary: ${input.reference.summary}`,
        `Candidates (choose only from these slugs):\n${candidates}`,
      ]),
    );
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
    return run(
      "generateExecutiveSummary",
      ctx,
      lines([
        `Portfolio: ${input.portfolioName}`,
        input.objective && `Stated objective: ${input.objective}`,
        `Use cases in the portfolio (${input.useCases.length} total):\n${items}`,
      ]),
    );
  },

  rewriteText(
    ctx: AiCallContext,
    input: { text: string; intent?: string },
  ): Promise<AiResult<RewriteTextOutput>> {
    return run(
      "rewriteText",
      ctx,
      lines([input.intent && `Rewrite intent: ${input.intent}`, `Text to rewrite:\n${input.text}`]),
    );
  },

  classifyContent(
    ctx: AiCallContext,
    input: { text: string; allowedLabels: string[] },
  ): Promise<AiResult<ClassifyContentOutput>> {
    return run(
      "classifyContent",
      ctx,
      lines([`Allowed labels: ${input.allowedLabels.join(" | ")}`, `Content:\n${input.text}`]),
    );
  },

  compareOptions(
    ctx: AiCallContext,
    input: {
      criteria: string[];
      options: Array<{ id: string; title: string; facts: string }>;
    },
  ): Promise<AiResult<CompareOptionsOutput>> {
    const opts = input.options
      .slice(0, 8)
      .map((o) => `- ${o.id} :: ${o.title}\n  Facts: ${o.facts}`)
      .join("\n");
    return run(
      "compareOptions",
      ctx,
      lines([`Criteria: ${input.criteria.join("; ")}`, `Options:\n${opts}`]),
    );
  },

  findGaps(
    ctx: AiCallContext,
    input: { title: string; record: string },
  ): Promise<AiResult<FindGapsOutput>> {
    return run(
      "findGaps",
      ctx,
      lines([`Record title: ${input.title}`, `Record content:\n${input.record}`]),
    );
  },

  generateQuestions(
    ctx: AiCallContext,
    input: { topic: string; context?: string },
  ): Promise<AiResult<GenerateQuestionsOutput>> {
    return run(
      "generateQuestions",
      ctx,
      lines([`Topic: ${input.topic}`, input.context && `Context:\n${input.context}`]),
    );
  },

  summarizeEvidence(
    ctx: AiCallContext,
    input: { items: Array<{ id: string; title: string; excerpt: string }> },
  ): Promise<AiResult<SummarizeEvidenceOutput>> {
    const block = input.items
      .slice(0, 40)
      .map((i) => `- [${i.id}] ${i.title}: ${i.excerpt}`)
      .join("\n");
    return run("summarizeEvidence", ctx, lines([`Evidence items:\n${block}`]));
  },

  draftBrief(
    ctx: AiCallContext,
    input: { title: string; confirmedFields: string },
  ): Promise<AiResult<DraftBriefOutput>> {
    return run(
      "draftBrief",
      ctx,
      lines([`Brief title: ${input.title}`, `Confirmed fields:\n${input.confirmedFields}`]),
    );
  },
};

export type AIServiceApi = typeof AIService;
