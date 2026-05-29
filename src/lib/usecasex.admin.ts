// Local admin-only mock store for use case authoring.
// Mock-first; swap internals for Supabase CRUD via createServerFn later.

import { useCallback, useEffect, useState } from "react";
import { MOCK_USE_CASES, type MockUseCase, type Level, type Risk, type Maturity, type TTV } from "@/lib/usecasex.mock";

export type Visibility = "Free/Lite" | "Pro" | "Both" | "Hidden";
export type Status = "Draft" | "Submitted for Review" | "Approved" | "Published" | "Unpublished" | "Archived";

export const VISIBILITIES: Visibility[] = ["Free/Lite", "Pro", "Both", "Hidden"];
export const STATUSES: Status[] = ["Draft", "Submitted for Review", "Approved", "Published", "Unpublished", "Archived"];

export const PLATFORM_OPTIONS = [
  "AI Readiness", "AI ROI Calculator", "SARPI", "CyberX C3G", "AdvisorX",
  "FlowX", "PrivacyX", "AssureX", "AuditX", "RegulatorX", "ComplyX",
  "ARES", "ConversX", "SimulaX",
] as const;
export type PlatformOption = typeof PLATFORM_OPTIONS[number];

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

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  detail?: string;
}

const STORAGE_KEY = "usecasex.admin.store.v1";

function seedFromMock(m: MockUseCase): AdminUseCase {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    shortDescription: m.summary,
    fullDescription: m.summary,
    tags: [m.industry.slug, m.businessFunction.toLowerCase().replace(/\s+/g, "-")],
    industry: m.industry.slug,
    businessFunction: m.businessFunction,
    aiType: m.aiType,
    businessObjective: m.objective,
    maturity: m.maturity,
    businessProblem: "",
    aiSolution: "",
    valuePotential: m.valuePotential,
    roiAreas: [],
    kpis: [],
    timeToValue: m.timeToValue,
    complexity: m.complexity,
    implementationSteps: "",
    dataRequired: "",
    integrations: "",
    skills: "",
    riskLevel: m.riskLevel,
    governanceNotes: "",
    cybersecurityNotes: "",
    privacyNotes: "",
    governanceRequired: m.riskLevel === "High" || m.riskLevel === "Critical",
    privacyReviewRequired: false,
    cyberReviewRequired: m.riskLevel === "Critical",
    assuranceReviewRequired: false,
    platforms: m.platforms
      .map((p) => mapPlatformSlug(p.slug))
      .filter(Boolean) as PlatformOption[],
    visibility: "Both",
    status: "Published",
    featured: false,
    displayOrder: parseInt(m.id, 10) || 0,
    changeNotes: "",
    updatedAt: m.publishedAt,
    auditLog: [{ ts: m.publishedAt, actor: "system", action: "Seeded from catalogue" }],
  };
}

function mapPlatformSlug(slug: string): PlatformOption | null {
  const m: Record<string, PlatformOption> = {
    sarpi: "SARPI", cyberx: "CyberX C3G", advisorx: "AdvisorX",
    flowx: "FlowX", privacyx: "PrivacyX", assurex: "AssureX",
    auditx: "AuditX", regulatorx: "RegulatorX", complyx: "ComplyX",
    ares: "ARES", conversx: "ConversX", simulax: "SimulaX",
    roi: "AI ROI Calculator",
  };
  return m[slug] ?? null;
}

function defaultState(): AdminUseCase[] {
  return MOCK_USE_CASES.map(seedFromMock);
}

function read(): AdminUseCase[] {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as AdminUseCase[];
  } catch { return defaultState(); }
}

function write(list: AdminUseCase[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("usecasex-admin-change"));
}

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
    auditLog: [{ ts: new Date().toISOString(), actor: "admin", action: "Created" }],
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
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function useAdminStore() {
  const [list, setList] = useState<AdminUseCase[]>(() => read());

  useEffect(() => {
    const sync = () => setList(read());
    window.addEventListener("usecasex-admin-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("usecasex-admin-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: AdminUseCase[]) => { write(next); setList(next); }, []);

  const upsert = useCallback((uc: AdminUseCase, action: string, actor = "admin") => {
    const next = read();
    const idx = next.findIndex((x) => x.id === uc.id);
    const updated: AdminUseCase = {
      ...uc,
      updatedAt: new Date().toISOString(),
      auditLog: [...uc.auditLog, { ts: new Date().toISOString(), actor, action, detail: uc.changeNotes || undefined }],
    };
    if (idx >= 0) next[idx] = updated;
    else next.unshift(updated);
    persist(next);
    return updated;
  }, [persist]);

  const remove = useCallback((id: string) => {
    persist(read().filter((x) => x.id !== id));
  }, [persist]);

  const setStatus = useCallback((id: string, status: Status, action: string) => {
    const next = read();
    const idx = next.findIndex((x) => x.id === id);
    if (idx < 0) return;
    next[idx] = {
      ...next[idx],
      status,
      updatedAt: new Date().toISOString(),
      auditLog: [...next[idx].auditLog, { ts: new Date().toISOString(), actor: "admin", action }],
    };
    persist(next);
  }, [persist]);

  const duplicate = useCallback((id: string) => {
    const src = read().find((x) => x.id === id);
    if (!src) return;
    const copy: AdminUseCase = {
      ...src,
      id: `dup-${Date.now().toString(36)}`,
      slug: `${src.slug}-copy`,
      title: `${src.title} (copy)`,
      status: "Draft",
      featured: false,
      updatedAt: new Date().toISOString(),
      auditLog: [{ ts: new Date().toISOString(), actor: "admin", action: "Duplicated from " + src.slug }],
    };
    persist([copy, ...read()]);
    return copy;
  }, [persist]);

  return { list, upsert, remove, setStatus, duplicate };
}
