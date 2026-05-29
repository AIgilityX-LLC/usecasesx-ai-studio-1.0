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
  govFunctions: z.array(z.string()).optional(),
  businessFunctions: z.array(z.string()).optional(),
  maturity: z.array(z.string()).optional(),
  sort: z.enum(["recent", "impact", "maturity"]).optional(),
});

const taxonomiesQuery = queryOptions({
  queryKey: ["taxonomies"],
  queryFn: () => listTaxonomies(),
  staleTime: 5 * 60 * 1000,
});

const casesQuery = (input: z.infer<typeof searchSchema>) =>
  queryOptions({
    queryKey: ["use-cases", input],
    queryFn: () =>
      listUseCases({
        data: {
          q: input.q ?? "",
          industries: input.industries ?? [],
          capabilities: input.capabilities ?? [],
          govFunctions: input.govFunctions ?? [],
          businessFunctions: input.businessFunctions ?? [],
          maturity: input.maturity ?? [],
          sort: input.sort ?? "recent",
        },
      }),
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Use Case Library — AIgilityX Sovereign Hub" },
      {
        name: "description",
        content:
          "Explore validated AI deployments across government, telecom, healthcare, finance and energy. Filter by industry, capability, country and maturity.",
      },
      { property: "og:title", content: "AI Use Case Library — AIgilityX Sovereign Hub" },
      {
        property: "og:description",
        content:
          "The world's open registry of governed AI in production. Filter by industry, capability, and maturity.",
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
});

function ExplorePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: tax } = useSuspenseQuery(taxonomiesQuery);
  const { data: result } = useSuspenseQuery(casesQuery(search));

  const [qLocal, setQLocal] = useState(search.q ?? "");

  const updateSearch = (patch: Partial<z.infer<typeof searchSchema>>) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, ...patch }) });
  };

  const toggleFacet = (key: keyof z.infer<typeof searchSchema>, value: string) => {
    const current = (search[key] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateSearch({ [key]: next.length ? next : undefined } as Partial<z.infer<typeof searchSchema>>);
  };

  const activeCount =
    (search.industries?.length ?? 0) +
    (search.capabilities?.length ?? 0) +
    (search.govFunctions?.length ?? 0) +
    (search.businessFunctions?.length ?? 0) +
    (search.maturity?.length ?? 0);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />

      {/* Hero — sovereign register */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.82 0.13 210 / 0.6) 1px, transparent 1px), linear-gradient(90deg, oklch(0.82 0.13 210 / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.82 0.13 210 / 0.5), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-[1400px] px-6 pb-16 pt-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Sovereign AI · Use Case Repository
          </div>
          <h1 className="max-w-4xl text-[44px] font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Explore <span className="text-primary">AI in production</span>
            <br />
            across governments, telcos & enterprises.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A curated, contributor-driven registry of validated deployments — with maturity scores,
            measurable outcomes, and evidence on every case.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSearch({ q: qLocal || undefined });
            }}
            className="relative mt-10 flex max-w-3xl items-center"
          >
            <svg
              className="pointer-events-none absolute left-5 h-5 w-5 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Search 'fraud detection', 'citizen services', 'document AI'…"
              className="w-full rounded-xl border border-border bg-card/60 py-4 pl-14 pr-36 text-base text-foreground placeholder:text-muted-foreground/70 backdrop-blur focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="absolute right-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
            >
              Search
            </button>
          </form>

          {/* Stat strip */}
          <div className="mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {[
              { v: result.total.toString().padStart(3, "0"), l: "Use Cases" },
              { v: tax.industries.length.toString().padStart(2, "0"), l: "Industries" },
              { v: tax.capabilities.length.toString().padStart(2, "0"), l: "Capabilities" },
              { v: tax.businessFunctions.length.toString().padStart(2, "0"), l: "Business Fns" },
            ].map((s) => (
              <div key={s.l} className="bg-card px-5 py-4">
                <div className="font-mono text-2xl font-bold text-primary">{s.v}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Library */}
      <main className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="flex flex-col gap-10 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <div className="sticky top-20 space-y-7 rounded-xl border border-border bg-card/40 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                  Filter
                </h2>
                {activeCount > 0 && (
                  <button
                    onClick={() =>
                      updateSearch({
                        industries: undefined,
                        capabilities: undefined,
                        businessFunctions: undefined,
                        maturity: undefined,
                      })
                    }
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    Clear ({activeCount})
                  </button>
                )}
              </div>
              <FacetGroup
                title="Industry"
                options={tax.industries}
                selected={search.industries ?? []}
                onToggle={(v) => toggleFacet("industries", v)}
              />
              <FacetGroup
                title="AI Capability"
                options={tax.capabilities}
                selected={search.capabilities ?? []}
                onToggle={(v) => toggleFacet("capabilities", v)}
              />
              <FacetGroup
                title="Business Function"
                options={tax.businessFunctions}
                selected={search.businessFunctions ?? []}
                onToggle={(v) => toggleFacet("businessFunctions", v)}
              />
              <FacetGroup
                title="Business Function"
                options={tax.businessFunctions}
                selected={search.businessFunctions ?? []}
                onToggle={(v) => toggleFacet("businessFunctions", v)}
              />
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
                <span className="font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Sort
                </span>
                <select
                  value={search.sort ?? "recent"}
                  onChange={(e) =>
                    updateSearch({ sort: e.target.value as "recent" | "impact" | "maturity" })
                  }
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="recent">Most Recent</option>
                  <option value="impact">Highest Impact</option>
                  <option value="maturity">Highest Maturity</option>
                </select>
              </div>
            </div>

            {result.cases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 p-16 text-center">
                <p className="text-foreground">No use cases match these filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try clearing facets or broadening your search.
                </p>
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
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1.5">
        {options.map((o) => {
          const active = selected.includes(o.slug);
          return (
            <button
              key={o.slug}
              onClick={() => onToggle(o.slug)}
              className={
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
                (active
                  ? "bg-primary/15 text-primary"
                  : "text-foreground/80 hover:bg-card hover:text-foreground")
              }
            >
              <span
                className={
                  "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " +
                  (active ? "border-primary bg-primary" : "border-border")
                }
              >
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
      (c.organization ?? c.title)
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [c.organization, c.title],
  );

  const capabilities = (c.use_case_capabilities ?? [])
    .map((x) => x.ai_capabilities?.name)
    .filter(Boolean) as string[];
  const industries = (c.use_case_industries ?? [])
    .map((x) => x.industries?.name)
    .filter(Boolean) as string[];

  const maturityLabel = c.maturity
    ? c.maturity.charAt(0).toUpperCase() + c.maturity.slice(1)
    : "—";
  const isLive = c.maturity === "scaled" || c.maturity === "production";

  return (
    <Link
      to="/cases/$slug"
      params={{ slug: c.slug }}
      className="group relative flex flex-col bg-card p-6 transition-colors hover:bg-secondary"
    >
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30 font-mono text-[11px] font-bold text-primary">
            {initials}
          </div>
          {c.organization ? (
            <div className="leading-tight">
              <div className="text-xs font-bold text-foreground">{c.organization}</div>
              {c.region ? (
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.region}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest " +
            (isLive
              ? "bg-primary/15 text-primary ring-1 ring-primary/30"
              : "bg-foreground/5 text-muted-foreground ring-1 ring-border")
          }
        >
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/50")
            }
          />
          {maturityLabel}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
        {c.title}
      </h3>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
        {c.summary}
      </p>

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {[...capabilities.slice(0, 2), ...industries.slice(0, 1)].map((t) => (
            <span
              key={t}
              className="rounded border border-border bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex gap-3 text-muted-foreground">
            {c.impact_score ? <span>IMPACT <span className="text-primary">{c.impact_score}/5</span></span> : null}
            {c.maturity_score ? <span>MATURITY <span className="text-primary">{c.maturity_score}/5</span></span> : null}
          </div>
          <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
