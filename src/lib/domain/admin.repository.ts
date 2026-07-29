/**
 * Admin repository — the single data-access boundary for catalogue authoring,
 * moderation and taxonomy administration surfaces.
 *
 * Every function returns plain data or throws a `DomainError`; callers render
 * `toUserMessage(error)` and never a raw Postgres string.
 * See `docs/architecture/domain-boundaries.md`.
 */

import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { DomainError, normalizeError, unwrapResult } from "./errors";
import { requireUserId } from "./ownership";

/* ---------------- session ---------------- */

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function requireCurrentUserId(): Promise<string> {
  return requireUserId(await currentUserId());
}

/* ---------------- use_cases (catalogue) ---------------- */

export type UseCaseRow = Record<string, unknown> & { id: string };

export async function listUseCases(): Promise<UseCaseRow[]> {
  const result = await supabase
    .from("use_cases")
    .select("*")
    .order("updated_at", { ascending: false });
  return unwrapResult(result, { allowNull: true }) ?? [];
}

export async function getUseCase(id: string): Promise<UseCaseRow> {
  const result = await supabase.from("use_cases").select("*").eq("id", id).maybeSingle();
  const row = unwrapResult(result, { allowNull: true, notFoundMessage: "We could not find that use case." });
  if (!row) throw new DomainError("not_found", "We could not find that use case.");
  return row as UseCaseRow;
}

export async function insertUseCase(patch: Record<string, unknown>): Promise<string> {
  const userId = await currentUserId();
  const result = await (supabase as any)
    .from("use_cases")
    .insert({ ...patch, submitted_by: userId } as any)
    .select("id")
    .single();
  const row = unwrapResult(result);
  return (row as { id: string }).id;
}

export async function updateUseCase(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase as any)
    .from("use_cases")
    .update(patch as any)
    .eq("id", id);
  if (error) throw normalizeError(error);
}

export async function deleteUseCase(id: string): Promise<void> {
  const { error } = await supabase.from("use_cases").delete().eq("id", id);
  if (error) throw normalizeError(error);
}

/* ---------------- audit log ---------------- */

export type AuditRow = {
  ts: string;
  actor: string;
  action: string;
  detail?: string;
};

export async function writeUseCaseAudit(
  useCaseId: string | null,
  action: string,
  detail?: string,
): Promise<void> {
  const actorId = await currentUserId();
  if (!actorId) return;
  const { error } = await supabase.from("use_case_audit_log").insert({
    use_case_id: useCaseId,
    actor_id: actorId,
    action,
    detail: detail ?? null,
  });
  if (error) throw normalizeError(error);
}

export async function loadUseCaseAuditMap(ids: string[]): Promise<Record<string, AuditRow[]>> {
  if (ids.length === 0) return {};
  const result = await supabase
    .from("use_case_audit_log")
    .select("use_case_id, action, detail, actor_id, created_at")
    .in("use_case_id", ids)
    .order("created_at", { ascending: true });
  const rows = unwrapResult(result, { allowNull: true }) ?? [];
  const map: Record<string, AuditRow[]> = {};
  for (const row of rows as Array<Record<string, string | null>>) {
    const id = row.use_case_id as string;
    if (!map[id]) map[id] = [];
    map[id].push({
      ts: row.created_at as string,
      actor: row.actor_id ?? "system",
      action: row.action as string,
      detail: row.detail ?? undefined,
    });
  }
  return map;
}

/* ---------------- taxonomy joins ---------------- */

type SlugMaps = { byId: Record<string, string>; bySlug: Record<string, string> };

function toSlugMaps(rows: Array<{ id: string; slug: string }> | null): SlugMaps {
  const byId: Record<string, string> = {};
  const bySlug: Record<string, string> = {};
  for (const r of rows ?? []) {
    byId[r.id] = r.slug;
    bySlug[r.slug] = r.id;
  }
  return { byId, bySlug };
}

export async function fetchTaxonomyMaps() {
  const [ind, fn, ai, obj] = await Promise.all([
    supabase.from("industries").select("id, slug"),
    supabase.from("business_functions").select("id, slug"),
    supabase.from("ai_capabilities").select("id, slug"),
    supabase.from("business_objectives").select("id, slug"),
  ]);
  return {
    industries: toSlugMaps(ind.data as any),
    functions: toSlugMaps(fn.data as any),
    aiTypes: toSlugMaps(ai.data as any),
    objectives: toSlugMaps(obj.data as any),
  };
}

/** Adds `_industry_slug` / `_business_function_slug` / `_ai_type_slug` / `_objective_slug`. */
export async function attachPrimaryTaxonomy(rows: UseCaseRow[]): Promise<UseCaseRow[]> {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const [ind, fn, ai, obj, tax] = await Promise.all([
    supabase.from("use_case_industries").select("use_case_id, industry_id").in("use_case_id", ids),
    supabase
      .from("use_case_business_functions")
      .select("use_case_id, business_function_id")
      .in("use_case_id", ids),
    supabase
      .from("use_case_capabilities")
      .select("use_case_id, capability_id")
      .in("use_case_id", ids),
    supabase
      .from("use_case_business_objectives")
      .select("use_case_id, objective_id")
      .in("use_case_id", ids),
    fetchTaxonomyMaps(),
  ]);

  const pick = (
    data: Array<Record<string, string>> | null,
    key: string,
    map: Record<string, string>,
  ) => {
    const out: Record<string, string> = {};
    for (const r of data ?? []) if (!out[r.use_case_id]) out[r.use_case_id] = map[r[key]] ?? "";
    return out;
  };

  const indMap = pick(ind.data as any, "industry_id", tax.industries.byId);
  const fnMap = pick(fn.data as any, "business_function_id", tax.functions.byId);
  const aiMap = pick(ai.data as any, "capability_id", tax.aiTypes.byId);
  const objMap = pick(obj.data as any, "objective_id", tax.objectives.byId);

  return rows.map((r) => ({
    ...r,
    _industry_slug: indMap[r.id] ?? "",
    _business_function_slug: fnMap[r.id] ?? "",
    _ai_type_slug: aiMap[r.id] ?? "",
    _objective_slug: objMap[r.id] ?? "",
  }));
}

async function syncJoinRow(
  table: string,
  useCaseId: string,
  fkCol: string,
  lookupTable: string,
  slug: string,
) {
  const del = await supabase
    .from(table as any)
    .delete()
    .eq("use_case_id", useCaseId);
  if (del.error) throw normalizeError(del.error);
  if (!slug) return;
  const { data, error } = await supabase
    .from(lookupTable as any)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw normalizeError(error);
  const id = (data as { id?: string } | null)?.id;
  if (!id) return;
  const ins = await supabase
    .from(table as any)
    .insert({ use_case_id: useCaseId, [fkCol]: id } as any);
  if (ins.error) throw normalizeError(ins.error);
}

export async function syncTaxonomyJoins(
  useCaseId: string,
  selection: {
    industry: string;
    businessFunction: string;
    aiType: string;
    businessObjective: string;
  },
): Promise<void> {
  await Promise.all([
    syncJoinRow("use_case_industries", useCaseId, "industry_id", "industries", selection.industry),
    syncJoinRow(
      "use_case_business_functions",
      useCaseId,
      "business_function_id",
      "business_functions",
      selection.businessFunction,
    ),
    syncJoinRow(
      "use_case_capabilities",
      useCaseId,
      "capability_id",
      "ai_capabilities",
      selection.aiType,
    ),
    syncJoinRow(
      "use_case_business_objectives",
      useCaseId,
      "objective_id",
      "business_objectives",
      selection.businessObjective,
    ),
  ]);
}

/* ---------------- submissions moderation ---------------- */

export async function listSubmissions<T>(): Promise<T[]> {
  const result = await supabase
    .from("use_case_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function reviewSubmission(input: {
  id: string;
  status: string;
  reviewNotes: string | null;
}): Promise<void> {
  const reviewerId = await currentUserId();
  const { error } = await supabase
    .from("use_case_submissions")
    .update({
      status: input.status as any,
      review_notes: input.reviewNotes,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw normalizeError(error);
}

/* ---------------- leads / waitlist ---------------- */

const LEAD_WAITLIST_COLUMNS =
  "id, full_name, email, company, cta, eligible, waitlist_status, created_at";
const LEAD_PIPELINE_COLUMNS =
  "id, full_name, email, company, country, interest_area, cta, source_page, lead_status, created_at";

export async function listWaitlistLeads<T>(): Promise<T[]> {
  const result = await supabase
    .from("lead_captures")
    .select(LEAD_WAITLIST_COLUMNS)
    .order("created_at", { ascending: false });
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function listPipelineLeads<T>(limit = 200): Promise<T[]> {
  const result = await supabase
    .from("lead_captures")
    .select(LEAD_PIPELINE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function updateLeadWaitlistStatus(id: string, waitlistStatus: string): Promise<void> {
  const { error } = await supabase
    .from("lead_captures")
    .update({ waitlist_status: waitlistStatus })
    .eq("id", id);
  if (error) throw normalizeError(error);
}

/* ---------------- CTA analytics ---------------- */

export async function listCtaEvents<T>(limit = 500): Promise<T[]> {
  const result = await supabase
    .from("cta_events")
    .select("id, cta, target_platform, target_route, source_page, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

/* ---------------- organizations ---------------- */

export async function listOrganizations<T>(): Promise<T[]> {
  const result = await supabase
    .from("organizations")
    .select("id,name,plan,industry,country,type")
    .order("name");
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function updateOrganizationPlan(id: string, plan: string): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ plan } as any)
    .eq("id", id);
  if (error) throw normalizeError(error);
}

/* ---------------- taxonomy meta / sectors / generic editors ---------------- */

export async function getTaxonomyMeta(): Promise<{ version: number; published_at: string } | null> {
  const result = await supabase
    .from("taxonomy_meta")
    .select("version, published_at")
    .eq("id", 1)
    .maybeSingle();
  return (unwrapResult(result, { allowNull: true }) ?? null) as any;
}

export async function publishTaxonomy(nextVersion: number): Promise<void> {
  const publishedBy = await currentUserId();
  const { error } = await supabase
    .from("taxonomy_meta")
    .update({
      version: nextVersion,
      published_at: new Date().toISOString(),
      published_by: publishedBy,
    })
    .eq("id", 1);
  if (error) throw normalizeError(error);
}

export async function listSectors<T>(): Promise<T[]> {
  const result = await supabase
    .from("taxonomy_sectors")
    .select("*")
    .order("sort_order")
    .order("name");
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function createSector(input: {
  slug: string;
  name: string;
  sortOrder: number;
}): Promise<void> {
  const submittedBy = await currentUserId();
  const { error } = await supabase.from("taxonomy_sectors").insert({
    slug: input.slug,
    name: input.name,
    sort_order: input.sortOrder,
    status: "pending",
    submitted_by: submittedBy,
    submitted_at: new Date().toISOString(),
  } as any);
  if (error) throw normalizeError(error);
}

export async function updateSector(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from("taxonomy_sectors")
    .update(patch as any)
    .eq("id", id);
  if (error) throw normalizeError(error);
}

export async function deleteSector(id: string): Promise<void> {
  const { error } = await supabase.from("taxonomy_sectors").delete().eq("id", id);
  if (error) throw normalizeError(error);
}

/** Generic slug/name/sort_order reference table editor used by the taxonomy tabs. */
export async function listTaxonomyRows<T>(table: string): Promise<T[]> {
  const result = await supabase
    .from(table as any)
    .select("*")
    .order("sort_order")
    .order("name");
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function createTaxonomyRow(
  table: string,
  input: { slug: string; name: string; sortOrder: number },
): Promise<void> {
  const { error } = await supabase
    .from(table as any)
    .insert({ slug: input.slug, name: input.name, sort_order: input.sortOrder } as any);
  if (error) throw normalizeError(error);
}

export async function updateTaxonomyRow(
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from(table as any)
    .update(patch as any)
    .eq("id", id);
  if (error) throw normalizeError(error);
}

export async function deleteTaxonomyRow(table: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(table as any)
    .delete()
    .eq("id", id);
  if (error) throw normalizeError(error);
}
