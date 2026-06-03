// Supabase-backed admin store for UseCaseX™ catalogue authoring.
// Public API preserved so existing admin UI continues to work.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Level, Risk, Maturity, TTV } from "@/lib/usecasex.mock";

export type Visibility = "Free/Lite" | "Pro" | "Both" | "Hidden";
export type Status =
  | "Draft"
  | "Submitted for Review"
  | "Approved"
  | "Published"
  | "Unpublished"
  | "Archived";

export const VISIBILITIES: Visibility[] = ["Free/Lite", "Pro", "Both", "Hidden"];
export const STATUSES: Status[] = [
  "Draft",
  "Submitted for Review",
  "Approved",
  "Published",
  "Unpublished",
  "Archived",
];

export const PLATFORM_OPTIONS = [
  "AI Readiness", "AI ROI Calculator", "SARPI", "CyberX C3G", "AdvisorX",
  "FlowX", "PrivacyX", "AssureX", "AuditX", "RegulatorX", "ComplyX",
  "ARES", "ConversX", "SimulaX",
] as const;
export type PlatformOption = typeof PLATFORM_OPTIONS[number];

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface AdminUseCase {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  tags: string[];

  industry: string;
  businessFunction: string;
  aiType: string;
  businessObjective: string;
  maturity: Maturity;

  businessProblem: string;
  aiSolution: string;
  valuePotential: Level;
  roiAreas: string[];
  kpis: string[];
  timeToValue: TTV;

  complexity: Level;
  implementationSteps: string;
  dataRequired: string;
  integrations: string;
  skills: string;

  riskLevel: Risk;
  governanceNotes: string;
  cybersecurityNotes: string;
  privacyNotes: string;
  governanceRequired: boolean;
  privacyReviewRequired: boolean;
  cyberReviewRequired: boolean;
  assuranceReviewRequired: boolean;

  platforms: PlatformOption[];

  visibility: Visibility;
  status: Status;
  featured: boolean;
  displayOrder: number;
  changeNotes: string;

  updatedAt: string;
  auditLog: AuditEntry[];
}

/* ---------------- enum mappings ---------------- */

const VIS_TO_DB: Record<Visibility, string> = {
  "Free/Lite": "free_lite", "Pro": "pro", "Both": "both", "Hidden": "hidden",
};
const VIS_FROM_DB: Record<string, Visibility> = {
  free_lite: "Free/Lite", pro: "Pro", both: "Both", hidden: "Hidden",
};

const STATUS_TO_DB: Record<Status, string> = {
  Draft: "draft",
  "Submitted for Review": "submitted_for_review",
  Approved: "approved",
  Published: "published",
  Unpublished: "unpublished",
  Archived: "archived",
};
const STATUS_FROM_DB: Record<string, Status> = {
  draft: "Draft",
  submitted_for_review: "Submitted for Review",
  review: "Submitted for Review",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
};

/* ---------------- helpers ---------------- */

export function emptyUseCase(): AdminUseCase {
  const id = `new-${Date.now().toString(36)}`;
  return {
    id, slug: "", title: "", shortDescription: "", fullDescription: "", tags: [],
    industry: "", businessFunction: "", aiType: "", businessObjective: "",
    maturity: "Intermediate",
    businessProblem: "", aiSolution: "", valuePotential: "Medium", roiAreas: [], kpis: [], timeToValue: "Medium",
    complexity: "Medium", implementationSteps: "", dataRequired: "", integrations: "", skills: "",
    riskLevel: "Medium", governanceNotes: "", cybersecurityNotes: "", privacyNotes: "",
    governanceRequired: false, privacyReviewRequired: false, cyberReviewRequired: false, assuranceReviewRequired: false,
    platforms: [],
    visibility: "Both", status: "Draft", featured: false, displayOrder: 0, changeNotes: "",
    updatedAt: new Date().toISOString(),
    auditLog: [],
  };
}

export function completionPercent(uc: AdminUseCase): number {
  const checks: boolean[] = [
    !!uc.title.trim(), !!uc.slug.trim(), !!uc.shortDescription.trim(),
    !!uc.fullDescription.trim(), uc.tags.length > 0, !!uc.industry,
    !!uc.businessFunction, !!uc.aiType, !!uc.businessObjective,
    !!uc.businessProblem.trim(), !!uc.aiSolution.trim(),
    uc.roiAreas.length > 0, uc.kpis.length > 0,
    !!uc.implementationSteps.trim(), !!uc.dataRequired.trim(),
    !!uc.integrations.trim(), !!uc.skills.trim(),
    !!uc.governanceNotes.trim() || !!uc.cybersecurityNotes.trim() || !!uc.privacyNotes.trim(),
    uc.platforms.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Required-field validation. Returns array of human-readable errors. */
export function validateUseCase(uc: AdminUseCase): string[] {
  const errors: string[] = [];
  if (!uc.title.trim()) errors.push("Title is required");
  if (!uc.slug.trim()) errors.push("Slug is required");
  if (!uc.shortDescription.trim()) errors.push("Short description is required");
  if (!uc.industry) errors.push("Industry is required");
  if (!uc.businessFunction) errors.push("Business function is required");
  if (!uc.aiType) errors.push("AI type is required");
  if (!uc.valuePotential) errors.push("Value potential is required");
  if (!uc.complexity) errors.push("Complexity level is required");
  if (!uc.riskLevel) errors.push("Risk level is required");
  if (!uc.visibility) errors.push("Visibility is required");
  if (!uc.status) errors.push("Content status is required");
  return errors;
}

/* ---------------- DB ↔ UI mapping ---------------- */

type DbUseCase = Record<string, any>;

function fromDb(row: DbUseCase, audit: AuditEntry[] = []): AdminUseCase {
  return {
    id: row.id,
    slug: row.slug ?? "",
    title: row.title ?? "",
    shortDescription: row.summary ?? "",
    fullDescription: row.business_value ?? row.outcomes ?? "",
    tags: [],
    industry: row._industry_slug ?? "",
    businessFunction: row._business_function_slug ?? "",
    aiType: row._ai_type_slug ?? "",
    businessObjective: row._objective_slug ?? "",
    maturity: (row.maturity ?? "Intermediate") as Maturity,
    businessProblem: row.business_problem ?? row.problem ?? "",
    aiSolution: row.ai_solution_concept ?? row.solution ?? "",
    valuePotential: (row.value_potential ?? "Medium") as Level,
    roiAreas: row.roi_areas ?? [],
    kpis: row.kpis ?? [],
    timeToValue: (row.time_to_value ?? "Medium") as TTV,
    complexity: (row.complexity ?? "Medium") as Level,
    implementationSteps: row.outcomes ?? "",
    dataRequired: row.data_required ?? "",
    integrations: "",
    skills: "",
    riskLevel: (row.risk_level ?? "Medium") as Risk,
    governanceNotes: row.governance_notes ?? "",
    cybersecurityNotes: row.cybersecurity_notes ?? "",
    privacyNotes: row.privacy_notes ?? "",
    governanceRequired: !!row.governance_required,
    privacyReviewRequired: !!row.privacy_review_required,
    cyberReviewRequired: !!row.cyber_review_required,
    assuranceReviewRequired: !!row.assurance_review_required,
    platforms: (row.recommended_platforms ?? []) as PlatformOption[],
    visibility: VIS_FROM_DB[row.visibility] ?? "Both",
    status: STATUS_FROM_DB[row.content_status ?? row.status] ?? "Draft",
    featured: !!row.is_featured,
    displayOrder: row.display_order ?? 0,
    changeNotes: "",
    updatedAt: row.updated_at ?? new Date().toISOString(),
    auditLog: audit,
  };
}

function toDbPatch(uc: AdminUseCase) {
  const contentStatus = STATUS_TO_DB[uc.status];
  // Mirror to lifecycle status enum where compatible
  let lifecycle: string = "draft";
  if (contentStatus === "published") lifecycle = "published";
  else if (contentStatus === "archived") lifecycle = "archived";
  else if (contentStatus === "submitted_for_review") lifecycle = "review";
  else lifecycle = "draft";

  return {
    slug: uc.slug,
    title: uc.title,
    summary: uc.shortDescription,
    business_value: uc.fullDescription,
    problem: uc.businessProblem,
    solution: uc.aiSolution,
    business_problem: uc.businessProblem,
    ai_solution_concept: uc.aiSolution,
    data_required: uc.dataRequired,
    kpis: uc.kpis,
    roi_areas: uc.roiAreas,
    value_potential: uc.valuePotential,
    complexity: uc.complexity,
    risk_level: uc.riskLevel,
    time_to_value: uc.timeToValue,
    maturity_level: uc.maturity,
    maturity: uc.maturity,
    governance_notes: uc.governanceNotes,
    cybersecurity_notes: uc.cybersecurityNotes,
    privacy_notes: uc.privacyNotes,
    governance_required: uc.governanceRequired,
    privacy_review_required: uc.privacyReviewRequired,
    cyber_review_required: uc.cyberReviewRequired,
    assurance_review_required: uc.assuranceReviewRequired,
    recommended_platforms: uc.platforms,
    is_featured: uc.featured,
    display_order: uc.displayOrder,
    visibility: VIS_TO_DB[uc.visibility],
    content_status: contentStatus,
    status: lifecycle,
    published_at: contentStatus === "published" ? new Date().toISOString() : null,
    outcomes: uc.implementationSteps,
  };
}

/* ---------------- audit log ---------------- */

async function writeAudit(useCaseId: string | null, action: string, detail?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("use_case_audit_log").insert({
    use_case_id: useCaseId,
    actor_id: u.user.id,
    action,
    detail: detail ?? null,
  });
}

async function loadAuditMap(ids: string[]): Promise<Record<string, AuditEntry[]>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("use_case_audit_log")
    .select("use_case_id, action, detail, actor_id, created_at")
    .in("use_case_id", ids)
    .order("created_at", { ascending: true });
  const map: Record<string, AuditEntry[]> = {};
  for (const row of data ?? []) {
    const id = (row as any).use_case_id as string;
    if (!map[id]) map[id] = [];
    map[id].push({
      ts: (row as any).created_at,
      actor: (row as any).actor_id ?? "system",
      action: (row as any).action,
      detail: (row as any).detail ?? undefined,
    });
  }
  return map;
}

/* ---------------- taxonomy join helpers ---------------- */

async function fetchTaxonomyMaps() {
  const [ind, fn, ai, obj] = await Promise.all([
    supabase.from("industries").select("id, slug"),
    supabase.from("business_functions").select("id, slug"),
    supabase.from("ai_capabilities").select("id, slug"),
    supabase.from("business_objectives").select("id, slug"),
  ]);
  const toMap = (rows: any[] | null) => {
    const byId: Record<string, string> = {}, bySlug: Record<string, string> = {};
    for (const r of rows ?? []) { byId[r.id] = r.slug; bySlug[r.slug] = r.id; }
    return { byId, bySlug };
  };
  return {
    industries: toMap(ind.data),
    functions: toMap(fn.data),
    aiTypes: toMap(ai.data),
    objectives: toMap(obj.data),
  };
}

async function attachPrimaryTaxonomy(rows: DbUseCase[]) {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const [ind, fn, ai, obj, tax] = await Promise.all([
    supabase.from("use_case_industries").select("use_case_id, industry_id").in("use_case_id", ids),
    supabase.from("use_case_business_functions").select("use_case_id, business_function_id").in("use_case_id", ids),
    supabase.from("use_case_capabilities").select("use_case_id, capability_id").in("use_case_id", ids),
    supabase.from("use_case_business_objectives").select("use_case_id, objective_id").in("use_case_id", ids),
    fetchTaxonomyMaps(),
  ]);
  const pick = (data: any[] | null, key: string, map: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const r of data ?? []) if (!out[r.use_case_id]) out[r.use_case_id] = map[r[key]] ?? "";
    return out;
  };
  const indMap = pick(ind.data, "industry_id", tax.industries.byId);
  const fnMap = pick(fn.data, "business_function_id", tax.functions.byId);
  const aiMap = pick(ai.data, "capability_id", tax.aiTypes.byId);
  const objMap = pick(obj.data, "objective_id", tax.objectives.byId);
  return rows.map((r) => ({
    ...r,
    _industry_slug: indMap[r.id] ?? "",
    _business_function_slug: fnMap[r.id] ?? "",
    _ai_type_slug: aiMap[r.id] ?? "",
    _objective_slug: objMap[r.id] ?? "",
  }));
}

async function syncJoinRow(table: string, useCaseId: string, fkCol: string, lookupTable: string, slug: string) {
  // Replace the single primary mapping with the provided slug.
  await supabase.from(table as any).delete().eq("use_case_id", useCaseId);
  if (!slug) return;
  const { data } = await supabase.from(lookupTable as any).select("id").eq("slug", slug).maybeSingle();
  const id = (data as any)?.id;
  if (id) await supabase.from(table as any).insert({ use_case_id: useCaseId, [fkCol]: id });
}

async function syncTaxonomyJoins(useCaseId: string, uc: AdminUseCase) {
  await Promise.all([
    syncJoinRow("use_case_industries", useCaseId, "industry_id", "industries", uc.industry),
    syncJoinRow("use_case_business_functions", useCaseId, "business_function_id", "business_functions", uc.businessFunction),
    syncJoinRow("use_case_capabilities", useCaseId, "capability_id", "ai_capabilities", uc.aiType),
    syncJoinRow("use_case_business_objectives", useCaseId, "objective_id", "business_objectives", uc.businessObjective),
  ]);
}

/* ---------------- hook ---------------- */

export function useAdminStore() {
  const [list, setList] = useState<AdminUseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("use_cases")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      setError(error.message);
      setList([]);
      setLoading(false);
      return;
    }
    const rows = await attachPrimaryTaxonomy((data ?? []) as DbUseCase[]);
    const audits = await loadAuditMap(rows.map((r) => r.id));
    setList(rows.map((r) => fromDb(r, audits[r.id] ?? [])));
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const upsert = useCallback(
    async (uc: AdminUseCase, action: string): Promise<AdminUseCase | null> => {
      const errors = validateUseCase(uc);
      if (errors.length > 0) {
        setError(errors.join("; "));
        return null;
      }
      const isNew = uc.id.startsWith("new-") || uc.id.startsWith("dup-");
      const patch = toDbPatch(uc);
      const { data: u } = await supabase.auth.getUser();

      let savedId = uc.id;
      if (isNew) {
        const { data, error } = await supabase
          .from("use_cases")
          .insert({ ...patch, submitted_by: u.user?.id })
          .select("id")
          .single();
        if (error) { setError(error.message); return null; }
        savedId = (data as any).id;
      } else {
        const { error } = await supabase.from("use_cases").update(patch).eq("id", uc.id);
        if (error) { setError(error.message); return null; }
      }
      await syncTaxonomyJoins(savedId, uc);
      await writeAudit(savedId, action, uc.changeNotes || undefined);
      await reload();
      return { ...uc, id: savedId };
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await writeAudit(id, "Deleted");
      const { error } = await supabase.from("use_cases").delete().eq("id", id);
      if (error) setError(error.message);
      await reload();
    },
    [reload],
  );

  const setStatus = useCallback(
    async (id: string, status: Status, action: string) => {
      const contentStatus = STATUS_TO_DB[status];
      const lifecycle = contentStatus === "published" ? "published"
        : contentStatus === "archived" ? "archived"
        : contentStatus === "submitted_for_review" ? "review"
        : "draft";
      const patch: Record<string, any> = { content_status: contentStatus, status: lifecycle };
      if (contentStatus === "published") patch.published_at = new Date().toISOString();
      const { error } = await supabase.from("use_cases").update(patch).eq("id", id);
      if (error) { setError(error.message); return; }
      await writeAudit(id, action);
      await reload();
    },
    [reload],
  );

  const duplicate = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.from("use_cases").select("*").eq("id", id).single();
      if (error || !data) { setError(error?.message ?? "Use case not found"); return; }
      const { data: u } = await supabase.auth.getUser();
      const src = data as DbUseCase;
      const copy = {
        ...src,
        id: undefined,
        slug: `${src.slug}-copy-${Date.now().toString(36).slice(-4)}`,
        title: `${src.title} (copy)`,
        content_status: "draft",
        status: "draft",
        is_featured: false,
        published_at: null,
        submitted_by: u.user?.id,
        created_at: undefined,
        updated_at: undefined,
      };
      delete (copy as any).id;
      delete (copy as any).created_at;
      delete (copy as any).updated_at;
      const { data: ins, error: insErr } = await supabase.from("use_cases").insert(copy).select("id").single();
      if (insErr) { setError(insErr.message); return; }
      await writeAudit((ins as any).id, "Duplicated", `From ${src.slug}`);
      await reload();
    },
    [reload],
  );

  return { list, loading, error, upsert, remove, setStatus, duplicate, reload };
}
