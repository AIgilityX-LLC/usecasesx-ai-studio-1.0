import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQueries } from "@tanstack/react-query";
import { compareStore } from "@/lib/usecasex.compare.store";
import { getUseCase } from "@/lib/use-cases.functions";
import { MissingDataFallback } from "@/components/MissingDataFallback";

const searchSchema = z.object({
  ids: z.string().optional(),
});

export const Route = createFileRoute("/_app/compare")({
  head: () => ({
    meta: [
      { title: "Compare AI Use Cases — UseCasesX™" },
      { name: "description", content: "Side-by-side comparison of selected AI use cases across outcomes, risk class, and evidence." },
    ],
  }),
  validateSearch: searchSchema,
  component: ComparePage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Compare view failed to load" reason={error.message} />
  ),
  notFoundComponent: () => <MissingDataFallback title="Nothing to compare" />,
});

type Row = Record<string, any>;

function ComparePage() {
  const search = Route.useSearch() as { ids?: string };
  const slugs: string[] = (search.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, compareStore.MAX);

  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["use-case", slug],
      queryFn: () => getUseCase({ data: { slug } }),
      staleTime: 60 * 1000,
    })),
  });

  const items = results
    .map((r) => r.data as Row | undefined)
    .filter((x): x is Row => Boolean(x));
  const loading = results.some((r) => r.isLoading);

  if (slugs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-foreground">Nothing to compare yet</h1>
        <p className="mt-3 text-muted-foreground">
          Open the Explore page and click <strong>Add to compare</strong> on any use cases to start.
        </p>
        <Link
          to="/repository"
          className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          Browse use cases →
        </Link>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted-foreground">Loading comparison…</div>;
  }

  const ind = (c: Row) => c.use_case_industries?.[0]?.industries?.name ?? "—";
  const fn = (c: Row) => c.use_case_business_functions?.[0]?.business_functions?.name ?? "—";
  const ai = (c: Row) => c.use_case_capabilities?.[0]?.ai_capabilities?.name ?? "—";
  const obj = (c: Row) => c.use_case_business_objectives?.[0]?.business_objectives?.name ?? "—";

  const riskTone: Record<string, string> = {
    Low: "bg-emerald-500/10 text-emerald-600",
    Medium: "bg-amber-500/10 text-amber-600",
    High: "bg-orange-500/10 text-orange-600",
    Critical: "bg-rose-500/10 text-rose-600",
  };

  const rows: { label: string; render: (c: Row) => React.ReactNode; diff?: boolean }[] = [
    { label: "Industry", render: ind, diff: true },
    { label: "Business function", render: fn, diff: true },
    { label: "AI type", render: ai, diff: true },
    { label: "Objective", render: obj, diff: true },
    { label: "Maturity", render: (c) => c.maturity ?? "—", diff: true },
    // Structured outcomes
    { label: "Value potential", render: (c) => c.value_potential ?? "—", diff: true },
    { label: "Complexity", render: (c) => c.complexity ?? "—", diff: true },
    { label: "Time to value", render: (c) => c.time_to_value ?? "—", diff: true },
    {
      label: "Risk class",
      diff: true,
      render: (c) =>
        c.risk_level ? (
          <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + (riskTone[c.risk_level] ?? "bg-secondary text-foreground")}>
            {c.risk_level}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  const diffSet = new Set(
    rows
      .filter((r) => r.diff)
      .filter((r) => new Set(items.map((c) => String(typeof r.render(c) === "object" ? c.risk_level : r.render(c)))).size > 1)
      .map((r) => r.label),
  );

  const evidenceFor = (c: Row): { problem?: string; approach?: string; value?: string; metrics: Row[]; links: Row[] } => ({
    problem: c.business_problem ?? c.summary ?? undefined,
    approach: c.ai_solution_concept ?? undefined,
    value: c.business_value ?? undefined,
    metrics: (c.use_case_metrics ?? []) as Row[],
    links: (c.use_case_links ?? []) as Row[],
  });

  return (
    <article className="bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <Link to="/repository" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">
            ← Back to Explore
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Compare AI Use Cases</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Side-by-side view of {items.length} use case{items.length === 1 ? "" : "s"} across outcomes, risk class, and
            evidence. Differences are highlighted.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-card/60">
                <th className="w-44 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Attribute
                </th>
                {items.map((c) => (
                  <th key={c.slug} className="px-4 py-4 text-left align-top">
                    <Link to="/use-cases/$slug" params={{ slug: c.slug }} className="block text-base font-bold text-foreground hover:text-primary">
                      {c.title}
                    </Link>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">{ind(c)}</div>
                    <button
                      onClick={() => compareStore.remove(c.slug)}
                      className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className={"border-b border-border " + (diffSet.has(r.label) ? "bg-primary/[0.03]" : "")}>
                  <td className="px-4 py-3 align-top text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {r.label}
                    {diffSet.has(r.label) && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary">DIFFERS</span>
                    )}
                  </td>
                  {items.map((c) => (
                    <td key={c.slug} className="px-4 py-3 align-top text-sm text-foreground">
                      {r.render(c)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-4 py-4 align-top text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Evidence
                </td>
                {items.map((c) => {
                  const e = evidenceFor(c);
                  return (
                    <td key={c.slug} className="px-4 py-4 align-top">
                      <div className="space-y-3 text-[13px]">
                        {e.problem && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Problem</div>
                            <p className="mt-0.5 text-foreground/80">{e.problem}</p>
                          </div>
                        )}
                        {e.approach && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Approach</div>
                            <p className="mt-0.5 text-foreground/80">{e.approach}</p>
                          </div>
                        )}
                        {e.value && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outcome / value</div>
                            <p className="mt-0.5 text-foreground/80">{e.value}</p>
                          </div>
                        )}
                        {e.metrics.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Metrics</div>
                            <ul className="mt-1 space-y-0.5">
                              {e.metrics.map((m) => (
                                <li key={m.id} className="text-foreground/80">
                                  <span className="font-bold text-primary">{m.value}{m.unit ?? ""}</span> {m.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {e.links.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sources</div>
                            <ul className="mt-1 space-y-0.5">
                              {e.links.map((l) => (
                                <li key={l.id}>
                                  <a href={l.url} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">
                                    {l.label ?? l.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!e.problem && !e.approach && !e.value && e.metrics.length === 0 && e.links.length === 0 && (
                          <span className="text-muted-foreground">No structured evidence recorded.</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
