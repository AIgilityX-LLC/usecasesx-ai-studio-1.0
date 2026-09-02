/**
 * Server-only reads for the public category and collection pages.
 *
 * Everything here runs with the anonymous publishable client, so a signed-out
 * visitor and a crawler see exactly the same rows the pages render.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CategoryType = "industry" | "capability";

export interface CategoryRef {
  slug: string;
  name: string;
  count: number;
}

export interface CategoryPage {
  type: CategoryType;
  slug: string;
  name: string;
  cases: { slug: string; title: string; summary: string | null }[];
}

export interface PublicCollectionSummary {
  slug: string;
  name: string;
  description: string | null;
  itemCount: number;
}

export interface PublicCollectionPage extends PublicCollectionSummary {
  items: { slug: string; title: string; summary: string | null }[];
}

const JOIN = {
  industry: { table: "use_case_industries", ref: "industries" },
  capability: { table: "use_case_capabilities", ref: "ai_capabilities" },
} as const satisfies Record<CategoryType, { table: string; ref: string }>;

function anonClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Category slugs that carry at least one published, publicly visible case. */
export async function readCategories(type: CategoryType): Promise<CategoryRef[]> {
  const join = JOIN[type];
  const sb = anonClient();
  const { data, error } = await sb
    .from(join.table)

    .select(
      `use_case_id, ${join.ref}!inner(slug, name), use_cases!inner(status, visibility)` as any,
    )
    .eq("use_cases.status", "published")
    .in("use_cases.visibility", ["free_lite", "both"]);
  if (error) throw new Error(error.message);

  const bySlug = new Map<string, CategoryRef>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const ref = row[join.ref];
    if (!ref?.slug) continue;
    const entry = bySlug.get(ref.slug) ?? { slug: ref.slug, name: ref.name ?? ref.slug, count: 0 };
    entry.count += 1;
    bySlug.set(ref.slug, entry);
  }
  return Array.from(bySlug.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** One category page: its display name plus the published cases inside it. */
export async function readCategoryPage(
  type: CategoryType,
  slug: string,
): Promise<CategoryPage | null> {
  const join = JOIN[type];
  const sb = anonClient();
  const { data, error } = await sb
    .from(join.table)
    .select(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `${join.ref}!inner(slug, name), use_cases!inner(slug, title, summary, status, visibility)` as any,
    )
    .eq(`${join.ref}.slug`, slug)
    .eq("use_cases.status", "published")
    .in("use_cases.visibility", ["free_lite", "both"])
    .limit(500);
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return null;

  return {
    type,
    slug,
    name: rows[0][join.ref]?.name ?? slug,
    cases: rows
      .map((row) => row.use_cases)
      .filter(Boolean)
      .map((uc: { slug: string; title: string; summary: string | null }) => ({
        slug: uc.slug,
        title: uc.title,
        summary: uc.summary,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  };
}

/** Public curated collections, addressable by a stable slug. */
export async function readPublicCollections(): Promise<PublicCollectionSummary[]> {
  const sb = anonClient();
  const { data, error } = await sb
    .from("collections")
    .select("id, slug, name, description, is_public, collection_items(count)")
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    description: row.description ?? null,
    itemCount: Number(row.collection_items?.[0]?.count ?? 0),
  }));
}

export async function readPublicCollection(slug: string): Promise<PublicCollectionPage | null> {
  const sb = anonClient();
  const { data: col, error } = await sb
    .from("collections")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!col) return null;

  const { data: items } = await sb
    .from("collection_items")
    .select("position, use_cases!inner(slug, title, summary, status, visibility)")
    .eq("collection_id", col.id)
    .eq("use_cases.status", "published")
    .in("use_cases.visibility", ["free_lite", "both"])
    .order("position", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = ((items ?? []) as any[])
    .map((row) => (Array.isArray(row.use_cases) ? row.use_cases[0] : row.use_cases))
    .filter(Boolean)
    .map((uc: { slug: string; title: string; summary: string | null }) => ({
      slug: uc.slug,
      title: uc.title,
      summary: uc.summary,
    }));

  return {
    slug: String(col.slug),
    name: col.name,
    description: col.description,
    itemCount: mapped.length,
    items: mapped,
  };
}

export interface CatalogStats {
  useCases: number;
  industries: number;
}

/** Live counts of the public corpus, used instead of hardcoded marketing figures. */
export async function readCatalogStats(): Promise<CatalogStats> {
  const sb = anonClient();
  const [{ count, error }, industries] = await Promise.all([
    sb
      .from("use_cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .in("visibility", ["free_lite", "both"]),
    readCategories("industry"),
  ]);
  if (error) throw new Error(error.message);
  return { useCases: count ?? 0, industries: industries.length };
}
