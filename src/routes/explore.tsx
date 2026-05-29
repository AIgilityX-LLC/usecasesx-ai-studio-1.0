import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";

import { listUseCases, listTaxonomies } from "@/lib/use-cases.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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
  sort: z.enum(["recent", "impact", "maturity", "featured"]).optional(),
});

type Search = z.infer<typeof searchSchema>;

const taxonomiesQuery = queryOptions({
  queryKey: ["taxonomies"],
  queryFn: () => listTaxonomies(),
  staleTime: 5 * 60 * 1000,
});

const casesQuery = (input: Search) =>
  queryOptions({
    queryKey: ["use-cases", input],
    queryFn: () =>
      listUseCases({
        data: {
          q: input.q ?? "",
          industries: input.industries ?? [],
          capabilities: input.capabilities ?? [],
          businessFunctions: input.businessFunctions ?? [],
          objectives: input.objectives ?? [],
          maturity: input.maturity ?? [],
          valuePotential: input.valuePotential ?? [],
          complexity: input.complexity ?? [],
          riskLevel: input.riskLevel ?? [],
          timeToValue: input.timeToValue ?? [],
          sort: input.sort ?? "recent",
        },
      }),
  });

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore AI Use Cases — UseCaseX™ by AIgilityX" },
      {
        name: "description",
        content:
          "Browse 1000+ validated AI use cases. Filter by industry, business function, AI type, business objective, value, complexity, risk and time-to-value.",
      },
      { property: "og:title", content: "Explore AI Use Cases — UseCaseX™" },
      {
        property: "og:description",
        content:
          "Open registry of AI use cases — filter by industry, AI type, value, and risk to find what to automate, govern and scale next.",
      },
    ],
  }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(taxonomiesQuery),
      context.queryClient.ensureQueryData(casesQuery(deps)),
    ]),
  component: ExplorePage,
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

function ExplorePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: tax } = useSuspenseQuery(taxonomiesQuery);
  const { data: result } = useSuspenseQuery(casesQuery(search));

  const [qLocal, setQLocal] = useState(search.q ?? "");

  const updateSearch = (patch: Partial<Search>) => {
    navigate({ search: (prev: Search) => ({ ...prev, ...patch }) });
  };

  const toggleFacet = (key: keyof Search, value: string) => {
    const current = (search[key] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateSearch({ [key]: next.length ? next : undefined } as Partial<Search>);
  };

  const activeCount =
    (search.industries?.length ?? 0) +
    (search.capabilities?.length ?? 0) +
    (search.businessFunctions?.length ?? 0) +
    (search.objectives?.length ?? 0) +
    (search.maturity?.length ?? 0) +
    (search.valuePotential?.length ?? 0) +
    (search.complexity?.length ?? 0) +
    (search.riskLevel?.length ?? 0) +
    (search.timeToValue?.length ?? 0);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            UseCaseX™ · Explore
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Explore <span className="text-primary">100+ AI Use Cases</span> for your industry
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Find what to automate, govern, and scale next. Filter by industry, AI type, business
            objective, value, complexity and risk.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSearch({ q: qLocal || undefined });
            }}
            className="relative mt-6 flex max-w-3xl items-center"
          >
            <svg className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Search 'fraud detection', 'citizen services', 'document AI'…"
              className="w-full rounded-xl border border-border bg-card/60 py-3.5 pl-12 pr-32 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="submit" className="absolute right-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110">
              Search
            </button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-col gap-10 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-6 overflow-y-auto rounded-xl border border-border bg-card/40 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">Filter</h2>
                {activeCount > 0 && (
                  <button
                    onClick={() =>
                      updateSearch({
                        industries: undefined,
                        capabilities: undefined,
                        businessFunctions: undefined,
                        objectives: undefined,
                        maturity: undefined,
                        valuePotential: undefined,
                        complexity: undefined,
                        riskLevel: undefined,
                        timeToValue: undefined,
                      })
                    }
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    Clear ({activeCount})
                  </button>
                )}
              </div>
              <FacetGroup title="Industry" options={tax.industries} selected={search.industries ?? []} onToggle={(v) => toggleFacet("industries", v)} />
              <FacetGroup title="AI Type" options={tax.capabilities} selected={search.capabilities ?? []} onToggle={(v) => toggleFacet("capabilities", v)} />
              <FacetGroup title="Business Function" options={tax.businessFunctions} selected={search.businessFunctions ?? []} onToggle={(v) => toggleFacet("businessFunctions", v)} />
              <FacetGroup title="Business Objective" options={tax.objectives} selected={search.objectives ?? []} onToggle={(v) => toggleFacet("objectives", v)} />
              <FacetGroup
                title="Maturity"
                options={[
                  { slug: "concept", name: "Concept" },
                  { slug: "prototype", name: "Prototype" },
                  { slug: "pilot", name: "Pilot" },
                  { slug: "production", name: "Production" },
                  { slug: "scaled", name: "Scaled" },
                ]}
                selected={search.maturity ?? []}
                onToggle={(v) => toggleFacet("maturity", v)}
              />
              <FacetGroup
                title="Value Potential"
                options={[
                  { slug: "low", name: "Low" },
                  { slug: "medium", name: "Medium" },
                  { slug: "high", name: "High" },
                  { slug: "transformational", name: "Transformational" },
                ]}
                selected={search.valuePotential ?? []}
                onToggle={(v) => toggleFacet("valuePotential", v)}
              />
              <FacetGroup
                title="Complexity"
                options={[
                  { slug: "low", name: "Low" },
                  { slug: "medium", name: "Medium" },
                  { slug: "high", name: "High" },
                ]}
                selected={search.complexity ?? []}
                onToggle={(v) => toggleFacet("complexity", v)}
              />
              <FacetGroup
                title="Risk Level"
                options={[
                  { slug: "low", name: "Low" },
                  { slug: "medium", name: "Medium" },
                  { slug: "high", name: "High" },
                ]}
                selected={search.riskLevel ?? []}
                onToggle={(v) => toggleFacet("riskLevel", v)}
              />
              <FacetGroup
                title="Time to Value"
                options={[
                  { slug: "short", name: "< 3 months" },
                  { slug: "medium", name: "3–9 months" },
                  { slug: "long", name: "9+ months" },
                ]}
                selected={search.timeToValue ?? []}
                onToggle={(v) => toggleFacet("timeToValue", v)}
              />
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-base font-bold text-foreground">
                  {result.total.toString().padStart(3, "0")}
                </span>{" "}
                use cases matched
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-[0.18em] text-muted-foreground">Sort</span>
                <select
                  value={search.sort ?? "recent"}
                  onChange={(e) => updateSearch({ sort: e.target.value as Search["sort"] })}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="recent">Most Recent</option>
                  <option value="impact">Highest Impact</option>
                  <option value="maturity">Highest Maturity</option>
                  <option value="featured">Featured</option>
                </select>
              </div>
            </div>

            {result.cases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-16 text-center">
                <p className="text-foreground">No use cases match these filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">Try clearing facets or broadening your search.</p>
              </div>
            ) : (
              <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
                {result.cases.map((c) => (
                  <CaseCard key={c.id} c={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<{ slug: string; name: string }>;
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
      <div className="space-y-1">
        {options.map((o) => {
          const active = selected.includes(o.slug);
          return (
            <button
              key={o.slug}
              onClick={() => onToggle(o.slug)}
              className={
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
                (active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-card hover:text-foreground")
              }
            >
              <span className={"grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " + (active ? "border-primary bg-primary" : "border-border")}>
                {active && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-primary-foreground">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </span>
              <span className="flex-1">{o.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type CardCase = Awaited<ReturnType<typeof listUseCases>>["cases"][number];

function CaseCard({ c }: { c: CardCase }) {
  const initials = useMemo(
    () =>
      ((c.organization ?? c.title) as string)
        .split(/\s+/)
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [c.organization, c.title],
  );

  const capabilities = ((c.use_case_capabilities ?? []) as Array<{ ai_capabilities?: { name?: string } }>)
    .map((x) => x.ai_capabilities?.name)
    .filter(Boolean) as string[];
  const industries = ((c.use_case_industries ?? []) as Array<{ industries?: { name?: string } }>)
    .map((x) => x.industries?.name)
    .filter(Boolean) as string[];

  const maturityLabel = c.maturity ? c.maturity.charAt(0).toUpperCase() + c.maturity.slice(1) : "—";
  const isLive = c.maturity === "scaled" || c.maturity === "production";

  return (
    <Link to="/cases/$slug" params={{ slug: c.slug }} className="group relative flex flex-col bg-card p-6 transition-colors hover:bg-secondary">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30 font-mono text-[11px] font-bold text-primary">{initials}</div>
          {c.organization ? (
            <div className="leading-tight">
              <div className="text-xs font-bold text-foreground">{c.organization}</div>
              {c.region ? <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.region}</div> : null}
            </div>
          ) : null}
        </div>
        <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest " + (isLive ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-foreground/5 text-muted-foreground ring-1 ring-border")}>
          <span className={"h-1.5 w-1.5 rounded-full " + (isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/50")} />
          {maturityLabel}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{c.title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground line-clamp-3">{c.summary}</p>

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {[...capabilities.slice(0, 2), ...industries.slice(0, 1)].map((t) => (
            <span key={t} className="rounded border border-border bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex gap-3 text-muted-foreground">
            {c.impact_score ? <span>IMPACT <span className="text-primary">{c.impact_score}/5</span></span> : null}
            {c.maturity_score ? <span>MATURITY <span className="text-primary">{c.maturity_score}/5</span></span> : null}
          </div>
          <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">View →</span>
        </div>
      </div>
    </Link>
  );
}
