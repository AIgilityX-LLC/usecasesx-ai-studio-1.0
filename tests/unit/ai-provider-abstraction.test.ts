import { describe, expect, test } from "bun:test";
import {
  AI_PROVIDER_CATALOGUE,
  AI_PROVIDER_IDS,
  DEFAULT_AI_PROVIDER_CONFIG,
  DEFAULT_AI_PROVIDER_POLICY,
  PROFILE_AI_PROVIDER_POLICY,
  PROVIDER_ALIAS_META,
  assertAiProviderAllowed,
  fromSovereigntyAiPolicy,
  listAiProviders,
  loadAiProviderConfig,
  providerIdFromRouteKey,
} from "@/lib/ai";

describe("AIProvider catalogue", () => {
  test("lists required future adapters as planned", () => {
    for (const id of [
      "openai",
      "anthropic",
      "azure_openai",
      "bedrock",
      "google_vertex",
      "private_endpoint",
      "local_llm",
    ] as const) {
      expect(AI_PROVIDER_IDS).toContain(id);
      expect(AI_PROVIDER_CATALOGUE[id].status).toBe("planned");
    }
    expect(AI_PROVIDER_CATALOGUE.lovable_gateway.status).toBe("active");
    expect(AI_PROVIDER_CATALOGUE.openai_compatible.status).toBe("active");
    expect(listAiProviders("active").map((p) => p.id).sort()).toEqual([
      "lovable_gateway",
      "openai_compatible",
    ]);
  });

  test("active adapters declare extractStructuredData capability", () => {
    for (const p of listAiProviders("active")) {
      expect(p.capabilities).toContain("extractStructuredData");
    }
  });
});

describe("AiProviderConfig", () => {
  test("loads defaults and env overrides", () => {
    expect(DEFAULT_AI_PROVIDER_CONFIG.provider).toBe("lovable_gateway");
    const cfg = loadAiProviderConfig({
      AI_PROVIDER: "openai_compatible",
      AI_TIMEOUT_MS: "12000",
      AI_RETRIES: "2",
      AI_TOKEN_LIMIT: "4096",
      AI_LOGGING_POLICY: "standard",
      AI_PII_HANDLING: "block_if_detected",
      AI_DATA_RETENTION_POLICY: "ephemeral",
      AI_REGION: "eu",
    });
    expect(cfg.provider).toBe("openai_compatible");
    expect(cfg.timeoutMs).toBe(12000);
    expect(cfg.retries).toBe(2);
    expect(cfg.tokenLimit).toBe(4096);
    expect(cfg.region).toBe("eu");
    expect(cfg.loggingPolicy).toBe("standard");
    expect(cfg.piiHandling).toBe("block_if_detected");
    expect(cfg.dataRetentionPolicy).toBe("ephemeral");
  });

  test("falls back when AI_PROVIDER is unknown", () => {
    expect(loadAiProviderConfig({ AI_PROVIDER: "not-a-provider" }).provider).toBe(
      "lovable_gateway",
    );
  });
});

describe("AIProviderPolicy", () => {
  test("prohibits and permits by tenant policy", () => {
    const policy = {
      ...DEFAULT_AI_PROVIDER_POLICY,
      prohibitedProviders: ["openai" as const],
      permittedProviders: ["lovable_gateway" as const, "openai_compatible" as const],
    };
    expect(assertAiProviderAllowed(policy, "lovable_gateway").allowed).toBe(true);
    expect(assertAiProviderAllowed(policy, "openai").reason).toBe("ai_provider_prohibited");
    expect(assertAiProviderAllowed(policy, "bedrock").reason).toBe("ai_provider_not_permitted");
  });

  test("deployment profile packs tighten sovereign private", () => {
    const policy = PROFILE_AI_PROVIDER_POLICY.sovereign_private;
    expect(assertAiProviderAllowed(policy, "local_llm").allowed).toBe(true);
    expect(assertAiProviderAllowed(policy, "openai").allowed).toBe(false);
  });

  test("bridges sovereignty route keys", () => {
    expect(providerIdFromRouteKey("default")).toBe("lovable_gateway");
    expect(providerIdFromRouteKey("local")).toBe("local_llm");
    const bridged = fromSovereigntyAiPolicy({
      permittedProviders: ["default", "local"],
      prohibitedProviders: ["openai"],
    });
    // "openai" alias maps to gateway route historically — prohibited list uses provider ids
    expect(bridged.permittedProviders).toContain("lovable_gateway");
    expect(bridged.permittedProviders).toContain("local_llm");
  });
});

describe("UI alias meta", () => {
  test("Studio labels come from registry — not vendor SDK imports", () => {
    expect(PROVIDER_ALIAS_META.gemini.label.length).toBeGreaterThan(0);
    expect(PROVIDER_ALIAS_META.openai.tagline.toLowerCase()).not.toContain("api.openai.com");
  });
});
