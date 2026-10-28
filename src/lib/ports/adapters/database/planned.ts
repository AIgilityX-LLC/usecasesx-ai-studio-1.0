import {
  DATABASE_ADAPTER_CATALOGUE,
  type DatabasePort,
  type DatabaseProviderId,
} from "@/lib/ports/database.port";

function planned(id: Exclude<DatabaseProviderId, "supabase_postgres">): DatabasePort {
  return {
    meta: { ...DATABASE_ADAPTER_CATALOGUE[id], port: "database" },
    providerId: () => id,
  };
}

export const managedPostgresAdapter = planned("managed_postgres");
export const localPostgresAdapter = planned("local_postgres");
