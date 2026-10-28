/**
 * Port → adapter binding registry.
 *
 * Defaults keep today's Lovable Cloud stack. Override with env (server-only):
 *   PORT_AI_PROVIDER, PORT_OBJECT_STORAGE, PORT_AUTH, PORT_DATABASE,
 *   PORT_EMAIL, PORT_ANALYTICS
 *
 * Selecting a `planned` adapter is rejected — portability is explicit, not silent.
 */

import { AI_ADAPTER_CATALOGUE, AI_PROVIDER_IDS, type AiProviderId } from "./ai.port";
import {
  ANALYTICS_ADAPTER_CATALOGUE,
  ANALYTICS_PROVIDER_IDS,
  type AnalyticsProviderId,
} from "./analytics.port";
import { AUTH_ADAPTER_CATALOGUE, AUTH_PROVIDER_IDS, type AuthProviderId } from "./auth.port";
import {
  DATABASE_ADAPTER_CATALOGUE,
  DATABASE_PROVIDER_IDS,
  type DatabaseProviderId,
} from "./database.port";
import { EMAIL_ADAPTER_CATALOGUE, EMAIL_PROVIDER_IDS, type EmailProviderId } from "./email.port";
import {
  OBJECT_STORAGE_CATALOGUE,
  OBJECT_STORAGE_IDS,
  type ObjectStorageId,
} from "./storage.port";
import type { AdapterMeta, AdapterStatus, PortBinding, PortId } from "./types";
import { PORT_IDS } from "./types";

export const DEFAULT_BINDINGS: Record<PortId, string> = {
  database: "supabase_postgres",
  authentication: "supabase_auth",
  object_storage: "supabase_storage",
  ai_provider: "lovable_gateway",
  email: "lovable_email",
  analytics: "usecasesx_telemetry",
};

export const BINDING_ENV_KEYS: Record<PortId, string> = {
  database: "PORT_DATABASE",
  authentication: "PORT_AUTH",
  object_storage: "PORT_OBJECT_STORAGE",
  ai_provider: "PORT_AI_PROVIDER",
  email: "PORT_EMAIL",
  analytics: "PORT_ANALYTICS",
};

const ALL_ADAPTERS: AdapterMeta[] = [
  ...Object.values(AI_ADAPTER_CATALOGUE).map((a) => ({ ...a, port: "ai_provider" as const })),
  ...Object.values(OBJECT_STORAGE_CATALOGUE).map((a) => ({
    ...a,
    port: "object_storage" as const,
  })),
  ...Object.values(AUTH_ADAPTER_CATALOGUE).map((a) => ({ ...a, port: "authentication" as const })),
  ...Object.values(DATABASE_ADAPTER_CATALOGUE).map((a) => ({ ...a, port: "database" as const })),
  ...Object.values(EMAIL_ADAPTER_CATALOGUE).map((a) => ({ ...a, port: "email" as const })),
  ...Object.values(ANALYTICS_ADAPTER_CATALOGUE).map((a) => ({ ...a, port: "analytics" as const })),
];

export function listAdapters(port?: PortId): AdapterMeta[] {
  return port ? ALL_ADAPTERS.filter((a) => a.port === port) : [...ALL_ADAPTERS];
}

export function adaptersByStatus(status: AdapterStatus, port?: PortId): AdapterMeta[] {
  return listAdapters(port).filter((a) => a.status === status);
}

function readEnv(env: Record<string, string | undefined>, key: string): string | undefined {
  const raw = env[key];
  if (raw == null || raw.trim() === "") return undefined;
  return raw.trim();
}

function assertKnownAdapter(port: PortId, adapterId: string): AdapterMeta {
  const found = ALL_ADAPTERS.find((a) => a.port === port && a.id === adapterId);
  if (!found) {
    throw new Error(`Unknown adapter '${adapterId}' for port '${port}'.`);
  }
  return found;
}

/**
 * Resolve the bound adapter id for a port. Planned adapters cannot be selected
 * until an implementation ships (status flips to active).
 */
export function resolveBinding(
  port: PortId,
  env: Record<string, string | undefined> = {},
): PortBinding {
  const envKey = BINDING_ENV_KEYS[port];
  const requested = readEnv(env, envKey) ?? DEFAULT_BINDINGS[port];
  const meta = assertKnownAdapter(port, requested);
  if (meta.status !== "active") {
    throw new Error(
      `Adapter '${requested}' for port '${port}' is planned, not active. Keep ${envKey}=${DEFAULT_BINDINGS[port]} until the adapter ships.`,
    );
  }
  return { port, adapterId: meta.id, envKey };
}

export function resolveAllBindings(
  env: Record<string, string | undefined> = {},
): Record<PortId, PortBinding> {
  const out = {} as Record<PortId, PortBinding>;
  for (const port of PORT_IDS) {
    out[port] = resolveBinding(port, env);
  }
  return out;
}

/** Target architecture labels (diagram) — stable for docs/tests. */
export function sovereigntyStackLabels(): {
  aiProviders: readonly AiProviderId[];
  objectStorage: readonly ObjectStorageId[];
  auth: readonly AuthProviderId[];
  database: readonly DatabaseProviderId[];
  email: readonly EmailProviderId[];
  analytics: readonly AnalyticsProviderId[];
} {
  return {
    aiProviders: AI_PROVIDER_IDS,
    objectStorage: OBJECT_STORAGE_IDS,
    auth: AUTH_PROVIDER_IDS,
    database: DATABASE_PROVIDER_IDS,
    email: EMAIL_PROVIDER_IDS,
    analytics: ANALYTICS_PROVIDER_IDS,
  };
}

export function assertDefaultStackActive(): void {
  const bindings = resolveAllBindings({});
  for (const port of PORT_IDS) {
    if (bindings[port].adapterId !== DEFAULT_BINDINGS[port]) {
      throw new Error(`Default binding mismatch for ${port}`);
    }
  }
}
