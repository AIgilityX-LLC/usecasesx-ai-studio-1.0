/**
 * AI boundary unit tests — no network, no database.
 *
 * Verifies: model resolution is provider-neutral, prompts are versioned,
 * structured outputs are validated before use, fair-use maths is correct,
 * gateway failures are normalised to user-safe kinds, and no secret is
 * present in the client-safe barrel.
 */

import { describe, expect, it, afterEach } from "bun:test";

import { PROVIDER_ALIASES, resolveModel, isProviderAlias } from "../../src/lib/ai/models";
import { PROMPT_REGISTRY, AI_TASKS } from "../../src/lib/ai/prompts";
import { OUTPUT_SCHEMAS, TOOL_SCHEMAS, draftUseCaseSchema } from "../../src/lib/ai/schemas";
import { evaluateFairUse, limitsForEdition } from "../../src/lib/ai/fair-use";
import { AI_ERROR_MESSAGES, aiFailure } from "../../src/lib/ai/types";
import { callGateway } from "../../src/lib/ai/gateway.server";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(impl: (input: any, init: any) => Promise<Response> | Response) {
  globalThis.fetch = impl as unknown as typeof fetch;
}

function gatewayRequest(overrides: Partial<Parameters<typeof callGateway>[0]> = {}) {
  return {
    model: "test/model",
    system: "system",
    user: "user",
    tool: TOOL_SCHEMAS.draftUseCase,
    toolName: "draft_ai_use_case",
    timeoutMs: 2_000,
    retries: 0,
    ...overrides,
  };
}

describe("model registry", () => {
  it("resolves every alias to a namespaced gateway model id", () => {
    for (const alias of PROVIDER_ALIASES) {
      expect(resolveModel("balanced", alias)).toMatch(/^[a-z0-9-]+\/.+/);
    }
  });

  it("falls back to the task tier when no alias is supplied", () => {
    expect(resolveModel("deep", null)).toBe(resolveModel("deep"));
    expect(resolveModel("fast")).not.toBe(resolveModel("deep"));
  });

  it("rejects unknown aliases", () => {
    expect(isProviderAlias("anthropic-direct")).toBe(false);
    expect(isProviderAlias("gemini")).toBe(true);
  });
});

describe("prompt & schema registry", () => {
  it("defines a versioned prompt, schema and tool for every task", () => {
    for (const task of AI_TASKS) {
      expect(PROMPT_REGISTRY[task].version).toMatch(/^\d{4}-\d{2}-\d{2}\./);
      expect(PROMPT_REGISTRY[task].timeoutMs).toBeGreaterThan(0);
      expect(OUTPUT_SCHEMAS[task]).toBeDefined();
      expect(TOOL_SCHEMAS[task].function.name.length).toBeGreaterThan(0);
    }
  });

  it("rejects a malformed model output", () => {
    const bad = draftUseCaseSchema.safeParse({ title: "x" });
    expect(bad.success).toBe(false);
  });

  it("accepts a well-formed model output", () => {
    const good = draftUseCaseSchema.safeParse({
      title: "Claims triage copilot",
      summary: "s",
      problemStatement: "p",
      proposedSolution: "sol",
      aiCapabilities: ["NLP"],
      aiType: "Generative",
      businessFunction: "Claims",
      targetUsers: ["Adjuster"],
      dataRequirements: ["Claims history"],
      roiAreas: ["Cycle time"],
      valuePotential: "High",
      complexity: "Medium",
      riskLevel: "Medium",
      timeToValue: "3-6 months",
      governanceConsiderations: ["Human review"],
      kpis: ["Average handling time"],
      nextSteps: ["Data discovery"],
    });
    expect(good.success).toBe(true);
  });
});

describe("fair use", () => {
  it("gives Pro a larger budget than Lite", () => {
    expect(limitsForEdition("pro").perUserPerDay).toBeGreaterThan(
      limitsForEdition("lite").perUserPerDay,
    );
  });

  it("honours environment overrides", () => {
    expect(limitsForEdition("pro", { AI_FAIR_USE_PER_USER_PER_DAY: "3" }).perUserPerDay).toBe(3);
    expect(limitsForEdition("pro", { AI_FAIR_USE_PER_USER_PER_DAY: "0" }).perUserPerDay).toBe(
      limitsForEdition("pro").perUserPerDay,
    );
  });

  it("allows a request below both limits", () => {
    const v = evaluateFairUse(1, 2, { perUserPerDay: 5, perWorkspacePerDay: 10 }, new Date());
    expect(v.allowed).toBe(true);
  });

  it("blocks on the per-user limit", () => {
    const v = evaluateFairUse(5, 0, { perUserPerDay: 5, perWorkspacePerDay: 10 }, new Date());
    expect(v.allowed).toBe(false);
    expect(v.limit).toBe(5);
  });

  it("blocks on the per-workspace limit and reports the workspace figure", () => {
    const v = evaluateFairUse(1, 10, { perUserPerDay: 5, perWorkspacePerDay: 10 }, new Date());
    expect(v.allowed).toBe(false);
    expect(v.used).toBe(10);
    expect(v.limit).toBe(10);
  });
});

describe("gateway transport (mocked)", () => {
  it("reports not_configured when no key is present", async () => {
    const saved = process.env.LOVABLE_API_KEY;
    delete process.env.LOVABLE_API_KEY;
    const res = await callGateway(gatewayRequest());
    if (saved) process.env.LOVABLE_API_KEY = saved;
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.kind).toBe("not_configured");
  });

  it("parses a valid tool call", async () => {
    process.env.LOVABLE_API_KEY = "test-key";
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  tool_calls: [{ function: { arguments: JSON.stringify({ title: "ok" }) } }],
                },
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
          { status: 200 },
        ),
    );
    const res = await callGateway(gatewayRequest());
    expect(res.ok).toBe(true);
    expect(res.ok === true && (res.args as any).title).toBe("ok");
    expect(res.ok === true && res.usage.total).toBe(15);
  });

  it("never leaks the API key into the response envelope", async () => {
    process.env.LOVABLE_API_KEY = "super-secret-key";
    let sentAuth: string | null = null;
    mockFetch(async (_input, init) => {
      sentAuth = (init.headers as Record<string, string>).Authorization;
      return new Response("upstream exploded: super-secret-key", { status: 500 });
    });
    const res = await callGateway(gatewayRequest());
    expect(sentAuth).toContain("super-secret-key");
    expect(JSON.stringify(res)).not.toContain("super-secret-key");
    expect(res.ok === false && res.kind).toBe("upstream");
  });

  it("maps 429 and 402 to distinct kinds", async () => {
    process.env.LOVABLE_API_KEY = "test-key";
    mockFetch(async () => new Response("", { status: 429 }));
    expect((await callGateway(gatewayRequest())).ok).toBe(false);
    const rate = await callGateway(gatewayRequest());
    expect(rate.ok === false && rate.kind).toBe("rate_limited");

    mockFetch(async () => new Response("", { status: 402 }));
    const credits = await callGateway(gatewayRequest());
    expect(credits.ok === false && credits.kind).toBe("credits_exhausted");
  });

  it("flags an unparsable structured response", async () => {
    process.env.LOVABLE_API_KEY = "test-key";
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { tool_calls: [{ function: { arguments: "{not json" } }] } }],
          }),
          { status: 200 },
        ),
    );
    const res = await callGateway(gatewayRequest());
    expect(res.ok === false && res.kind).toBe("invalid_output");
  });

  it("retries transient failures then gives up", async () => {
    process.env.LOVABLE_API_KEY = "test-key";
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response("", { status: 503 });
    });
    const res = await callGateway(gatewayRequest({ retries: 2 }));
    expect(calls).toBe(3);
    expect(res.ok === false && res.kind).toBe("upstream");
  });

  it("does not retry a terminal failure", async () => {
    process.env.LOVABLE_API_KEY = "test-key";
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return new Response("", { status: 402 });
    });
    await callGateway(gatewayRequest({ retries: 2 }));
    expect(calls).toBe(1);
  });
});

describe("error envelope", () => {
  it("returns a user-safe message for every failure kind", () => {
    for (const kind of Object.keys(AI_ERROR_MESSAGES) as Array<keyof typeof AI_ERROR_MESSAGES>) {
      const failure = aiFailure(kind);
      expect(failure.ok).toBe(false);
      expect(failure.error).toBe(AI_ERROR_MESSAGES[kind]);
      expect(failure.error).not.toMatch(/gateway\.lovable|api[_-]?key|postgres|supabase/i);
    }
  });
});
