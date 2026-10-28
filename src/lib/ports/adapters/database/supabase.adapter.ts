import { DATABASE_ADAPTER_CATALOGUE, type DatabasePort } from "@/lib/ports/database.port";

export const supabasePostgresAdapter: DatabasePort = {
  meta: { ...DATABASE_ADAPTER_CATALOGUE.supabase_postgres, port: "database" },
  providerId: () => "supabase_postgres",
};
