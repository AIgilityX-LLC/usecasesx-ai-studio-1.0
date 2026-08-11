/**
 * Opportunity Map — server-only data access.
 *
 * Reached only through `src/lib/opportunity-map.functions.ts` handlers, which
 * run with the caller's RLS-scoped Supabase client. Returns plain DTOs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapRecord } from "@/lib/opportunity-map";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const SELECT = `id, title, status, urgency, owner_name, org_unit_id, business_function,
  strategic_theme_id, converted_use_case_id, updated_at,
  organization_units ( name ), taxonomy_strategic_themes ( name )`;

export type OpportunityMapData = {
  records: MapRecord[];
  /** Total rows the caller may read, before the page cap below is applied. */
  totalCount: number;
  /** True when more opportunities exist than the map can render in one pass. */
  truncated: boolean;
  /** Counts used only for honest setup guidance in the empty state. */
  setup: { orgUnits: number; strategicThemes: number; valueThemes: number; processes: number };
};

/** Hard cap on rows pulled into the client-side map. Keeps payloads bounded. */
export const OPPORTUNITY_MAP_CAP = 500;

export async function loadOpportunityMap(supabase: Db): Promise<OpportunityMapData> {
  const countOf = (table: string) =>
    supabase.from(table).select("id", { count: "exact", head: true });

  const [rowsResult, unitsResult, themesResult, valueResult, processResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select(SELECT, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(0, OPPORTUNITY_MAP_CAP - 1),
    countOf("organization_units"),
    countOf("taxonomy_strategic_themes"),
    countOf("taxonomy_value_themes"),
    countOf("taxonomy_processes"),
  ]);

  if (rowsResult.error) throw new Error(rowsResult.error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records: MapRecord[] = ((rowsResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    title: row.title ?? "",
    status: row.status ?? "signal",
    urgency: row.urgency ?? "unknown",
    ownerName: row.owner_name ?? "",
    orgUnitId: row.org_unit_id ?? null,
    orgUnitName: row.organization_units?.name ?? null,
    businessFunction: row.business_function ?? "",
    strategicThemeId: row.strategic_theme_id ?? null,
    strategicThemeName: row.taxonomy_strategic_themes?.name ?? null,
    convertedUseCaseId: row.converted_use_case_id ?? null,
    updatedAt: row.updated_at,
  }));

  return {
    records,
    totalCount: rowsResult.count ?? records.length,
    truncated: (rowsResult.count ?? records.length) > records.length,
    setup: {
      orgUnits: unitsResult.count ?? 0,
      strategicThemes: themesResult.count ?? 0,
      valueThemes: valueResult.count ?? 0,
      processes: processResult.count ?? 0,
    },
  };
}
