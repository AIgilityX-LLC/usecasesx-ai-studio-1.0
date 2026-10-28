/**
 * Server-only port resolvers. Application services should call these instead of
 * importing vendor SDKs directly when adding new integrations.
 *
 * Existing call sites may keep using gateway.server / send-email / storage
 * helpers during the migration window — those modules are the active adapters.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProviderPort } from "./ai.port";
import type { AnalyticsPort } from "./analytics.port";
import type { AuthenticationPort } from "./auth.port";
import type { DatabasePort } from "./database.port";
import type { EmailPort } from "./email.port";
import type { ObjectStoragePort } from "./storage.port";
import { resolveBinding } from "./registry";
import { lovableGatewayAdapter } from "./adapters/ai/lovable-gateway.adapter";
import { lovableEmailAdapter } from "./adapters/email/lovable.adapter";
import { createSupabaseStorageAdapter } from "./adapters/storage/supabase.adapter";
import { supabaseAuthAdapter } from "./adapters/auth/supabase.adapter";
import { supabasePostgresAdapter } from "./adapters/database/supabase.adapter";
import { usecasexTelemetryAdapter } from "./adapters/analytics/usecasesx.adapter";

function env(): Record<string, string | undefined> {
  return process.env as Record<string, string | undefined>;
}

export function resolveAiProvider(): AiProviderPort {
  const { adapterId } = resolveBinding("ai_provider", env());
  if (adapterId === "lovable_gateway") return lovableGatewayAdapter;
  throw new Error(`AI adapter '${adapterId}' is not active.`);
}

export function resolveEmailProvider(): EmailPort {
  const { adapterId } = resolveBinding("email", env());
  if (adapterId === "lovable_email") return lovableEmailAdapter;
  throw new Error(`Email adapter '${adapterId}' is not active.`);
}

export function resolveObjectStorage(supabase: SupabaseClient<any, any, any>): ObjectStoragePort {
  const { adapterId } = resolveBinding("object_storage", env());
  if (adapterId === "supabase_storage") return createSupabaseStorageAdapter(supabase);
  throw new Error(`Object storage adapter '${adapterId}' is not active.`);
}

export function resolveAuthProvider(): AuthenticationPort {
  const { adapterId } = resolveBinding("authentication", env());
  if (adapterId === "supabase_auth") return supabaseAuthAdapter;
  throw new Error(`Auth adapter '${adapterId}' is not active.`);
}

export function resolveDatabaseProvider(): DatabasePort {
  const { adapterId } = resolveBinding("database", env());
  if (adapterId === "supabase_postgres") return supabasePostgresAdapter;
  throw new Error(`Database adapter '${adapterId}' is not active.`);
}

export function resolveAnalyticsProvider(): AnalyticsPort {
  const { adapterId } = resolveBinding("analytics", env());
  if (adapterId === "usecasesx_telemetry") return usecasexTelemetryAdapter;
  throw new Error(`Analytics adapter '${adapterId}' is not active.`);
}

/** Snapshot of active bindings for ops / sovereignty reports. */
export function describeActivePorts() {
  return {
    ai: resolveAiProvider().meta,
    email: resolveEmailProvider().meta,
    auth: resolveAuthProvider().meta,
    database: resolveDatabaseProvider().meta,
    analytics: resolveAnalyticsProvider().meta,
    object_storage: {
      ...resolveBinding("object_storage", env()),
      label: "Supabase Storage (requires request-scoped client)",
    },
  };
}
