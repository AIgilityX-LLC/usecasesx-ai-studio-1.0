/**
 * UseCasesX™ Supabase service layer.
 *
 * Thin, typed wrappers around the auto-generated browser Supabase client
 * (`@/integrations/supabase/client`). All functions throw on Supabase errors
 * so callers can wrap them with React Query / try-catch and surface friendly
 * messages. RLS is the source of truth for who can read/write what.
 *
 * Pages should migrate off mock data to these calls gradually.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export class ServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ServiceError";
  }
}

function unwrap<T>(data: T | null, error: { message: string } | null, fallback?: T): T {
  if (error) throw new ServiceError(error.message, error);
  if (data === null) {
    if (fallback !== undefined) return fallback;
    throw new ServiceError("No data returned");
  }
  return data;
}

/** Friendly message helper for UI components. */
export function formatServiceError(err: unknown): string {
  if (err instanceof ServiceError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

/** Dev-only error logger. Components can render this when NODE_ENV !== 'production'. */
export function devError(scope: string, err: unknown): void {
  if (import.meta.env?.MODE === "production") return;
  // eslint-disable-next-line no-console
  console.error(`[usecasex:${scope}]`, err);
}

type Tables = Database["public"]["Tables"];

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export async function getIndustries() {
  const { data, error } = await supabase
    .from("industries")
    .select("id, slug, name, description")
    .order("name");
  return unwrap(data, error, []);
}

export async function getBusinessFunctions() {
  const { data, error } = await supabase
    .from("business_functions")
    .select("id, slug, name")
    .order("name");
  return unwrap(data, error, []);
}

/** AI capability types (alias for ai_capabilities). */
export async function getAITypes() {
  const { data, error } = await supabase
    .from("ai_capabilities")
    .select("id, slug, name")
    .order("name");
  return unwrap(data, error, []);
}

export async function getBusinessObjectives() {
  const { data, error } = await supabase
    .from("business_objectives")
    .select("id, slug, name")
    .order("name");
  return unwrap(data, error, []);
}

export async function getPlatformModules() {
  const { data, error } = await supabase
    .from("platform_modules")
    .select("id, slug, name, description, category, external_url, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  return unwrap(data, error, []);
}

// ---------------------------------------------------------------------------
// Use cases (public)
// ---------------------------------------------------------------------------

export interface UseCaseFilters {
  q?: string;
  industries?: string[]; // slugs
  capabilities?: string[];
  businessFunctions?: string[];
  objectives?: string[];
  maturity?: string[];
  valuePotential?: string[];
  complexity?: string[];
  riskLevel?: string[];
  timeToValue?: string[];
  sort?: "recent" | "impact" | "maturity" | "featured";
  featuredOnly?: boolean;
  landingOnly?: boolean;
  limit?: number;
}

const USE_CASE_LIST_SELECT = `
  id, slug, title, summary, organization, organization_type, region,
  maturity, maturity_level, maturity_score, impact_score,
  value_potential, complexity, risk_level, time_to_value,
  is_featured, show_on_landing, display_order, published_at,
  use_case_industries ( industries ( slug, name ) ),
  use_case_capabilities ( ai_capabilities ( slug, name ) ),
  use_case_business_functions ( business_functions ( slug, name ) ),
  use_case_business_objectives ( business_objectives ( slug, name ) )
` as const;

export async function getPublishedUseCases(filters: UseCaseFilters = {}) {
  const {
    q = "",
    maturity = [],
    valuePotential = [],
    complexity = [],
    riskLevel = [],
    timeToValue = [],
    sort = "recent",
    featuredOnly = false,
    landingOnly = false,
    limit = 60,
    industries = [],
    capabilities = [],
    businessFunctions = [],
    objectives = [],
  } = filters;

  let query = supabase
    .from("use_cases")
    .select(USE_CASE_LIST_SELECT)
    .eq("status", "published");

  if (featuredOnly) query = query.eq("is_featured", true);
  if (landingOnly) query = query.eq("show_on_landing", true);

  if (q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(
      `title.ilike.${term},summary.ilike.${term},organization.ilike.${term}`,
    );
  }

  if (maturity.length)
    query = query.in(
      "maturity",
      maturity as Array<Tables["use_cases"]["Row"]["maturity"] & string>,
    );
  if (valuePotential.length) query = query.in("value_potential", valuePotential);
  if (complexity.length) query = query.in("complexity", complexity);
  if (riskLevel.length) query = query.in("risk_level", riskLevel);
  if (timeToValue.length) query = query.in("time_to_value", timeToValue);

  if (sort === "impact") query = query.order("impact_score", { ascending: false, nullsFirst: false });
  else if (sort === "maturity") query = query.order("maturity_score", { ascending: false, nullsFirst: false });
  else if (sort === "featured") query = query.order("display_order", { ascending: true });
  else query = query.order("published_at", { ascending: false, nullsFirst: false });

  const { data, error } = await query.limit(limit);
  const rows = unwrap(data, error, [] as unknown[]);

  // Client-side join filter for taxonomy slugs (Supabase nested ".in" is limited)
  const slugSet = (arr: string[]) => new Set(arr);
  const indSet = slugSet(industries);
  const capSet = slugSet(capabilities);
  const bfnSet = slugSet(businessFunctions);
  const objSet = slugSet(objectives);

  return rows.filter((row: any) => {
    const inds: string[] = (row.use_case_industries ?? []).map((x: any) => x.industries?.slug).filter(Boolean);
    const caps: string[] = (row.use_case_capabilities ?? []).map((x: any) => x.ai_capabilities?.slug).filter(Boolean);
    const bfns: string[] = (row.use_case_business_functions ?? []).map((x: any) => x.business_functions?.slug).filter(Boolean);
    const objs: string[] = (row.use_case_business_objectives ?? []).map((x: any) => x.business_objectives?.slug).filter(Boolean);
    if (indSet.size && !inds.some((s) => indSet.has(s))) return false;
    if (capSet.size && !caps.some((s) => capSet.has(s))) return false;
    if (bfnSet.size && !bfns.some((s) => bfnSet.has(s))) return false;
    if (objSet.size && !objs.some((s) => objSet.has(s))) return false;
    return true;
  });
}

/** Alias for callers that want a more "search-y" name. */
export const searchUseCases = getPublishedUseCases;

export async function getUseCaseBySlug(slug: string) {
  const { data, error } = await supabase
    .from("use_cases")
    .select(`
      *,
      use_case_industries ( industries ( slug, name ) ),
      use_case_capabilities ( ai_capabilities ( slug, name ) ),
      use_case_business_functions ( business_functions ( slug, name ) ),
      use_case_business_objectives ( business_objectives ( slug, name ) ),
      use_case_metrics ( id, label, value, unit, sort_order ),
      use_case_links ( id, label, url, kind ),
      external_module_links ( id, module, label, url, sort_order )
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  if (!data) throw new ServiceError("Use case not found");
  return data;
}

export async function getFeaturedUseCases(limit = 6) {
  return getPublishedUseCases({ featuredOnly: true, sort: "featured", limit });
}

/** Related = same industry overlap, exclude self. Best-effort, no scoring model yet. */
export async function getRelatedUseCases(useCaseId: string, limit = 4) {
  // Step 1: find industry ids for this use case
  const { data: links, error: linkErr } = await supabase
    .from("use_case_industries")
    .select("industry_id")
    .eq("use_case_id", useCaseId);
  if (linkErr) throw new ServiceError(linkErr.message, linkErr);
  const industryIds = (links ?? []).map((r) => r.industry_id);
  if (!industryIds.length) return [];

  // Step 2: find other use cases sharing those industries
  const { data: siblings, error: sibErr } = await supabase
    .from("use_case_industries")
    .select("use_case_id")
    .in("industry_id", industryIds)
    .neq("use_case_id", useCaseId)
    .limit(50);
  if (sibErr) throw new ServiceError(sibErr.message, sibErr);
  const ids = Array.from(new Set((siblings ?? []).map((r) => r.use_case_id))).slice(0, limit);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("use_cases")
    .select(USE_CASE_LIST_SELECT)
    .in("id", ids)
    .eq("status", "published");
  return unwrap(data, error, []);
}

// ---------------------------------------------------------------------------
// Leads & analytics
// ---------------------------------------------------------------------------

export interface LeadCapturePayload {
  fullName: string;
  email: string;
  company?: string | null;
  role?: string | null;
  country?: string | null;
  industry?: string | null;
  interestArea?: string | null;
  sourceUseCase?: string | null;
  sourcePage?: string | null;
  cta?: string | null;
  eligible?: boolean | null;
  waitlistStatus?: string | null;
}

export async function createLeadCapture(payload: LeadCapturePayload) {
  const { error } = await supabase.from("lead_captures").insert({
    full_name: payload.fullName,
    email: payload.email,
    company: payload.company ?? null,
    role: payload.role ?? null,
    country: payload.country ?? null,
    industry: payload.industry ?? null,
    interest_area: payload.interestArea ?? null,
    source_use_case: payload.sourceUseCase ?? null,
    source_page: payload.sourcePage ?? null,
    cta: payload.cta ?? null,
    eligible: payload.eligible ?? null,
    waitlist_status: payload.waitlistStatus ?? "pending",
  });
  if (error) throw new ServiceError(error.message, error);
  return { ok: true as const };
}

export interface CTAEventPayload {
  cta: string;
  useCaseId?: string | null;
  targetPlatform?: string | null;
  targetRoute?: string | null;
  sourcePage?: string | null;
  sessionId?: string | null;
}

export async function trackCTAEvent(payload: CTAEventPayload) {
  const { error } = await supabase.from("cta_events").insert({
    cta: payload.cta,
    use_case_id: payload.useCaseId ?? null,
    target_platform: payload.targetPlatform ?? null,
    target_route: payload.targetRoute ?? null,
    source_page: payload.sourcePage ?? null,
    session_id: payload.sessionId ?? null,
  });
  if (error) devError("trackCTAEvent", error);
}

export interface ViewEventPayload {
  useCaseId: string;
  sessionId?: string | null;
  sourcePage?: string | null;
  referrer?: string | null;
}

export async function trackUseCaseView(payload: ViewEventPayload) {
  const { error } = await supabase.from("use_case_views").insert({
    use_case_id: payload.useCaseId,
    session_id: payload.sessionId ?? null,
    source_page: payload.sourcePage ?? null,
    referrer: payload.referrer ?? null,
  });
  if (error) devError("trackUseCaseView", error);
}

export interface DownloadEventPayload {
  useCaseId: string;
  assetKind?: string | null;
  sessionId?: string | null;
  sourcePage?: string | null;
}

export async function trackUseCaseDownload(payload: DownloadEventPayload) {
  const { error } = await supabase.from("use_case_downloads").insert({
    use_case_id: payload.useCaseId,
    asset_kind: payload.assetKind ?? null,
    session_id: payload.sessionId ?? null,
    source_page: payload.sourcePage ?? null,
  });
  if (error) devError("trackUseCaseDownload", error);
}

// ---------------------------------------------------------------------------
// Auth & profile
// ---------------------------------------------------------------------------

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new ServiceError(error.message, error);
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function createOrUpdateUserProfile(patch: Partial<Tables["profiles"]["Update"]>) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Not signed in");
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, email: user.email ?? null, ...patch },
      { onConflict: "user_id" },
    )
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

// ---------------------------------------------------------------------------
// Pro: saved use cases, scoring, portfolios, reports
// ---------------------------------------------------------------------------

export async function saveUseCase(useCaseId: string, opts: { priority?: "Low" | "Medium" | "High"; note?: string } = {}) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Sign in to save use cases");
  const { error } = await supabase.from("saved_use_cases").upsert(
    {
      user_id: user.id,
      use_case_id: useCaseId,
      priority: opts.priority ?? "Medium",
      note: opts.note ?? null,
    },
    { onConflict: "user_id,use_case_id" },
  );
  if (error) throw new ServiceError(error.message, error);
}

export async function removeSavedUseCase(useCaseId: string) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Not signed in");
  const { error } = await supabase
    .from("saved_use_cases")
    .delete()
    .eq("user_id", user.id)
    .eq("use_case_id", useCaseId);
  if (error) throw new ServiceError(error.message, error);
}

export async function getSavedUseCases() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("saved_use_cases")
    .select(`
      use_case_id, priority, note, saved_at,
      use_cases ( ${USE_CASE_LIST_SELECT} )
    `)
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });
  return unwrap(data, error, []);
}

export interface ScorePayload {
  useCaseId: string;
  strategic?: number;
  value?: number;
  feasibility?: number;
  risk?: number;
  readiness?: number;
  ttv?: number;
}

export async function createUseCaseScore(payload: ScorePayload) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Sign in to score use cases");
  const dims = {
    strategic: payload.strategic ?? 0,
    value: payload.value ?? 0,
    feasibility: payload.feasibility ?? 0,
    risk: payload.risk ?? 0,
    readiness: payload.readiness ?? 0,
    ttv: payload.ttv ?? 0,
  };
  const total = Math.round((dims.strategic + dims.value + dims.feasibility + dims.risk + dims.readiness + dims.ttv) / 6);
  const { data, error } = await supabase
    .from("use_case_scores")
    .upsert(
      { user_id: user.id, use_case_id: payload.useCaseId, ...dims, total },
      { onConflict: "user_id,use_case_id" },
    )
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function getUseCaseScores() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("use_case_scores")
    .select("*")
    .eq("user_id", user.id);
  return unwrap(data, error, []);
}

export async function createPortfolio(input: { name: string; objective?: string | null }) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Sign in to create a portfolio");
  const { data, error } = await supabase
    .from("portfolios")
    .insert({ user_id: user.id, name: input.name, objective: input.objective ?? null })
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function getPortfolios() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("portfolios")
    .select(`
      id, name, objective, created_at, updated_at,
      portfolio_items ( use_case_id, added_at )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return unwrap(data, error, []);
}

export async function addUseCaseToPortfolio(portfolioId: string, useCaseId: string) {
  const { error } = await supabase
    .from("portfolio_items")
    .upsert({ portfolio_id: portfolioId, use_case_id: useCaseId }, { onConflict: "portfolio_id,use_case_id" });
  if (error) throw new ServiceError(error.message, error);
}

export async function removeUseCaseFromPortfolio(portfolioId: string, useCaseId: string) {
  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("portfolio_id", portfolioId)
    .eq("use_case_id", useCaseId);
  if (error) throw new ServiceError(error.message, error);
}

export async function updatePortfolio(
  id: string,
  patch: Partial<{
    name: string;
    objective: string | null;
    portfolio_type: string;
    status: string;
    target_department: string | null;
    target_quarter: string | null;
  }>,
) {
  const { error } = await supabase.from("portfolios").update(patch).eq("id", id);
  if (error) throw new ServiceError(error.message, error);
}

export async function deletePortfolio(id: string) {
  const { error } = await supabase.from("portfolios").delete().eq("id", id);
  if (error) throw new ServiceError(error.message, error);
}

/** Resolve a use_case slug → id. Returns null if missing/inaccessible. */
export async function getUseCaseIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("use_cases")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data?.id ?? null;
}

export async function listGeneratedReports() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("generated_reports")
    .select("id, title, kind, use_case_count, created_at, payload")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return unwrap(data, error, []);
}

export async function generateReportRecord(input: {
  title: string;
  kind: "Executive PDF" | "Portfolio PDF" | "Roadmap PDF" | string;
  useCaseCount: number;
  payload?: Record<string, unknown>;
}) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Sign in to generate reports");
  const { data, error } = await supabase
    .from("generated_reports")
    .insert({
      user_id: user.id,
      title: input.title,
      kind: input.kind,
      use_case_count: input.useCaseCount,
      payload: (input.payload ?? null) as any,
    })
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminListFilters {
  status?: Tables["use_cases"]["Row"]["status"][];
  q?: string;
  limit?: number;
}

export async function adminGetAllUseCases(filters: AdminListFilters = {}) {
  let query = supabase
    .from("use_cases")
    .select("id, slug, title, summary, status, is_featured, show_on_landing, display_order, published_at, updated_at")
    .order("updated_at", { ascending: false });
  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    query = query.or(`title.ilike.${term},slug.ilike.${term},organization.ilike.${term}`);
  }
  const { data, error } = await query.limit(filters.limit ?? 200);
  return unwrap(data, error, []);
}

export async function adminCreateUseCase(input: Tables["use_cases"]["Insert"]) {
  const user = await getCurrentUser();
  if (!user) throw new ServiceError("Sign in required");
  const { data, error } = await supabase
    .from("use_cases")
    .insert({ ...input, submitted_by: input.submitted_by ?? user.id })
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function adminUpdateUseCase(id: string, patch: Tables["use_cases"]["Update"]) {
  const { data, error } = await supabase
    .from("use_cases")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function adminPublishUseCase(id: string) {
  return adminUpdateUseCase(id, { status: "published", published_at: new Date().toISOString() });
}

export async function adminUnpublishUseCase(id: string) {
  return adminUpdateUseCase(id, { status: "draft" });
}

export async function adminArchiveUseCase(id: string) {
  return adminUpdateUseCase(id, { status: "archived" as Tables["use_cases"]["Row"]["status"] });
}

export async function adminDuplicateUseCase(id: string) {
  const { data: source, error: srcErr } = await supabase
    .from("use_cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (srcErr) throw new ServiceError(srcErr.message, srcErr);
  if (!source) throw new ServiceError("Source use case not found");
  const user = await getCurrentUser();
  const { id: _id, slug, title, created_at: _ca, updated_at: _ua, published_at: _pa, ...rest } = source as any;
  const copy = {
    ...rest,
    slug: `${slug}-copy-${Date.now()}`,
    title: `${title} (Copy)`,
    status: "draft",
    is_featured: false,
    show_on_landing: false,
    submitted_by: user?.id ?? rest.submitted_by ?? null,
  };
  const { data, error } = await supabase.from("use_cases").insert(copy).select().maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}

export async function adminGetLeads(limit = 200) {
  const { data, error } = await supabase
    .from("lead_captures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return unwrap(data, error, []);
}

export async function adminGetCTAAnalytics(opts: { since?: string; limit?: number } = {}) {
  let query = supabase
    .from("cta_events")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts.since) query = query.gte("created_at", opts.since);
  const { data, error } = await query.limit(opts.limit ?? 500);
  return unwrap(data, error, []);
}

// ---------------------------------------------------------------------------
// Integration (cross-module activity)
// ---------------------------------------------------------------------------

export interface IntegrationEventPayload {
  sourceModule: string;
  targetModule: string;
  eventType: string;
  useCaseId?: string | null;
  payload?: Record<string, unknown>;
}

export async function createIntegrationEvent(input: IntegrationEventPayload) {
  const user = await getCurrentUser();
  const { error } = await supabase.from("integration_events").insert({
    user_id: user?.id ?? null,
    source_module: input.sourceModule,
    target_module: input.targetModule,
    event_type: input.eventType,
    use_case_id: input.useCaseId ?? null,
    payload: (input.payload ?? null) as any,
  });
  if (error) devError("createIntegrationEvent", error);
}

export interface ExternalModuleLinkPayload {
  useCaseId: string;
  module: string;
  label: string;
  url: string;
  sortOrder?: number;
}

export async function createExternalModuleLink(input: ExternalModuleLinkPayload) {
  const { data, error } = await supabase
    .from("external_module_links")
    .insert({
      use_case_id: input.useCaseId,
      module: input.module,
      label: input.label,
      url: input.url,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .maybeSingle();
  if (error) throw new ServiceError(error.message, error);
  return data;
}
