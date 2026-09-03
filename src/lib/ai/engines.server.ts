/**
 * Research engine repository and resolver.
 *
 * Server-only. Owns the engine catalog, platform-level credentials, and
 * per-workspace credentials. Every read that touches key material uses the
 * service-role client and returns only masked hints to callers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptEngineKey, encryptEngineKey, keyHint } from "./engine-crypto.server";
import type { EngineEdition, EngineRoute, EngineSummary, EngineUpsertInput } from "./engines";

type Row = {
  slug: string;
  label: string;
  provider: string;
  tagline: string | null;
  route: string;
  model_id: string;
  base_url: string | null;
  tier: string;
  enabled: boolean;
  is_default: boolean;
  allow_workspace_keys: boolean;
  fallback_to_default: boolean;
  editions: string[];
  sort_order: number;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<any, any, any>;
}

function toSummary(
  row: Row,
  platform: Map<string, string | null>,
  workspace: Map<string, string | null>,
): EngineSummary {
  return {
    slug: row.slug,
    label: row.label,
    provider: row.provider,
    tagline: row.tagline,
    route: row.route as EngineRoute,
    modelId: row.model_id,
    baseUrl: row.base_url,
    tier: row.tier,
    enabled: row.enabled,
    isDefault: row.is_default,
    allowWorkspaceKeys: row.allow_workspace_keys,
    fallbackToDefault: row.fallback_to_default,
    editions: row.editions ?? [],
    sortOrder: row.sort_order,
    hasPlatformKey: platform.has(row.slug),
    platformKeyHint: platform.get(row.slug) ?? null,
    hasWorkspaceKey: workspace.has(row.slug),
    workspaceKeyHint: workspace.get(row.slug) ?? null,
  };
}

async function keyHints(workspaceId: string | null) {
  const db = await admin();
  const [platformRes, workspaceRes] = await Promise.all([
    db.from("ai_engine_credentials").select("engine_slug, key_hint"),
    workspaceId
      ? db
          .from("workspace_ai_engines")
          .select("engine_slug, key_hint, enabled")
          .eq("workspace_id", workspaceId)
          .eq("enabled", true)
      : Promise.resolve({ data: [], error: null } as any),
  ]);
  const platform = new Map<string, string | null>();
  for (const r of platformRes.data ?? []) platform.set(r.engine_slug, r.key_hint ?? null);
  const workspace = new Map<string, string | null>();
  for (const r of workspaceRes.data ?? []) workspace.set(r.engine_slug, r.key_hint ?? null);
  return { platform, workspace };
}

/** Full catalog — administration view. */
export async function listEngines(workspaceId: string | null): Promise<EngineSummary[]> {
  const db = await admin();
  const { data, error } = await db.from("ai_engines").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  const hints = await keyHints(workspaceId);
  return (data ?? []).map((row: Row) => toSummary(row, hints.platform, hints.workspace));
}

/** Engines a caller may actually pick in the Studio. */
export async function listUsableEngines(
  edition: string,
  workspaceId: string | null,
): Promise<EngineSummary[]> {
  const all = await listEngines(workspaceId);
  return all.filter((engine) => {
    if (!engine.enabled) return false;
    if (engine.editions.length && !engine.editions.includes(edition)) return false;
    if (engine.route === "gateway") return true;
    return engine.hasPlatformKey || engine.hasWorkspaceKey;
  });
}

export async function upsertEngine(input: EngineUpsertInput, actorId: string) {
  const db = await admin();
  const { error } = await db.from("ai_engines").upsert(
    {
      slug: input.slug,
      label: input.label,
      provider: input.provider,
      tagline: input.tagline ?? null,
      route: input.route,
      model_id: input.modelId,
      base_url: input.baseUrl ?? null,
      tier: input.tier,
      enabled: input.enabled,
      allow_workspace_keys: input.allowWorkspaceKeys,
      fallback_to_default: input.fallbackToDefault,
      editions: input.editions as EngineEdition[],
      sort_order: input.sortOrder ?? 100,
    },
    { onConflict: "slug" },
  );
  if (error) throw new Error(error.message);
  console.info("[ai-engines] upsert", { slug: input.slug, actorId });
}

export async function setEngineEnabled(slug: string, enabled: boolean) {
  const db = await admin();
  const { error } = await db.from("ai_engines").update({ enabled }).eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function setDefaultEngine(slug: string) {
  const db = await admin();
  const { error: clearError } = await db
    .from("ai_engines")
    .update({ is_default: false })
    .neq("slug", slug);
  if (clearError) throw new Error(clearError.message);
  const { error } = await db
    .from("ai_engines")
    .update({ is_default: true, enabled: true })
    .eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function setPlatformKey(slug: string, apiKey: string, actorId: string) {
  const db = await admin();
  const { error } = await db.from("ai_engine_credentials").upsert(
    {
      engine_slug: slug,
      key_ciphertext: encryptEngineKey(apiKey),
      key_hint: keyHint(apiKey),
      created_by: actorId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "engine_slug" },
  );
  if (error) throw new Error(error.message);
}

export async function clearPlatformKey(slug: string) {
  const db = await admin();
  const { error } = await db.from("ai_engine_credentials").delete().eq("engine_slug", slug);
  if (error) throw new Error(error.message);
}

export async function setWorkspaceKey(
  workspaceId: string,
  slug: string,
  apiKey: string,
  actorId: string,
) {
  const db = await admin();
  const { error } = await db.from("workspace_ai_engines").upsert(
    {
      workspace_id: workspaceId,
      engine_slug: slug,
      key_ciphertext: encryptEngineKey(apiKey),
      key_hint: keyHint(apiKey),
      enabled: true,
      created_by: actorId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,engine_slug" },
  );
  if (error) throw new Error(error.message);
}

export async function clearWorkspaceKey(workspaceId: string, slug: string) {
  const db = await admin();
  const { error } = await db
    .from("workspace_ai_engines")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("engine_slug", slug);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------- resolution */

export type ResolvedEngine = {
  slug: string;
  label: string;
  route: EngineRoute;
  model: string;
  endpoint: string | null;
  apiKey: string | null;
  keySource: "platform" | "workspace" | "gateway";
  fallbackToDefault: boolean;
};

async function loadEngine(slug: string): Promise<Row | null> {
  const db = await admin();
  const { data } = await db.from("ai_engines").select("*").eq("slug", slug).maybeSingle();
  return (data as Row) ?? null;
}

export async function loadDefaultEngine(): Promise<Row | null> {
  const db = await admin();
  const { data } = await db
    .from("ai_engines")
    .select("*")
    .eq("is_default", true)
    .eq("enabled", true)
    .maybeSingle();
  return (data as Row) ?? null;
}

async function credentialFor(slug: string, workspaceId: string | null) {
  const db = await admin();
  if (workspaceId) {
    const { data } = await db
      .from("workspace_ai_engines")
      .select("key_ciphertext, enabled")
      .eq("workspace_id", workspaceId)
      .eq("engine_slug", slug)
      .maybeSingle();
    if (data?.enabled && data.key_ciphertext) {
      return { key: decryptEngineKey(data.key_ciphertext), source: "workspace" as const };
    }
  }
  const { data } = await db
    .from("ai_engine_credentials")
    .select("key_ciphertext")
    .eq("engine_slug", slug)
    .maybeSingle();
  if (data?.key_ciphertext) {
    return { key: decryptEngineKey(data.key_ciphertext), source: "platform" as const };
  }
  return null;
}

/**
 * Resolve the engine a call should use. Order: requested engine with a
 * workspace key, then a platform key, then the platform default engine.
 * Returns null when nothing is configured, so callers fall back to the
 * built-in gateway routing.
 */
export async function resolveEngineForCall(
  slug: string | null | undefined,
  workspaceId: string | null,
  edition: string,
): Promise<ResolvedEngine | null> {
  const wanted = slug ? await loadEngine(slug) : null;
  const candidates = [
    wanted,
    wanted?.fallback_to_default === false ? null : await loadDefaultEngine(),
  ];

  for (const row of candidates) {
    if (!row || !row.enabled) continue;
    if (row.editions?.length && !row.editions.includes(edition)) continue;
    if (row.route === "gateway") {
      return {
        slug: row.slug,
        label: row.label,
        route: "gateway",
        model: row.model_id,
        endpoint: null,
        apiKey: null,
        keySource: "gateway",
        fallbackToDefault: row.fallback_to_default,
      };
    }
    const credential = await credentialFor(row.slug, workspaceId);
    if (!credential) continue;
    return {
      slug: row.slug,
      label: row.label,
      route: "openai-compatible",
      model: row.model_id,
      endpoint: row.base_url,
      apiKey: credential.key,
      keySource: credential.source,
      fallbackToDefault: row.fallback_to_default,
    };
  }
  return null;
}

/** One tiny live request, used by the admin "Test connection" button. */
export async function testEngine(
  slug: string,
  workspaceId: string | null,
): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const row = await loadEngine(slug);
  if (!row) return { ok: false, latencyMs: 0, message: "Engine not found." };

  const startedAt = Date.now();
  if (row.route === "gateway") {
    const { callGateway } = await import("./gateway.server");
    const res = await callGateway({
      model: row.model_id,
      system: "Reply by calling the tool with ok set to true.",
      user: "Connection test.",
      tool: {
        type: "function",
        function: {
          name: "connection_test",
          description: "Confirm the engine responded.",
          parameters: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
            additionalProperties: false,
          },
        },
      },
      toolName: "connection_test",
      timeoutMs: 30_000,
      retries: 0,
    });
    return {
      ok: res.ok,
      latencyMs: Date.now() - startedAt,
      message: res.ok ? "Engine responded." : `Failed: ${res.kind}`,
    };
  }

  const credential = await credentialFor(row.slug, workspaceId);
  if (!credential)
    return { ok: false, latencyMs: 0, message: "No API key stored for this engine." };
  if (!row.base_url) return { ok: false, latencyMs: 0, message: "No endpoint configured." };

  try {
    const res = await fetch(`${row.base_url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: row.model_id,
        messages: [{ role: "user", content: "Reply with the single word OK." }],
        max_tokens: 8,
      }),
    });
    const latencyMs = Date.now() - startedAt;
    if (!res.ok) {
      return { ok: false, latencyMs, message: `Provider returned HTTP ${res.status}.` };
    }
    return { ok: true, latencyMs, message: `Engine responded in ${latencyMs} ms.` };
  } catch (error) {
    console.error("[ai-engines] test failed", { slug, error: (error as Error).name });
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message: "Could not reach the provider endpoint.",
    };
  }
}

/** Per-engine usage rollup for the admin panel. */
export async function engineUsage(): Promise<
  Array<{ providerAlias: string; calls: number; failures: number; avgLatencyMs: number }>
> {
  const db = await admin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("ai_usage_events")
    .select("provider_alias, status, duration_ms")
    .gte("created_at", since)
    .limit(5000);
  const acc = new Map<string, { calls: number; failures: number; total: number }>();
  for (const row of data ?? []) {
    const key = row.provider_alias ?? "default";
    const entry = acc.get(key) ?? { calls: 0, failures: 0, total: 0 };
    entry.calls += 1;
    if (row.status !== "ok") entry.failures += 1;
    entry.total += row.duration_ms ?? 0;
    acc.set(key, entry);
  }
  return Array.from(acc.entries()).map(([providerAlias, v]) => ({
    providerAlias,
    calls: v.calls,
    failures: v.failures,
    avgLatencyMs: v.calls ? Math.round(v.total / v.calls) : 0,
  }));
}
