import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useDeferredValue, useEffect } from "react";
import { z } from "zod";
import { MOCK_TAX, filterAndSortMock, type MockFilters, type SortKey } from "@/lib/usecasex.mock";
import { UseCaseFilters, type FacetState } from "@/components/UseCaseFilters";
import { MockUseCaseCard } from "@/components/MockUseCaseCard";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { track } from "@/lib/usecasex.tracking";

const sortValues = ["relevant", "value", "complexity", "risk", "ttv", "newest"] as const;

const searchSchema = z.object({
  q: z.string().optional(),
  industry: z.string().optional(), // singular preselect (?industry=banking)
  industries: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  businessFunctions: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  maturity: z.array(z.string()).optional(),
  valuePotential: z.array(z.string()).optional(),
  complexity: z.array(z.string()).optional(),
  riskLevel: z.array(z.string()).optional(),
  timeToValue: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sort: z.enum(sortValues).optional(),
});
type Search = z.infer<typeof searchSchema>;

const SORT_LABELS: Record<SortKey, string> = {
  relevant:   "Most relevant",
  value:      "Highest value",
  complexity: "Lowest complexity",
  risk:       "Lowest risk",
  ttv:        "Fastest time to value",
  newest:     "Newest",
};

const FACET_LABELS: Record<string, string> = {
  industries: "Industry",
  capabilities: "AI Type",
  businessFunctions: "Business Function",
  objectives: "Objective",
  maturity: "Maturity",
  valuePotential: "Value",
  complexity: "Complexity",
  riskLevel: "Risk",
  timeToValue: "Time to Value",
  sectors: "Sector",
  tags: "Tag",
};

export const Route = createFileRoute("/ai-hub/usecasex/explore")({
  head: () => ({
    meta: [
      { title: "Explore 1000+ AI Use Cases — UseCaseX™" },
      { name: "description", content: "Filter AI, GenAI, Agentic AI and automation use cases by industry, function, value, complexity, risk and readiness." },
    ],
  }),
  validateSearch: searchSchema,
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [leadOpen, setLeadOpen] = useState(false);

  // Merge singular ?industry= into industries[] (single source of truth for filtering & chips).
  const effectiveIndustries = useMemo(() => {
    if (search.industries && search.industries.length) return search.industries;
    if (search.industry) return [search.industry];
    return [];
  }, [search.industries, search.industry]);

  // If only ?industry= was supplied, normalize to industries[] in the URL on mount.
  useEffect(() => {
    if (search.industry && !(search.industries && search.industries.length)) {
      navigate({ search: (prev: Search) => ({ ...prev, industries: [search.industry as string], industry: undefined }), replace: true });
    }
  }, [search.industry, search.industries, navigate]);

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

  const filters: MockFilters = {
    q: search.q ?? "",
    industries: effectiveIndustries,
    capabilities: search.capabilities ?? [],
    businessFunctions: search.businessFunctions ?? [],
    objectives: search.objectives ?? [],
    valuePotential: search.valuePotential ?? [],
    complexity: search.complexity ?? [],
    riskLevel: search.riskLevel ?? [],
    maturity: search.maturity ?? [],
    timeToValue: search.timeToValue ?? [],
    sort: (search.sort as SortKey | undefined) ?? "relevant",
  };

  const deferred = useDeferredValue(filters);
  const results = useMemo(() => filterAndSortMock(deferred), [deferred]);
  const isStale = deferred !== filters;

  // Build active filter chips from all selected facets.
  type ChipKey = keyof FacetState;
  const chips: { key: ChipKey; value: string; label: string }[] = [];
  const facetKeys: ChipKey[] = ["industries","capabilities","businessFunctions","objectives","maturity","valuePotential","complexity","riskLevel","timeToValue"];
  for (const k of facetKeys) {
    const vals = k === "industries" ? effectiveIndustries : ((search as Record<string, string[] | undefined>)[k] ?? []);
    for (const v of vals) {
      const labelLookup: Record<string, string> | undefined =
        k === "industries"
          ? Object.fromEntries(MOCK_TAX.industries.map((i) => [i.slug, i.name]))
          : undefined;
      chips.push({ key: k, value: v, label: labelLookup?.[v] ?? v });
    }
  }
  const activeCount = chips.length;

  const removeChip = (key: ChipKey, value: string) => {
    if (key === "industries") {
      update({ industries: effectiveIndustries.filter((x: string) => x !== value), industry: undefined });
      track("filter_used", { facet: key, value, action: "remove" });
      return;
    }
    const cur = (search as Record<string, string[] | undefined>)[key] ?? [];
    update({ [key]: cur.filter((x) => x !== value) } as Partial<Search>);
    track("filter_used", { facet: key, value, action: "remove" });
  };

  const clearAll = () => {
    update({
      industries: undefined, industry: undefined, capabilities: undefined, businessFunctions: undefined,
      objectives: undefined, maturity: undefined, valuePotential: undefined,
      complexity: undefined, riskLevel: undefined, timeToValue: undefined,
    });
    track("filter_used", { action: "clear_all" });
  };

  const handleFilterChange = (patch: Partial<Search>) => {
    update(patch);
    Object.entries(patch).forEach(([facet, value]) => {
      track("filter_used", { facet, value });
    });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q || undefined });
    if (q) track("search_used", { q });
  };

  const openCustomRequest = () => {
    track("custom_use_case_requested", { q: search.q, filters });
    setLeadOpen(true);
  };

  return (
    <>
      {/* Hero / search */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore <span className="text-primary">AI Use Cases</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Search, filter and compare AI, GenAI, Agentic AI and automation use cases across 18+ industries.
          </p>
          <form onSubmit={submitSearch} className="relative mt-6 flex max-w-2xl">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 'fraud detection', 'citizen services', 'document AI'…"
              className="w-full rounded-lg border border-input bg-background py-3 pl-12 pr-28 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button className="absolute right-1.5 top-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filters sidebar */}
          <aside className="w-full shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-32">
              <UseCaseFilters
                tax={MOCK_TAX}
                value={{ ...search, industries: effectiveIndustries } as Partial<FacetState>}
                onChange={(p) => handleFilterChange(p as Partial<Search>)}
                onClear={clearAll}
                activeCount={activeCount}
              />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-base font-bold text-foreground">{results.length}</span> use case{results.length === 1 ? "" : "s"}
                {(search.q ?? "").trim() && <> for <span className="font-semibold text-foreground">"{search.q}"</span></>}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sort</label>
                <select
                  value={search.sort ?? "relevant"}
                  onChange={(e) => update({ sort: e.target.value as SortKey })}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active chips */}
            {(activeCount > 0 || (search.q ?? "").trim()) && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {(search.q ?? "").trim() && (
                  <Chip label={`Search: "${search.q}"`} onRemove={() => { setQ(""); update({ q: undefined }); }} />
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

            {/* Grid / empty / loading */}
            {isStale ? (
              <CardSkeleton count={6} />
            ) : results.length === 0 ? (
              <EmptyState
                title="No matching use cases found."
                description="We can build a custom AI use case pack for your industry and objectives."
                action={
                  <button
                    onClick={openCustomRequest}
                    className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-110"
                  >
                    Request a custom AI use case pack →
                  </button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((c) => (
                  <MockUseCaseCard key={c.id} c={c} onView={(uc) => track("view_use_case", { id: uc.id, slug: uc.slug })} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <LeadCaptureModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        title="Request a custom AI use case pack"
        description="Tell us about your industry and objectives — our team will assemble a tailored pack and reach out."
        cta="custom_use_case_request"
        sourcePage="usecasex-explore"
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
