import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { listUseCases, listTaxonomies } from "@/lib/use-cases.functions";
import { UseCaseFilters, type FacetState } from "@/components/UseCaseFilters";
import { UseCaseCard } from "@/components/UseCaseCard";

const searchSchema = z.object({
  q: z.string().optional(),
  industries: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  businessFunctions: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  maturity: z.array(z.string()).optional(),
  valuePotential: z.array(z.string()).optional(),
  complexity: z.array(z.string()).optional(),
  riskLevel: z.array(z.string()).optional(),
  timeToValue: z.array(z.string()).optional(),
  sort: z.enum(["recent","impact","maturity","featured"]).optional(),
});
type Search = z.infer<typeof searchSchema>;

const taxQ = queryOptions({ queryKey: ["taxonomies"], queryFn: () => listTaxonomies(), staleTime: 5*60*1000 });
const casesQ = (s: Search) => queryOptions({
  queryKey: ["use-cases", s],
  queryFn: () => listUseCases({ data: {
    q: s.q ?? "", industries: s.industries ?? [], capabilities: s.capabilities ?? [],
    businessFunctions: s.businessFunctions ?? [], objectives: s.objectives ?? [],
    maturity: s.maturity ?? [], valuePotential: s.valuePotential ?? [],
    complexity: s.complexity ?? [], riskLevel: s.riskLevel ?? [], timeToValue: s.timeToValue ?? [],
    sort: s.sort ?? "recent",
  }}),
});

export const Route = createFileRoute("/ai-hub/usecasex/explore")({
  head: () => ({
    meta: [
      { title: "Explore 1000+ AI Use Cases — UseCaseX™" },
      { name: "description", content: "Filter 1000+ validated AI use cases by industry, AI type, business objective, value, complexity and risk." },
    ],
  }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => Promise.all([
    context.queryClient.ensureQueryData(taxQ),
    context.queryClient.ensureQueryData(casesQ(deps)),
  ]),
  component: Page,
  errorComponent: ({ error }) => <div className="p-12 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function Page() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: tax } = useSuspenseQuery(taxQ);
  const { data: result } = useSuspenseQuery(casesQ(search));
  const [q, setQ] = useState(search.q ?? "");

  const update = (p: Partial<Search>) => navigate({ search: (prev: Search) => {
    const next: Partial<Search> = { ...prev, ...p };
    (Object.keys(next) as (keyof Search)[]).forEach((k) => {
      const v = next[k]; if (Array.isArray(v) && v.length === 0) (next as Record<string, unknown>)[k] = undefined;
    });
    return next as Search;
  }});

  const activeCount = ["industries","capabilities","businessFunctions","objectives","maturity","valuePotential","complexity","riskLevel","timeToValue"]
    .reduce((n, k) => n + ((search as Record<string, string[]|undefined>)[k]?.length ?? 0), 0);

  return (
    <>
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore <span className="text-primary">1000+ AI Use Cases</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Filter by industry, AI type, business objective, value, complexity and risk.</p>
          <form onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }} className="relative mt-6 flex max-w-2xl">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 'fraud detection', 'citizen services', 'document AI'…"
              className="w-full rounded-lg border border-input bg-background py-3 pl-12 pr-28 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button className="absolute right-1.5 top-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-32">
              <UseCaseFilters
                tax={tax}
                value={search as Partial<FacetState>}
                onChange={(p) => update(p as Partial<Search>)}
                onClear={() => update({ industries: undefined, capabilities: undefined, businessFunctions: undefined, objectives: undefined, maturity: undefined, valuePotential: undefined, complexity: undefined, riskLevel: undefined, timeToValue: undefined })}
                activeCount={activeCount}
              />
            </div>
          </aside>
          <div className="flex-1">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <p className="text-sm text-muted-foreground"><span className="font-mono text-base font-bold text-foreground">{result.total}</span> use cases</p>
              <select value={search.sort ?? "recent"} onChange={(e) => update({ sort: e.target.value as Search["sort"] })}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="recent">Most Recent</option>
                <option value="impact">Highest Impact</option>
                <option value="maturity">Highest Maturity</option>
                <option value="featured">Featured</option>
              </select>
            </div>
            {result.cases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-12 text-center">
                <p className="text-foreground">No use cases match these filters.</p>
                <p className="mt-1 text-sm text-muted-foreground">Try clearing facets or broadening your search.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.cases.map((c) => <UseCaseCard key={c.id} c={c} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
