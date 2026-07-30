import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { listUseCases, listTaxonomies, listRepositoryFacets } from "@/lib/use-cases.functions";
import { type FacetState } from "@/components/UseCaseFilters";
import { HorizontalFilters } from "@/components/usecasex/HorizontalFilters";
import { CuratedCollections } from "@/components/usecasex/CuratedCollections";
import { PageHero } from "@/components/usecasex/PageHero";
import { UseCaseCard } from "@/components/UseCaseCard";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui-kit/ErrorState";
import { CardSkeleton } from "@/components/LoadingSkeleton";

import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { PresetBar } from "@/components/usecasex/PresetBar";
import { CompareTray } from "@/components/usecasex/CompareTray";
import { track } from "@/lib/usecasex.tracking";
import { trackModuleEvent } from "@/lib/module-analytics";
import { AddToStudioBoardDialog } from "@/components/AddToStudioBoardDialog";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";
import type { UseCaseCardData } from "@/components/UseCaseCard";
import { Link } from "@tanstack/react-router";
import { Can } from "@/components/Can";
import { SEGMENTS, SECTORS } from "@/lib/segments";
import {
  derivePriority,
  deriveRoiRange,
  industrySlugsOf,
  segmentsForIndustries,
} from "@/lib/usecasex.derive";

const sortValues = ["relevant", "value", "complexity", "risk", "ttv", "newest"] as const;
type SortKey = (typeof sortValues)[number];

const searchSchema = z.object({
  q: z.string().optional(),
  industry: z.string().optional(),
  industries: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  businessFunctions: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  processes: z.array(z.string()).optional(),
  page: z.number().int().optional(),

  maturity: z.array(z.string()).optional(),
  valuePotential: z.array(z.string()).optional(),
  complexity: z.array(z.string()).optional(),
  riskLevel: z.array(z.string()).optional(),
  timeToValue: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  roiRange: z.array(z.string()).optional(),
  deploymentModel: z.array(z.string()).optional(),
  securityClassification: z.array(z.string()).optional(),
  sort: z.enum(sortValues).optional(),
  gov: z.boolean().optional(),
});
type Search = z.infer<typeof searchSchema>;

const SORT_LABELS: Record<SortKey, string> = {
  relevant: "Most relevant",
  value: "Highest value",
  complexity: "Lowest complexity",
  risk: "Lowest risk",
  ttv: "Fastest time to value",
  newest: "Newest",
};

const FACET_LABELS: Record<string, string> = {
  industries: "Industry",
  capabilities: "AI Pattern",
  businessFunctions: "Business Function",
  objectives: "Objective",
  maturity: "Maturity",
  valuePotential: "Value",
  complexity: "Complexity",
  riskLevel: "Risk",
  timeToValue: "Time to Value",
  sectors: "Sector",
  tags: "Tag",
  segments: "Market Segment",
  priority: "Priority",
  roiRange: "ROI Range",
  deploymentModel: "Deployment",
  securityClassification: "Security",
};

const taxQ = queryOptions({
  queryKey: ["taxonomies"],
  queryFn: () => listTaxonomies(),
  staleTime: 5 * 60 * 1000,
});

function mapSort(s: SortKey | undefined): "recent" | "impact" | "maturity" | "featured" {
  switch (s) {
    case "value":
      return "impact";
    case "newest":
      return "recent";
    case "relevant":
    default:
      return "recent";
  }
}

/** Cards per page; `page` in the URL is the number of pages loaded. */
const PAGE_SIZE = 24;
const MAX_PAGES = 5;

/** Build the server-fn input from URL search state. Shared by loader + component. */
function buildListInput(search: Search) {
  const industries = search.industries?.length
    ? search.industries
    : search.industry
      ? [search.industry]
      : [];
  const page = Math.min(Math.max(search.page ?? 1, 1), MAX_PAGES);
  return {
    q: search.q ?? "",
    industries,
    capabilities: search.capabilities ?? [],
    businessFunctions: search.businessFunctions ?? [],
    objectives: search.objectives ?? [],
    processes: search.processes ?? [],
    maturity: search.maturity ?? [],
    valuePotential: search.valuePotential ?? [],
    complexity: search.complexity ?? [],
    riskLevel: search.riskLevel ?? [],
    timeToValue: search.timeToValue ?? [],
    deploymentModel: search.deploymentModel ?? [],
    securityClassification: search.securityClassification ?? [],
    sort: mapSort(search.sort as SortKey | undefined),
    limit: Math.min(PAGE_SIZE * page, 120),
    page: 1,
  };
}

const listQ = (input: ReturnType<typeof buildListInput>) =>
  queryOptions({
    queryKey: ["use-cases", "explore", input],
    queryFn: () => listUseCases({ data: input }),
    staleTime: 60 * 1000,
  });

const facetsQ = queryOptions({
  queryKey: ["repository", "facets"],
  queryFn: () => listRepositoryFacets(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/_app/repository")({
  head: () => ({
    meta: [
      { title: "Explore 1000+ AI Use Cases — UseCasesX™" },
      {
        name: "description",
        content:
          "Filter AI, GenAI, Agentic AI and automation use cases by industry, function, value, complexity, risk and readiness.",
      },
    ],
  }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  // Server-render the first page of results so the repository is crawlable.
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(taxQ),
      context.queryClient.ensureQueryData(facetsQ),
      context.queryClient.ensureQueryData(listQ(buildListInput(deps.search as Search))),
    ]);
  },

  component: Page,
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function Page() {
  const { data: tax } = useSuspenseQuery(taxQ);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [leadOpen, setLeadOpen] = useState(false);
  const [boardPattern, setBoardPattern] = useState<UseCaseCardData | null>(null);
  const governanceFirst = search.gov ?? false;
  const plan = usePlan();
  const isLite = !plan.loading && plan.isAuthed && !plan.isPro && !plan.isAdmin;

  const handleAddToBoard = (c: UseCaseCardData) => {
    if (!plan.isAuthed) {
      toast.message("Sign in to add patterns to a Studio Board.");
      void trackModuleEvent("repository", "lock_attempt", {
        interaction: "add_to_studio_board",
        reason: "unauthenticated",
        use_case_id: c.id,
      });
      return;
    }
    if (isLite && c.visibility === "pro") {
      toast.message("This pattern is part of Pro / Enterprise.", {
        description: "Upgrade to unlock all premium AI use case patterns.",
        action: { label: "Upgrade", onClick: () => window.location.assign("/pro") },
      });
      void trackModuleEvent("repository", "lock_attempt", {
        interaction: "add_to_studio_board",
        reason: "pro_locked",
        use_case_id: c.id,
      });
      return;
    }
    track("cta_clicked", { cta: "add_to_studio_board", use_case_id: c.id });
    void trackModuleEvent("repository", "click", {
      interaction: "add_to_studio_board",
      use_case_id: c.id,
    });
    setBoardPattern(c);
  };

  const effectiveIndustries = useMemo(() => {
    if (search.industries && search.industries.length) return search.industries;
    if (search.industry) return [search.industry];
    return [];
  }, [search.industries, search.industry]);

  useEffect(() => {
    if (search.industry && !(search.industries && search.industries.length)) {
      navigate({
        search: (prev: Search) => ({
          ...prev,
          industries: [search.industry as string],
          industry: undefined,
        }),
        replace: true,
      });
    }
  }, [search.industry, search.industries, navigate]);

  useEffect(() => {
    void trackModuleEvent("repository", "view");
  }, []);

  const update = (p: Partial<Search>) =>
    navigate({
      search: (prev: Search) => {
        const next: Partial<Search> = { ...prev, ...p };
        (Object.keys(next) as (keyof Search)[]).forEach((k) => {
          const v = next[k];
          if (Array.isArray(v) && v.length === 0) (next as Record<string, unknown>)[k] = undefined;
          if (typeof v === "string" && v === "") (next as Record<string, unknown>)[k] = undefined;
        });
        return next as Search;
      },
    });

  const sort = (search.sort as SortKey | undefined) ?? "relevant";

  const queryInput = useMemo(
    () => buildListInput({ ...search, industries: effectiveIndustries }),
    [search, effectiveIndustries],
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...listQ(queryInput),
    placeholderData: (prev) => prev,
  });
  const facets = useQuery(facetsQ);

  const cases = data?.cases ?? [];

  const derivedFiltered = useMemo(() => {
    const segs = search.segments ?? [];
    const prio = search.priority ?? [];
    const roi = search.roiRange ?? [];
    const secs = search.sectors ?? [];
    if (!segs.length && !prio.length && !roi.length && !secs.length) return cases;
    return cases.filter((c) => {
      if (segs.length) {
        const cSegs = segmentsForIndustries(industrySlugsOf(c));
        if (!segs.some((s: string) => cSegs.includes(s))) return false;
      }
      if (secs.length) {
        const cInds = industrySlugsOf(c);
        if (!secs.some((s: string) => cInds.includes(s))) return false;
      }
      if (prio.length && !prio.includes(derivePriority(c))) return false;
      if (roi.length && !roi.includes(deriveRoiRange(c))) return false;
      return true;
    });
  }, [cases, search.segments, search.sectors, search.priority, search.roiRange]);

  const sorted = useMemo(() => {
    // Client-side sort fallback for sort keys not natively supported by the server fn.
    const rank: Record<string, number> = {
      Low: 1,
      Short: 1,
      Medium: 2,
      High: 3,
      Critical: 4,
      Long: 3,
    };
    const arr = [...derivedFiltered];
    if (sort === "complexity")
      arr.sort((a, b) => (rank[a.complexity ?? ""] ?? 99) - (rank[b.complexity ?? ""] ?? 99));
    else if (sort === "risk")
      arr.sort((a, b) => (rank[a.risk_level ?? ""] ?? 99) - (rank[b.risk_level ?? ""] ?? 99));
    else if (sort === "ttv")
      arr.sort((a, b) => (rank[a.time_to_value ?? ""] ?? 99) - (rank[b.time_to_value ?? ""] ?? 99));
    if (governanceFirst)
      arr.sort((a, b) => (rank[b.risk_level ?? ""] ?? 0) - (rank[a.risk_level ?? ""] ?? 0));
    return arr;
  }, [derivedFiltered, sort, governanceFirst]);

  // ---- Result counts, progressive loading, conversion helpers ----
  const page = Math.min(Math.max(search.page ?? 1, 1), MAX_PAGES);
  const total = data?.total ?? 0;
  const derivedActive = !!(
    search.segments?.length ||
    search.sectors?.length ||
    search.priority?.length ||
    search.roiRange?.length
  );
  const reachedPageCap = page >= MAX_PAGES && (data?.hasMore ?? false);
  const canLoadMore = !derivedActive && (data?.hasMore ?? false) && page < MAX_PAGES;

  const loadMore = () => {
    update({ page: page + 1 });
    track("results_load_more", { page: page + 1, total });
    void trackModuleEvent("repository", "click", { interaction: "load_more", page: page + 1 });
  };

  const trackConversion = (intent: string) => {
    track("conversion_intent", { intent, q: search.q, filters: activeCount, total });
    void trackModuleEvent("repository", "click", { interaction: "conversion_intent", intent });
  };

  const copyViewLink = () => {
    if (typeof window === "undefined") return;
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link to this view copied."))
      .catch(() => toast.error("Could not copy the link."));
    trackConversion("copy_view_link");
  };

  const selectCollection = (key: string, slug: string, name: string) => {
    update({ [key]: [slug], page: undefined } as Partial<Search>);
    track("collection_selected", { facet: key, value: slug });
    void trackModuleEvent("repository", "click", {
      interaction: "collection_selected",
      facet: key,
      value: slug,
      name,
    });
  };



  type ChipKey = keyof FacetState;
  const chips: { key: ChipKey; value: string; label: string }[] = [];
  const facetKeys: ChipKey[] = [
    "segments",
    "sectors",
    "industries",
    "capabilities",
    "businessFunctions",
    "objectives",
    "priority",
    "maturity",
    "valuePotential",
    "roiRange",
    "complexity",
    "riskLevel",
    "timeToValue",
    "deploymentModel",
    "securityClassification",
  ];
  const labelMaps: Partial<Record<ChipKey, Record<string, string>>> = {
    industries: Object.fromEntries(tax.industries.map((i) => [i.slug, i.name])),
    capabilities: Object.fromEntries(tax.capabilities.map((i) => [i.slug, i.name])),
    businessFunctions: Object.fromEntries(tax.businessFunctions.map((i) => [i.slug, i.name])),
    objectives: Object.fromEntries(tax.objectives.map((i) => [i.slug, i.name])),
    segments: Object.fromEntries(SEGMENTS.map((s) => [s.slug, s.short])),
    sectors: Object.fromEntries(SECTORS.map((s) => [s.slug, s.name])),
    roiRange: { high: "High ROI", medium: "Medium ROI", low: "Emerging ROI" },
  };
  for (const k of facetKeys) {
    const vals =
      k === "industries"
        ? effectiveIndustries
        : ((search as Record<string, string[] | undefined>)[k] ?? []);
    for (const v of vals) chips.push({ key: k, value: v, label: labelMaps[k]?.[v] ?? v });
  }
  const activeCount = chips.length;
  /** True when the visitor has narrowed the view in any way. */
  const hasAnyRefinement = activeCount > 0 || !!(search.q ?? "").trim();


  const removeChip = (key: ChipKey, value: string) => {
    if (key === "industries") {
      update({
        industries: effectiveIndustries.filter((x: string) => x !== value),
        industry: undefined,
      });
      track("filter_used", { facet: key, value, action: "remove" });
      void trackModuleEvent("repository", "click", {
        interaction: "filter_change",
        facet: key,
        action: "remove",
      });
      return;
    }
    const cur = (search as Record<string, string[] | undefined>)[key] ?? [];
    update({ [key]: cur.filter((x) => x !== value) } as Partial<Search>);
    track("filter_used", { facet: key, value, action: "remove" });
    void trackModuleEvent("repository", "click", {
      interaction: "filter_change",
      facet: key,
      action: "remove",
    });
  };

  const clearAll = () => {
    update({
      industries: undefined,
      industry: undefined,
      capabilities: undefined,
      businessFunctions: undefined,
      objectives: undefined,
      maturity: undefined,
      valuePotential: undefined,
      complexity: undefined,
      riskLevel: undefined,
      timeToValue: undefined,
      sectors: undefined,
      tags: undefined,
      segments: undefined,
      priority: undefined,
      roiRange: undefined,
      deploymentModel: undefined,
      securityClassification: undefined,
    });
    track("filter_used", { action: "clear_all" });
    void trackModuleEvent("repository", "click", {
      interaction: "filter_change",
      action: "clear_all",
    });
  };

  const handleFilterChange = (patch: Partial<Search>) => {
    update(patch);
    Object.entries(patch).forEach(([facet, value]) => track("filter_used", { facet, value }));
    Object.keys(patch).forEach(
      (facet) =>
        void trackModuleEvent("repository", "click", { interaction: "filter_change", facet }),
    );
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q || undefined });
    if (q) track("search_used", { q });
    if (q) void trackModuleEvent("repository", "click", { interaction: "search" });
  };

  const openCustomRequest = () => {
    track("custom_use_case_requested", { q: search.q });
    setLeadOpen(true);
  };

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="UseCasesX™ · Explore"
        title={
          <>
            Explore <span className="text-primary">AI Use Cases</span>
          </>
        }
        description="Search, filter and compare AI, GenAI, Agentic AI and automation use cases across 18+ industries."
        actions={
          <Can action="repo.create">
            <Link
              to="/administration"
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
            >
              + Submit new use case
            </Link>
          </Can>
        }
      >
        <form onSubmit={submitSearch} className="relative flex max-w-2xl">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 'fraud detection', 'citizen services', 'document AI'…"
            className="w-full rounded-lg border border-input bg-card py-3 pl-12 pr-28 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button className="absolute right-1.5 top-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
            Search
          </button>
        </form>
      </PageHero>

      {/* Sticky horizontal filter bar */}
      <div className="sticky top-14 z-20 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-[1400px] px-6 py-3">
          <HorizontalFilters
            tax={{
              ...tax,
              segments: SEGMENTS.map((s) => ({ slug: s.slug, name: s.name })),
              sectors: SECTORS.map((s) => ({ slug: s.slug, name: s.name })),
              // Only offered when published content is actually linked to processes.
              processes: (facets.data?.processes ?? []).map((p) => ({
                slug: p.slug,
                name: p.name,
              })),
            }}

            value={{ ...search, industries: effectiveIndustries } as Partial<FacetState>}
            onChange={(p) => handleFilterChange(p as Partial<Search>)}
            onClear={clearAll}
            activeCount={activeCount}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex-1">
            <PresetBar currentSearch={search as Record<string, unknown>} />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="font-mono text-base font-bold text-foreground">
                  {derivedActive ? sorted.length : total}
                </span>{" "}
                use case{(derivedActive ? sorted.length : total) === 1 ? "" : "s"}

                {(search.q ?? "").trim() && (
                  <>
                    {" "}
                    for <span className="font-semibold text-foreground">"{search.q}"</span>
                  </>
                )}
                {isFetching && !isLoading && (
                  <span className="ml-2 text-xs text-muted-foreground/70">updating…</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Sort
                </label>
                <select
                  value={sort}
                  onChange={(e) => update({ sort: e.target.value as SortKey })}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(activeCount > 0 || (search.q ?? "").trim()) && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {(search.q ?? "").trim() && (
                  <Chip
                    label={`Search: "${search.q}"`}
                    onRemove={() => {
                      setQ("");
                      update({ q: undefined });
                    }}
                  />
                )}
                {chips.map((c) => (
                  <Chip
                    key={`${c.key}:${c.value}`}
                    label={`${FACET_LABELS[c.key]}: ${c.label}`}
                    onRemove={() => removeChip(c.key, c.value)}
                  />
                ))}
                <button
                  onClick={clearAll}
                  className="ml-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {!hasAnyRefinement && facets.data && (
              <CuratedCollections facets={facets.data} onSelect={selectCollection} />
            )}

            {isError ? (
              <ErrorState
                title="We could not load the repository."
                description="The use case library is temporarily unavailable. Your filters have been kept — try again."
                onRetry={() => void refetch()}
              />
            ) : isLoading ? (
              <CardSkeleton count={6} />
            ) : sorted.length === 0 && (activeCount > 0 || (search.q ?? "").trim()) ? (
              <EmptyState
                title="No use cases match your search."
                description={
                  (search.q ?? "").trim()
                    ? `No results for "${search.q}" with the current filters. Try broadening your search or clearing some filters.`
                    : "No use cases match the selected filters. Try removing a facet — market segment, sector, AI pattern, priority, ROI range, deployment model or security classification — to widen your results."
                }
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setQ("");
                        clearAll();
                        update({ q: undefined });
                      }}
                      className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
                    >
                      Clear search & filters
                    </button>
                    <button
                      onClick={openCustomRequest}
                      className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary"
                    >
                      Request a custom pack
                    </button>
                  </div>
                }
              />
            ) : sorted.length === 0 ? (
              <EmptyState
                title="Your AI use case library is ready."
                description="Start by exploring patterns or creating your first AI Use Case Studio board."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={clearAll}
                      className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
                    >
                      Explore patterns
                    </button>
                    <Link
                      to="/ai-use-case-studio"
                      className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
                    >
                      Open AI Use Case Studio →
                    </Link>
                    <button
                      onClick={openCustomRequest}
                      className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary"
                    >
                      Request a custom pack
                    </button>
                  </div>
                }
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sorted.map((c) => {
                    const cd = c as UseCaseCardData;
                    const locked = isLite && cd.visibility === "pro";
                    return (
                      <UseCaseCard
                        key={cd.id}
                        c={cd}
                        onAddToBoard={handleAddToBoard}
                        locked={locked}
                      />
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-col items-center gap-3">
                  {canLoadMore ? (
                    <>
                      <button
                        onClick={loadMore}
                        disabled={isFetching}
                        className="rounded-md border border-primary/40 bg-primary/10 px-6 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                      >
                        {isFetching ? "Loading…" : "Load more use cases"}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Showing {sorted.length} of {total}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {reachedPageCap
                        ? `Showing the first ${sorted.length} of ${total} — refine your filters to narrow the set.`
                        : `Showing all ${sorted.length} matching use case${sorted.length === 1 ? "" : "s"}.`}
                    </p>
                  )}
                </div>

                {/* Context-preserving conversion band */}
                <div className="mt-10 rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-base font-bold text-foreground">
                    Turn this shortlist into a decision
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Take the {sorted.length} use case{sorted.length === 1 ? "" : "s"} in this view
                    into the AI Use Case Studio to capture your own opportunity, score it and build
                    a portfolio.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to="/ai-use-case-studio"
                      onClick={() => trackConversion("open_studio")}
                      className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
                    >
                      Capture an opportunity in Studio
                    </Link>
                    <button
                      onClick={copyViewLink}
                      className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
                    >
                      Copy link to this view
                    </button>
                    <button
                      onClick={openCustomRequest}
                      className="rounded-md border border-border bg-background px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary"
                    >
                      Request a custom pack
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 pb-10">
        <SampleDataDisclaimer />
      </div>

      <LeadCaptureModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        title="Request a custom AI use case pack"
        description="Tell us about your industry and objectives — our team will assemble a tailored pack and reach out."
        cta="custom_use_case_request"
        sourcePage="usecasex-explore"
      />
      <CompareTray />
      <AddToStudioBoardDialog
        open={!!boardPattern}
        onOpenChange={(o) => {
          if (!o) setBoardPattern(null);
        }}
        pattern={boardPattern}
      />
    </>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        ✕
      </button>
    </span>
  );
}
