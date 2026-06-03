import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { MOCK_USE_CASES, assertMockReady, type MockUseCase } from "@/lib/usecasex.mock";
import { compareStore } from "@/lib/usecasex.compare.store";
import { MissingDataFallback } from "@/components/MissingDataFallback";

const searchSchema = z.object({
  ids: z.string().optional(),
});

export const Route = createFileRoute("/_app/compare")({
  head: () => ({
    meta: [
      { title: "Compare AI Use Cases — UseCasesX™" },
      { name: "description", content: "Side-by-side comparison of selected AI use cases across maturity, impact, risk, and implementation steps." },
    ],
  }),
  validateSearch: searchSchema,
  component: ComparePage,
  errorComponent: ({ error }) => (
    <MissingDataFallback title="Compare view failed to load" reason={error.message} />
  ),
  notFoundComponent: () => <MissingDataFallback title="Nothing to compare" />,
});

function ComparePage() {
  const search = Route.useSearch() as { ids?: string };
  const ready = assertMockReady();
  if (!ready.ok) {
    return <MissingDataFallback reason={ready.reason} />;
  }

  const slugs: string[] = (search.ids ?? "").split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, compareStore.MAX);
  const items: MockUseCase[] = slugs
    .map((s: string) => MOCK_USE_CASES.find((u: MockUseCase) => u.slug === s))
    .filter((x): x is MockUseCase => Boolean(x));

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-foreground">Nothing to compare yet</h1>
        <p className="mt-3 text-muted-foreground">
          Open the Explore page or any use case detail and click <strong>Add to compare</strong> to start.
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

  const rows: { label: string; render: (c: MockUseCase) => React.ReactNode; diff?: boolean }[] = [
    { label: "Industry", render: (c) => c.industry.name, diff: true },
    { label: "Sector", render: (c) => c.sector === "public" ? "Public" : c.sector === "both" ? "Cross-sector" : "Private", diff: true },
    { label: "Business function", render: (c) => c.businessFunction, diff: true },
    { label: "AI type", render: (c) => c.aiType, diff: true },
    { label: "Objective", render: (c) => c.objective, diff: true },
    { label: "Value potential", render: (c) => c.valuePotential, diff: true },
    { label: "Complexity", render: (c) => c.complexity, diff: true },
    { label: "Risk level", render: (c) => c.riskLevel, diff: true },
    { label: "Maturity", render: (c) => c.maturity, diff: true },
    { label: "Time to value", render: (c) => c.timeToValue, diff: true },
    {
      label: "Tags",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">#{t}</span>
          ))}
        </div>
      ),
    },
    {
      label: "Recommended platforms",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.platforms.map((p) => (
            <span key={p.slug} className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-foreground">
              {p.name}
            </span>
          ))}
        </div>
      ),
    },
  ];

  const stepsFor = (c: MockUseCase): string[] => [
    `Frame the ${c.businessFunction.toLowerCase()} problem and pick 1–2 ${c.objective.toLowerCase()} KPIs.`,
    `Assess data readiness for ${c.aiType.toLowerCase()} (volume, quality, governance).`,
    c.riskLevel === "Critical" || c.riskLevel === "High"
      ? "Run a CyberX C3G governance + AssureX validation review before any prototype goes live."
      : "Capture a lightweight risk note and assign an accountable owner.",
    c.maturity === "Beginner"
      ? "Build a contained proof-of-value (4–6 weeks) with measurable success criteria."
      : c.maturity === "Intermediate"
      ? "Run a controlled pilot in one team or region with full monitoring."
      : "Scale across teams; productionize with drift monitoring and re-validation cadence.",
    c.timeToValue === "Short"
      ? "Target first value in <90 days; instrument from day one."
      : c.timeToValue === "Medium"
      ? "Plan for 3–6 months to first measurable value."
      : "Plan a 6–12 month roadmap; sequence value milestones every quarter.",
    "Route the use case through the AIgilityX execution path: SARPI → CyberX → AdvisorX → FlowX → PrivacyX → AssureX.",
  ];

  // Highlight rows where values differ.
  const diffSet = new Set(
    rows
      .filter((r) => r.diff)
      .filter((r) => {
        const vals = items.map((c) => String(r.render(c)));
        return new Set(vals).size > 1;
      })
      .map((r) => r.label),
  );

  return (
    <article className="bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <Link to="/repository" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">
            ← Back to Explore
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Compare AI Use Cases
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Side-by-side view of {items.length} use case{items.length === 1 ? "" : "s"}. Differences are highlighted.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-card/60">
                <th className="w-48 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attribute</th>
                {items.map((c) => (
                  <th key={c.slug} className="px-4 py-4 text-left align-top">
                    <Link
                      to="/use-cases/$slug"
                      params={{ slug: c.slug }}
                      className="block text-base font-bold text-foreground hover:text-primary"
                    >
                      {c.title}
                    </Link>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {c.industry.name}
                    </div>
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
                  Recommended steps
                </td>
                {items.map((c) => (
                  <td key={c.slug} className="px-4 py-4 align-top">
                    <ol className="space-y-2">
                      {stepsFor(c).map((s, i) => (
                        <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
}
