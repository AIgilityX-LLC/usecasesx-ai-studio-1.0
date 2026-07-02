import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicCollection = {
  name: string;
  description: string | null;
  items: { title: string; slug: string; summary: string | null }[];
};

/**
 * Public read of a shared collection by its share token. Uses the server
 * publishable (anon) client; RLS only exposes collections/items that are
 * marked public.
 */
export const getPublicCollection = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<PublicCollection | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: col } = await supabase
      .from("collections")
      .select("id, name, description, is_public")
      .eq("share_token", data.token)
      .eq("is_public", true)
      .maybeSingle();

    if (!col) return null;

    const { data: items } = await supabase
      .from("collection_items")
      .select("position, use_cases(title, slug, summary)")
      .eq("collection_id", col.id)
      .order("position", { ascending: true });

    type UC = { title: string; slug: string; summary: string | null };
    const mapped: UC[] = [];
    for (const r of items ?? []) {
      const uc = (Array.isArray(r.use_cases) ? r.use_cases[0] : r.use_cases) as UC | null | undefined;
      if (uc) mapped.push(uc);
    }

    return { name: col.name, description: col.description, items: mapped };
  });
