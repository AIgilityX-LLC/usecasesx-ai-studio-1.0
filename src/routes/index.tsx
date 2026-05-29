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
      { title: "AI Use Case Repository — AigilityX Hub" },
      {
        name: "description",
        content:
          "Browse validated AI deployments across government, healthcare, finance, energy and more. Filter by industry, capability, and maturity.",
      },
      { property: "og:title", content: "AI Use Case Repository — AigilityX Hub" },
      {
        property: "og:description",
        content:
          "Validated AI deployments across sectors. Filter by industry, capability, and maturity.",
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

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 flex flex-col gap-6">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Institutional Intelligence
            <br />
            <span className="text-muted-foreground">Global AI Deployment Index</span>
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSearch({ q: qLocal || undefined });
            }}
            className="relative flex max-w-3xl items-center"
          >
            <div className="pointer-events-none absolute left-4 h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
            <input
              type="text"
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Search by capability, sector, organization, or keyword..."
              className="w-full rounded-2xl border border-foreground/10 bg-white py-5 pl-12 pr-32 text-lg shadow-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:bg-primary"
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row">
          <aside className="w-full shrink-0 space-y-8 lg:w-64">
            <FacetGroup
              title="Industry"
              options={tax.industries}
              selected={search.industries ?? []}
              onToggle={(v) => toggleFacet("industries", v)}
            />
            <FacetGroup
              title="Capability"
              options={tax.capabilities}
              selected={search.capabilities ?? []}
              onToggle={(v) => toggleFacet("capabilities", v)}
            />
            <FacetGroup
              title="Government Function"
              options={tax.govFunctions}
              selected={search.govFunctions ?? []}
              onToggle={(v) => toggleFacet("govFunctions", v)}
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
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6">
              <p className="mb-4 text-sm font-medium">Have an AI use case to contribute?</p>
              <Link
                to="/submit"
                className="block w-full rounded-lg bg-white py-2 text-center text-xs font-bold text-primary shadow-sm ring-1 ring-primary/20"
              >
                SUBMIT TO REPOSITORY
              </Link>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-bold text-foreground">{result.total}</span>{" "}
                proven AI use cases
              </p>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter">
                <span>Sort by:</span>
                <select
                  value={search.sort ?? "recent"}
                  onChange={(e) =>
                    updateSearch({ sort: e.target.value as "recent" | "impact" | "maturity" })
                  }
                  className="bg-transparent font-bold text-primary focus:outline-none"
                >
                  <option value="recent">Most Recent</option>
                  <option value="impact">Highest Impact</option>
                  <option value="maturity">Highest Maturity</option>
                </select>
              </div>
            </div>

            {result.cases.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-foreground/10 bg-white p-12 text-center">
                <p className="text-foreground">No use cases match these filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try clearing facets or broadening your search.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
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
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {options.map((o) => (
          <label key={o.slug} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(o.slug)}
              onChange={() => onToggle(o.slug)}
              className="rounded border-foreground/20 text-primary focus:ring-primary"
            />
            <span>{o.name}</span>
          </label>
        ))}
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
        .slice(0, 3)
        .join("")
        .toUpperCase(),
    [c.organization, c.title],
  );

  const tags = [
    ...(c.use_case_capabilities ?? []).map((x) => x.ai_capabilities?.name).filter(Boolean),
    ...(c.use_case_industries ?? []).map((x) => x.industries?.name).filter(Boolean),
  ].slice(0, 3);

  const maturityLabel = c.maturity
    ? c.maturity.charAt(0).toUpperCase() + c.maturity.slice(1)
    : "—";

  return (
    <Link
      to="/cases/$slug"
      params={{ slug: c.slug }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-foreground/5 bg-white p-6 transition-all hover:shadow-xl hover:shadow-foreground/5"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary">
          <span className="text-xs font-bold text-foreground">{initials}</span>
        </div>
        <span
          className={
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
            (c.maturity === "scaled" || c.maturity === "production"
              ? "bg-accent/10 text-accent"
              : "bg-amber-500/10 text-amber-600")
          }
        >
          {maturityLabel}
        </span>
      </div>
      <h3 className="mb-2 text-xl font-bold leading-tight group-hover:text-primary">
        {c.title}
      </h3>
      {c.organization ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {c.organization}
        </p>
      ) : null}
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground line-clamp-3">
        {c.summary}
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
