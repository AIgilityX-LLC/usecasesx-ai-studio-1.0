import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { listUseCases, listTaxonomies } from "@/lib/use-cases.functions";
import { UseCaseFilters, type FacetState } from "@/components/UseCaseFilters";
import { HorizontalFilters } from "@/components/usecasex/HorizontalFilters";
import { PageHero } from "@/components/usecasex/PageHero";
import { UseCaseCard } from "@/components/UseCaseCard";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import { PresetBar } from "@/components/usecasex/PresetBar";
import { CompareTray } from "@/components/usecasex/CompareTray";
import { RiskClassBar } from "@/components/usecasex/RiskClassBar";
import { OutcomesFilterBar } from "@/components/usecasex/OutcomesFilterBar";
import { track } from "@/lib/usecasex.tracking";
import { AddToStudioBoardDialog } from "@/components/AddToStudioBoardDialog";
import { SampleDataDisclaimer } from "@/components/usecasex/SampleDataDisclaimer";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";
import type { UseCaseCardData } from "@/components/UseCaseCard";
import { Link } from "@tanstack/react-router";
import { Can } from "@/components/Can";

const sortValues = ["relevant", "value", "complexity", "risk", "ttv", "newest"] as const;
type SortKey = (typeof sortValues)[number];

const searchSchema = z.object({
  q: z.string().optional(),
  industry: z.string().optional(),
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

const taxQ = queryOptions({
  queryKey: ["taxonomies"],
  queryFn: () => listTaxonomies(),
  staleTime: 5 * 60 * 1000,
});

function mapSort(s: SortKey | undefined): "recent" | "impact" | "maturity" | "featured" {
  switch (s) {
    case "value": return "impact";
    case "newest": return "recent";
    case "relevant":
    default: return "recent";
  }
}

export const Route = createFileRoute("/_app/repository")({
  head: () => ({
    meta: [
      { title: "Explore 1000+ AI Use Cases — UseCasesX™" },
      { name: "description", content: "Filter AI, GenAI, Agentic AI and automation use cases by industry, function, value, complexity, risk and readiness." },
    ],
  }),
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(taxQ),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
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
      return;
    }
    if (isLite && c.visibility === "pro") {
      toast.message("This pattern is part of Pro / Enterprise.", {
        description: "Upgrade to unlock all premium AI use case patterns.",
        action: { label: "Upgrade", onClick: () => window.location.assign("/pro") },
      });
      return;
    }
    track("cta_clicked", { cta: "add_to_studio_board", use_case_id: c.id });
    setBoardPattern(c);
  };

  const effectiveIndustries = useMemo(() => {
    if (search.industries && search.industries.length) return search.industries;
    if (search.industry) return [search.industry];
    return [];
  }, [search.industries, search.industry]);

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

  const sort = (search.sort as SortKey | undefined) ?? "relevant";

  const queryInput = useMemo(() => ({
    q: search.q ?? "",
    industries: effectiveIndustries,
    capabilities: search.capabilities ?? [],
    businessFunctions: search.businessFunctions ?? [],
    objectives: search.objectives ?? [],
    maturity: search.maturity ?? [],
    valuePotential: search.valuePotential ?? [],
    complexity: search.complexity ?? [],
    riskLevel: search.riskLevel ?? [],
    timeToValue: search.timeToValue ?? [],
    sort: mapSort(sort),
    limit: 120,
  }), [search, effectiveIndustries, sort]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["use-cases", "explore", queryInput],
    queryFn: () => listUseCases({ data: queryInput }),
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000,
  });

  const cases = data?.cases ?? [];
  const sorted = useMemo(() => {
    // Client-side sort fallback for sort keys not natively supported by the server fn.
    const rank: Record<string, number> = { Low: 1, Short: 1, Medium: 2, High: 3, Critical: 4, Long: 3 };
    const arr = [...cases];
    if (sort === "complexity") arr.sort((a, b) => (rank[a.complexity ?? ""] ?? 99) - (rank[b.complexity ?? ""] ?? 99));
    else if (sort === "risk") arr.sort((a, b) => (rank[a.risk_level ?? ""] ?? 99) - (rank[b.risk_level ?? ""] ?? 99));
    else if (sort === "ttv") arr.sort((a, b) => (rank[a.time_to_value ?? ""] ?? 99) - (rank[b.time_to_value ?? ""] ?? 99));
    if (governanceFirst) arr.sort((a, b) => (rank[b.risk_level ?? ""] ?? 0) - (rank[a.risk_level ?? ""] ?? 0));
    return arr;
  }, [cases, sort, governanceFirst]);

  const toggleRisk = (slug: string) => {
    const cur: string[] = search.riskLevel ?? [];
    const next = cur.includes(slug) ? cur.filter((x: string) => x !== slug) : [...cur, slug];
    update({ riskLevel: next });
    track("filter_used", { facet: "riskLevel", value: slug });
  };

  type ChipKey = keyof FacetState;
  const chips: { key: ChipKey; value: string; label: string }[] = [];
  const facetKeys: ChipKey[] = ["industries","capabilities","businessFunctions","objectives","maturity","valuePotential","complexity","riskLevel","timeToValue"];
  const labelMaps: Partial<Record<ChipKey, Record<string, string>>> = {
    industries: Object.fromEntries(tax.industries.map((i) => [i.slug, i.name])),
    capabilities: Object.fromEntries(tax.capabilities.map((i) => [i.slug, i.name])),
    businessFunctions: Object.fromEntries(tax.businessFunctions.map((i) => [i.slug, i.name])),
    objectives: Object.fromEntries(tax.objectives.map((i) => [i.slug, i.name])),
  };
  for (const k of facetKeys) {
    const vals = k === "industries" ? effectiveIndustries : ((search as Record<string, string[] | undefined>)[k] ?? []);
    for (const v of vals) chips.push({ key: k, value: v, label: labelMaps[k]?.[v] ?? v });
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
      sectors: undefined, tags: undefined,
    });
    track("filter_used", { action: "clear_all" });
  };

  const handleFilterChange = (patch: Partial<Search>) => {
    update(patch);
    Object.entries(patch).forEach(([facet, value]) => track("filter_used", { facet, value }));
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q || undefined });
    if (q) track("search_used", { q });
  };

  const openCustomRequest = () => {
    track("custom_use_case_requested", { q: search.q });
    setLeadOpen(true);
  };

  return (
    <>
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore <span className="text-primary">AI Use Cases</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Search, filter and compare AI, GenAI, Agentic AI and automation use cases across 18+ industries.
          </p>
          <Can action="repo.create">
            <div className="mt-4">
              <Link
                to="/administration"
                className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20"
              >
                + Submit new use case
              </Link>
            </div>
          </Can>
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

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <SampleDataDisclaimer className="mb-6" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-32">
              <UseCaseFilters
                tax={tax}
                value={{ ...search, industries: effectiveIndustries } as Partial<FacetState>}
                onChange={(p) => handleFilterChange(p as Partial<Search>)}
                onClear={clearAll}
                activeCount={activeCount}
              />
            </div>
          </aside>

          <div className="flex-1">
            <PresetBar currentSearch={search as Record<string, unknown>} />
            <RiskClassBar
              selected={search.riskLevel ?? []}
              onToggle={toggleRisk}
              governanceFirst={governanceFirst}
              onGovernanceFirst={(v) => update({ gov: v || undefined })}
            />
            <OutcomesFilterBar
              value={{
                valuePotential: search.valuePotential ?? [],
                complexity: search.complexity ?? [],
                timeToValue: search.timeToValue ?? [],
              }}
              onToggle={(key, slug) => {
                const cur = (search[key] as string[] | undefined) ?? [];
                const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug];
                update({ [key]: next } as Partial<Search>);
                track("filter_used", { facet: key, value: slug });
              }}
            />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-base font-bold text-foreground">{sorted.length}</span> use case{sorted.length === 1 ? "" : "s"}
                {(search.q ?? "").trim() && <> for <span className="font-semibold text-foreground">"{search.q}"</span></>}
                {isFetching && !isLoading && <span className="ml-2 text-xs text-muted-foreground/70">updating…</span>}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sort</label>
                <select
                  value={sort}
                  onChange={(e) => update({ sort: e.target.value as SortKey })}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <option key={k} value={k}>{SORT_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

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
                <button onClick={clearAll} className="ml-1 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">
                  Clear all
                </button>
              </div>
            )}

            {isLoading ? (
              <CardSkeleton count={6} />
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
      <CompareTray />
      <AddToStudioBoardDialog
        open={!!boardPattern}
        onOpenChange={(o) => { if (!o) setBoardPattern(null); }}
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
