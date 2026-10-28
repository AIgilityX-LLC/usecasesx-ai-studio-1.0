import { describe, expect, test } from "bun:test";
import {
  AI_PROVIDER_IDS,
  AI_ADAPTER_CATALOGUE,
} from "@/lib/ports/ai.port";
import { OBJECT_STORAGE_IDS, OBJECT_STORAGE_CATALOGUE } from "@/lib/ports/storage.port";
import {
  DEFAULT_BINDINGS,
  adaptersByStatus,
  assertDefaultStackActive,
  listAdapters,
  resolveAllBindings,
  resolveBinding,
  sovereigntyStackLabels,
} from "@/lib/ports/registry";
import { PORT_IDS } from "@/lib/ports/types";
import { PLANNED_AI_ADAPTERS } from "@/lib/ports/adapters/ai/planned";
import { PLANNED_STORAGE_ADAPTERS } from "@/lib/ports/adapters/storage/planned";

describe("sovereignty stack shape", () => {
  test("AIProvider lists gateway + OpenAI + Anthropic + Azure + Bedrock + Local + Sovereign", () => {
    expect([...AI_PROVIDER_IDS]).toEqual([
      "lovable_gateway",
      "openai",
      "anthropic",
      "azure_openai",
      "bedrock",
      "local_llm",
      "sovereign_model",
    ]);
  });

  test("ObjectStorage lists Supabase + S3 + Azure Blob + MinIO", () => {
    expect([...OBJECT_STORAGE_IDS]).toEqual([
      "supabase_storage",
      "aws_s3",
      "azure_blob",
      "minio",
    ]);
  });

  test("all six ports are registered", () => {
    expect([...PORT_IDS]).toEqual([
      "database",
      "authentication",
      "object_storage",
      "ai_provider",
      "email",
      "analytics",
    ]);
    const labels = sovereigntyStackLabels();
    expect(labels.aiProviders).toHaveLength(7);
    expect(labels.objectStorage).toHaveLength(4);
  });
});

describe("bindings", () => {
  test("defaults bind to the current Lovable/Supabase stack", () => {
    expect(DEFAULT_BINDINGS).toEqual({
      database: "supabase_postgres",
      authentication: "supabase_auth",
      object_storage: "supabase_storage",
      ai_provider: "lovable_gateway",
      email: "lovable_email",
      analytics: "usecasesx_telemetry",
    });
    expect(() => assertDefaultStackActive()).not.toThrow();
    const all = resolveAllBindings({});
    for (const port of PORT_IDS) {
      expect(all[port].adapterId).toBe(DEFAULT_BINDINGS[port]);
    }
  });

  test("rejects selecting a planned adapter via env", () => {
    expect(() =>
      resolveBinding("ai_provider", { PORT_AI_PROVIDER: "bedrock" }),
    ).toThrow(/planned/i);
    expect(() =>
      resolveBinding("object_storage", { PORT_OBJECT_STORAGE: "minio" }),
    ).toThrow(/planned/i);
  });

  test("exactly one active adapter per port in the catalogue", () => {
    for (const port of PORT_IDS) {
      const active = adaptersByStatus("active", port);
      expect(active.length).toBe(1);
      expect(active[0]?.id).toBe(DEFAULT_BINDINGS[port]);
    }
  });
});

describe("planned adapters degrade safely", () => {
  test("planned AI adapters return not_implemented", async () => {
    const res = await PLANNED_AI_ADAPTERS.openai.complete({
      model: "x",
      system: "s",
      user: "u",
      tool: {},
      toolName: "t",
      timeoutMs: 1,
      retries: 0,
    });
    expect(res).toEqual({ ok: false, kind: "not_implemented" });
    expect(AI_ADAPTER_CATALOGUE.openai.status).toBe("planned");
  });

  test("planned storage adapters refuse signed URLs", async () => {
    const res = await PLANNED_STORAGE_ADAPTERS.minio.createSignedUrl({
      bucket: "b",
      path: "p",
      expiresInSeconds: 60,
      mode: "download",
    });
    expect(res.ok).toBe(false);
    expect(OBJECT_STORAGE_CATALOGUE.minio.status).toBe("planned");
  });

  test("catalogue lists both active and planned adapters", () => {
    expect(listAdapters().some((a) => a.status === "active")).toBe(true);
    expect(listAdapters().some((a) => a.status === "planned")).toBe(true);
    expect(listAdapters("ai_provider")).toHaveLength(AI_PROVIDER_IDS.length);
  });
});
