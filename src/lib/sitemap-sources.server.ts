/**
 * Server-only data source for `/sitemap.xml`.
 *
 * Reads published, publicly visible use-case slugs with an anonymous
 * publishable client — the same read a signed-out visitor can perform.
 */
import { createClient } from "@supabase/supabase-js";

export async function createPublishableServerClient(): Promise<string[]> {
  const url = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
  const key =
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return [];

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("use_cases")
    .select("slug")
    .eq("status", "published")
    .in("visibility", ["free_lite", "both"])
    .order("slug", { ascending: true })
    .limit(5000);

  if (error) {
    console.warn("[sitemap] published slug read failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.slug).filter((slug): slug is string => Boolean(slug));
}
