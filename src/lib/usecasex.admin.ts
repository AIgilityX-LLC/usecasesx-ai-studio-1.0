// Admin store for UseCasesX™ catalogue authoring.
// Public API preserved; all data access goes through src/lib/domain/admin.repository.

import { useCallback, useEffect, useState } from "react";
import * as adminRepo from "@/lib/domain/admin.repository";
import { toUserMessage } from "@/lib/domain/errors";
import type { Level, Risk, Maturity, TTV } from "@/lib/usecasex.mock";

export type Visibility = "Free/Lite" | "Pro" | "Both" | "Hidden";
export type Status =
  | "Draft"
  | "Submitted for Review"
  | "Approved"
  | "Published"
  | "Unpublished"
  | "Deprecated"
  | "Archived";

export const VISIBILITIES: Visibility[] = ["Free/Lite", "Pro", "Both", "Hidden"];
export const STATUSES: Status[] = [
  "Draft",
  "Submitted for Review",
  "Approved",
  "Published",
  "Unpublished",
  "Deprecated",
  "Archived",
];

export const PLATFORM_OPTIONS = [
  "AI Readiness",
  "AI ROI Calculator",
  "SARPI",
  "CyberX C3G",
  "AdvisorX",
  "FlowX",
  "PrivacyX",
  "AssureX",
  "AuditX",
  "RegulatorX",
  "ComplyX",
  "ARES",
  "ConversX",
  "SimulaX",
] as const;
export type PlatformOption = (typeof PLATFORM_OPTIONS)[number];

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
  "Free/Lite": "free_lite",
  Pro: "pro",
  Both: "both",
  Hidden: "hidden",
};
const VIS_FROM_DB: Record<string, Visibility> = {
  free_lite: "Free/Lite",
  pro: "Pro",
  both: "Both",
  hidden: "Hidden",
};

const STATUS_TO_DB: Record<Status, string> = {
  Draft: "draft",
  "Submitted for Review": "submitted_for_review",
  Approved: "approved",
  Published: "published",
  Unpublished: "unpublished",
  Deprecated: "deprecated",
  Archived: "archived",
};
const STATUS_FROM_DB: Record<string, Status> = {
  draft: "Draft",
  submitted_for_review: "Submitted for Review",
  review: "Submitted for Review",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  deprecated: "Deprecated",
  archived: "Archived",
};

/* ---------------- helpers ---------------- */

export function emptyUseCase(): AdminUseCase {
  const id = `new-${Date.now().toString(36)}`;
  return {
    id,
    slug: "",
    title: "",
    shortDescription: "",
    fullDescription: "",
    tags: [],
    industry: "",
    businessFunction: "",
    aiType: "",
    businessObjective: "",
    maturity: "Intermediate",
    businessProblem: "",
    aiSolution: "",
    valuePotential: "Medium",
    roiAreas: [],
    kpis: [],
    timeToValue: "Medium",
    complexity: "Medium",
    implementationSteps: "",
    dataRequired: "",
    integrations: "",
    skills: "",
    riskLevel: "Medium",
    governanceNotes: "",
    cybersecurityNotes: "",
    privacyNotes: "",
    governanceRequired: false,
    privacyReviewRequired: false,
    cyberReviewRequired: false,
    assuranceReviewRequired: false,
    platforms: [],
    visibility: "Both",
    status: "Draft",
    featured: false,
    displayOrder: 0,
    changeNotes: "",
    updatedAt: new Date().toISOString(),
    auditLog: [],
  };
}

export function completionPercent(uc: AdminUseCase): number {
  const checks: boolean[] = [
    !!uc.title.trim(),
    !!uc.slug.trim(),
    !!uc.shortDescription.trim(),
    !!uc.fullDescription.trim(),
    uc.tags.length > 0,
    !!uc.industry,
    !!uc.businessFunction,
    !!uc.aiType,
    !!uc.businessObjective,
    !!uc.businessProblem.trim(),
    !!uc.aiSolution.trim(),
    uc.roiAreas.length > 0,
    uc.kpis.length > 0,
    !!uc.implementationSteps.trim(),
    !!uc.dataRequired.trim(),
    !!uc.integrations.trim(),
    !!uc.skills.trim(),
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
  else if (contentStatus === "deprecated") lifecycle = "deprecated";
  else if (contentStatus === "submitted_for_review") lifecycle = "review";
  else if (contentStatus === "approved") lifecycle = "approved";
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

/* ---------------- data access (domain layer) ---------------- */

// All catalogue reads/writes go through the admin repository so validation,
// ownership and error normalization live in one place.
// See docs/architecture/domain-boundaries.md.

/* ---------------- hook ---------------- */

export function useAdminStore() {
  const [list, setList] = useState<AdminUseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminRepo.attachPrimaryTaxonomy(
        (await adminRepo.listUseCases()) as adminRepo.UseCaseRow[],
      );
      const audits = await adminRepo.loadUseCaseAuditMap(rows.map((r) => r.id));
      setList(rows.map((r) => fromDb(r as DbUseCase, audits[r.id] ?? [])));
      setError(null);
    } catch (e) {
      setError(toUserMessage(e, "We could not load the catalogue."));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsert = useCallback(
    async (uc: AdminUseCase, action: string): Promise<AdminUseCase | null> => {
      const errors = validateUseCase(uc);
      if (errors.length > 0) {
        setError(errors.join("; "));
        return null;
      }
      const isNew = uc.id.startsWith("new-") || uc.id.startsWith("dup-");
      const patch = toDbPatch(uc);

      try {
        const savedId = isNew
          ? await adminRepo.insertUseCase(patch)
          : (await adminRepo.updateUseCase(uc.id, patch), uc.id);
        await adminRepo.syncTaxonomyJoins(savedId, {
          industry: uc.industry,
          businessFunction: uc.businessFunction,
          aiType: uc.aiType,
          businessObjective: uc.businessObjective,
        });
        await adminRepo.writeUseCaseAudit(savedId, action, uc.changeNotes || undefined);
        await reload();
        return { ...uc, id: savedId };
      } catch (e) {
        setError(toUserMessage(e, "We could not save this use case."));
        return null;
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await adminRepo.writeUseCaseAudit(id, "Deleted");
        await adminRepo.deleteUseCase(id);
      } catch (e) {
        setError(toUserMessage(e, "We could not delete this use case."));
      }
      await reload();
    },
    [reload],
  );

  const setStatus = useCallback(
    async (id: string, status: Status, action: string) => {
      const contentStatus = STATUS_TO_DB[status];
      const lifecycle =
        contentStatus === "published"
          ? "published"
          : contentStatus === "archived"
            ? "archived"
            : contentStatus === "submitted_for_review"
              ? "review"
              : "draft";
      const patch: Record<string, unknown> = { content_status: contentStatus, status: lifecycle };
      if (contentStatus === "published") patch.published_at = new Date().toISOString();
      try {
        await adminRepo.updateUseCase(id, patch);
        await adminRepo.writeUseCaseAudit(id, action);
      } catch (e) {
        setError(toUserMessage(e, "We could not update the status."));
        return;
      }
      await reload();
    },
    [reload],
  );

  const duplicate = useCallback(
    async (id: string) => {
      try {
        const src = (await adminRepo.getUseCase(id)) as DbUseCase;
        const copy: Record<string, unknown> = {
          ...src,
          slug: `${src.slug}-copy-${Date.now().toString(36).slice(-4)}`,
          title: `${src.title} (copy)`,
          content_status: "draft",
          status: "draft",
          is_featured: false,
          published_at: null,
        };
        delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        const newId = await adminRepo.insertUseCase(copy);
        await adminRepo.writeUseCaseAudit(newId, "Duplicated", `From ${src.slug}`);
      } catch (e) {
        setError(toUserMessage(e, "We could not duplicate this use case."));
        return;
      }
      await reload();
    },
    [reload],
  );

  return { list, loading, error, upsert, remove, setStatus, duplicate, reload };
}
