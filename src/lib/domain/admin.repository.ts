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
  const row = unwrapResult(result, {
    allowNull: true,
    notFoundMessage: "We could not find that use case.",
  });
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
  const reviewerId = await requireCurrentUserId();
  const { data: submission, error: readErr } = await supabase
    .from("use_case_submissions")
    .select("id, user_id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (readErr) throw normalizeError(readErr);
  if (!submission) throw new DomainError("not_found", "Submission not found.");

  const { assertNotSelfReview } = await import("@/lib/submissions");
  assertNotSelfReview(submission.user_id, reviewerId);

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
    .from("cta_events_reportable" as never)
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

/* ---------------- global catalogue: slugs, references, import ---------------- */

/** slug → use case id for every global catalogue record (admin-only read). */
export async function fetchUseCaseSlugMap(): Promise<Record<string, string>> {
  const result = await supabase.from("use_cases").select("id, slug");
  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as Array<{
    id: string;
    slug: string;
  }>;
  const map: Record<string, string> = {};
  for (const row of rows) map[row.slug] = row.id;
  return map;
}

/** Known taxonomy slugs used to keep imports referentially valid. */
export async function fetchTaxonomySlugSets(): Promise<{
  industries: string[];
  functions: string[];
  capabilities: string[];
}> {
  const maps = await fetchTaxonomyMaps();
  return {
    industries: Object.keys(maps.industries.bySlug),
    functions: Object.keys(maps.functions.bySlug),
    capabilities: Object.keys(maps.aiTypes.bySlug),
  };
}

const TAXONOMY_REFERENCE_TABLES: Record<string, { table: string; column: string }[]> = {
  industries: [{ table: "use_case_industries", column: "industry_id" }],
  business_functions: [{ table: "use_case_business_functions", column: "business_function_id" }],
  ai_capabilities: [{ table: "use_case_capabilities", column: "capability_id" }],
  business_objectives: [{ table: "use_case_business_objectives", column: "objective_id" }],
};

/**
 * Counts catalogue rows still pointing at a taxonomy value. Callers must block
 * deletion when this is greater than zero so taxonomy edits preserve references.
 */
export async function countTaxonomyReferences(table: string, id: string): Promise<number> {
  const links = TAXONOMY_REFERENCE_TABLES[table];
  if (!links) return 0;
  let total = 0;
  for (const link of links) {
    const { count, error } = await (supabase as any)
      .from(link.table)
      .select("use_case_id", { count: "exact", head: true })
      .eq(link.column, id);
    if (error) throw normalizeError(error);
    total += count ?? 0;
  }
  return total;
}

export interface ImportRowValues {
  title: string;
  slug: string;
  summary: string;
  businessProblem: string;
  aiSolution: string;
  industry: string;
  businessFunction: string;
  aiType: string;
  valuePotential: string;
  complexity: string;
  riskLevel: string;
  sourceStatus: string;
  qualityStatus: string;
  provenance: string;
}

function importPatch(values: ImportRowValues): Record<string, unknown> {
  return {
    title: values.title.trim(),
    slug: values.slug.trim(),
    summary: values.summary.trim(),
    business_problem: values.businessProblem || null,
    ai_solution_concept: values.aiSolution || null,
    value_potential: values.valuePotential || null,
    complexity: values.complexity || null,
    risk_level: values.riskLevel || null,
    content_status: values.qualityStatus || "unverified",
    organization: values.provenance || null,
    // Imports always land unpublished; publishing stays a deliberate admin act.
    status: "draft",
    visibility: "hidden",
  };
}

/** Applies one planned import row. Never publishes; always writes an audit entry. */
export async function applyImportRow(
  action: "create" | "update",
  values: ImportRowValues,
  existingId?: string,
): Promise<string> {
  const patch = importPatch(values);
  let id = existingId ?? "";
  if (action === "update" && existingId) {
    await updateUseCase(existingId, patch);
  } else {
    id = await insertUseCase(patch);
  }
  await syncTaxonomyJoins(id, {
    industry: values.industry,
    businessFunction: values.businessFunction,
    aiType: values.aiType,
    businessObjective: "",
  });
  await writeUseCaseAudit(
    id,
    action === "update" ? "import.updated" : "import.created",
    `CSV import · source=${values.sourceStatus} · quality=${values.qualityStatus}${
      values.provenance ? ` · provenance=${values.provenance}` : ""
    }`,
  );
  return id;
}

/* ---------------- global content lifecycle ---------------- */

/**
 * Editorial columns captured in a published snapshot. Tenancy, identity and
 * timestamp columns are deliberately excluded so a rollback can never move a
 * record between owners.
 */
const SNAPSHOT_FIELDS = [
  "title",
  "slug",
  "summary",
  "business_value",
  "problem",
  "solution",
  "business_problem",
  "ai_solution_concept",
  "data_required",
  "kpis",
  "roi_areas",
  "value_potential",
  "complexity",
  "risk_level",
  "time_to_value",
  "maturity_level",
  "governance_notes",
  "cybersecurity_notes",
  "privacy_notes",
  "governance_required",
  "privacy_review_required",
  "cyber_review_required",
  "assurance_review_required",
  "recommended_platforms",
  "display_order",
  "visibility",
  "outcomes",
] as const;

function pickSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (field in row) out[field] = (row as any)[field];
  }
  return out;
}

async function writeAuditWithMetadata(
  useCaseId: string,
  action: string,
  detail: string | null,
  metadata: Record<string, unknown> | null,
): Promise<void> {
  const actorId = await currentUserId();
  if (!actorId) return;
  const { error } = await (supabase as any).from("use_case_audit_log").insert({
    use_case_id: useCaseId,
    actor_id: actorId,
    action,
    detail,
    metadata,
  });
  if (error) throw normalizeError(error);
}

/** Publishes a global use case and stores a restorable snapshot in the audit trail. */
export async function publishGlobalUseCase(id: string, note?: string): Promise<void> {
  const row = await getUseCase(id);
  const { publishBlockingIssues } = await import("@/lib/content-governance/model");
  const blockers = publishBlockingIssues({
    evidenceClass: ((row as any).evidence_class ?? "example") as any,
    provenanceUrl: (row as any).provenance_url ?? null,
    qualityStatus: (row as any).quality_status ?? null,
    contentOwnerName: (row as any).content_owner_name ?? null,
    lastReviewedAt: (row as any).last_reviewed_at ?? null,
    licenseUsageNote: (row as any).license_usage_note ?? null,
  });
  if (blockers.length) {
    throw new Error(blockers.join(" "));
  }
  await updateUseCase(id, {
    content_status: "published",
    status: "published",
    published_at: new Date().toISOString(),
  });
  await writeAuditWithMetadata(id, "Published", note ?? null, {
    snapshot: pickSnapshot({ ...row, content_status: "published" }),
  });
}

export async function deprecateGlobalUseCase(
  id: string,
  supersededById: string | null,
  note?: string,
): Promise<void> {
  await updateUseCase(id, {
    content_status: "deprecated",
    status: "deprecated",
    superseded_by_id: supersededById,
    published_at: null,
  });
  await writeAuditWithMetadata(id, "Deprecated", note ?? null, {
    superseded_by_id: supersededById,
  });
}

export async function unpublishGlobalUseCase(id: string, note?: string): Promise<void> {
  await updateUseCase(id, { content_status: "unpublished", status: "draft", published_at: null });
  await writeAuditWithMetadata(id, "Unpublished", note ?? null, null);
}

export async function archiveGlobalUseCase(id: string, note?: string): Promise<void> {
  await updateUseCase(id, { content_status: "archived", status: "archived", published_at: null });
  await writeAuditWithMetadata(id, "Archived", note ?? null, null);
}

export async function restoreGlobalUseCase(id: string, note?: string): Promise<void> {
  await updateUseCase(id, { content_status: "draft", status: "draft" });
  await writeAuditWithMetadata(id, "Restored to draft", note ?? null, null);
}

export async function setGlobalUseCaseFeatured(id: string, featured: boolean): Promise<void> {
  await updateUseCase(id, { is_featured: featured });
  await writeAuditWithMetadata(id, featured ? "Featured" : "Unfeatured", null, null);
}

export interface PublishedSnapshot {
  createdAt: string;
  actorId: string | null;
  values: Record<string, unknown>;
}

/** Most recent published snapshot for a use case, or null when never published. */
export async function getLastPublishedSnapshot(id: string): Promise<PublishedSnapshot | null> {
  const result = await (supabase as any)
    .from("use_case_audit_log")
    .select("created_at, actor_id, metadata")
    .eq("use_case_id", id)
    .eq("action", "Published")
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as Array<{
    created_at: string;
    actor_id: string | null;
    metadata: { snapshot?: Record<string, unknown> } | null;
  }>;
  for (const row of rows) {
    const values = row.metadata?.snapshot;
    if (values && Object.keys(values).length > 0) {
      return { createdAt: row.created_at, actorId: row.actor_id, values };
    }
  }
  return null;
}

/**
 * One-click rollback: restores the editorial content of the last published
 * snapshot and takes the record out of public circulation (unpublished, not
 * deleted) so the change is always reversible.
 */
export async function rollbackToLastPublished(id: string): Promise<PublishedSnapshot> {
  const snapshot = await getLastPublishedSnapshot(id);
  if (!snapshot) {
    throw new DomainError(
      "not_found",
      "This use case has no published version to roll back to yet.",
    );
  }
  await updateUseCase(id, {
    ...snapshot.values,
    content_status: "unpublished",
    status: "draft",
    published_at: null,
  });
  await writeAuditWithMetadata(
    id,
    "Rolled back",
    `Restored the version published on ${new Date(snapshot.createdAt).toLocaleString()} and unpublished it for review.`,
    null,
  );
  return snapshot;
}

/* ---------------- global content audit viewer ---------------- */

export interface GlobalAuditEntry {
  id: string;
  useCaseId: string | null;
  title: string;
  slug: string;
  action: string;
  detail: string | null;
  actorId: string | null;
  createdAt: string;
  restorable: boolean;
}

export async function listGlobalContentAudit(limit = 200): Promise<GlobalAuditEntry[]> {
  const result = await (supabase as any)
    .from("use_case_audit_log")
    .select("id, use_case_id, action, detail, actor_id, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as Array<Record<string, any>>;
  const ids = Array.from(
    new Set(rows.map((r) => r.use_case_id).filter((v): v is string => typeof v === "string")),
  );
  const titles: Record<string, { title: string; slug: string }> = {};
  if (ids.length > 0) {
    const meta = await supabase.from("use_cases").select("id, title, slug").in("id", ids);
    for (const row of (meta.data ?? []) as Array<{ id: string; title: string; slug: string }>) {
      titles[row.id] = { title: row.title, slug: row.slug };
    }
  }
  return rows.map((r) => ({
    id: r.id as string,
    useCaseId: (r.use_case_id as string | null) ?? null,
    title: titles[r.use_case_id]?.title ?? "Deleted record",
    slug: titles[r.use_case_id]?.slug ?? "",
    action: r.action as string,
    detail: (r.detail as string | null) ?? null,
    actorId: (r.actor_id as string | null) ?? null,
    createdAt: r.created_at as string,
    restorable: Boolean(r.metadata?.snapshot),
  }));
}
