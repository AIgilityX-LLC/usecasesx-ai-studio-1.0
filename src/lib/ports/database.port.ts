/**
 * Database port — persistence seam.
 *
 * Postgres via Lovable Cloud / Supabase is the active adapter. A future direct
 * Postgres or alternate managed DB binds here without UI rewrites.
 */

import type { AdapterMeta } from "./types";

export const DATABASE_PROVIDER_IDS = [
  "supabase_postgres",
  "managed_postgres",
  "local_postgres",
] as const;
export type DatabaseProviderId = (typeof DATABASE_PROVIDER_IDS)[number];

export type DatabasePort = {
  readonly meta: AdapterMeta & { port: "database"; id: DatabaseProviderId };
  providerId(): DatabaseProviderId;
};

export const DATABASE_ADAPTER_CATALOGUE: Record<
  DatabaseProviderId,
  Omit<AdapterMeta, "port"> & { id: DatabaseProviderId }
> = {
  supabase_postgres: {
    id: "supabase_postgres",
    label: "Supabase Postgres",
    status: "active",
    implementation: "src/integrations/supabase/client*.ts + RLS policies",
    notes: "RLS remains the security boundary regardless of hosting label.",
  },
  managed_postgres: {
    id: "managed_postgres",
    label: "Managed Postgres",
    status: "planned",
    implementation: "src/lib/ports/adapters/database/planned.ts",
    notes: "Same schema + RLS model on customer-managed Postgres.",
  },
  local_postgres: {
    id: "local_postgres",
    label: "Local Postgres",
    status: "planned",
    implementation: "src/lib/ports/adapters/database/planned.ts",
    notes: "Air-gap / private-cloud candidate.",
  },
};
