/**
 * Server-side Supabase client for genuinely public, read-only Data API access.
 *
 * Public endpoints must NOT use the service-role client: it bypasses RLS and
 * would turn any query mistake into a data-leak. This client authenticates as
 * `anon`, so public SELECT policies remain the enforcement boundary.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicDataClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        // Opaque `sb_publishable_*` keys are not JWTs: send them as `apikey` only.
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
