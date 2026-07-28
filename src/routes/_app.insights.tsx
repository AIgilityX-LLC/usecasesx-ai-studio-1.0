import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  getInsights,
  type CountItem,
  type RankItem,
  type IndustryValueCell,
} from "@/lib/insights.functions";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { PageHero } from "@/components/usecasex/PageHero";

const insightsQ = queryOptions({
  queryKey: ["insights"],
  queryFn: () => getInsights(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/_app/insights")({
  head: () => ({
    meta: [
      { title: "AI Deployment Intelligence — UseCasesX™" },
      {
        name: "description",
        content:
          "Aggregate intelligence across the AI use case corpus: top AI capabilities, business functions, industry coverage, value, complexity and risk profiles.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(insightsQ),
  component: InsightsPage,
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-12 text-center">Not found</div>,
});

const COLORS = [
  "oklch(0.62 0.17 258)",
  "oklch(0.7 0.14 215)",
  "oklch(0.68 0.15 175)",
  "oklch(0.72 0.14 145)",
];

function InsightsPage() {
  const { data } = useSuspenseQuery(insightsQ);
  const plan = usePlan();
  const canDeepDive = plan.isPro || plan.isAdmin;

  const kpis = [
    { v: data.totals.useCases.toLocaleString(), l: "Use Cases" },
    { v: data.totals.industries, l: "Industries" },
    { v: data.totals.capabilities, l: "AI Capabilities" },
    { v: data.totals.businessFunctions, l: "Business Functions" },
    { v: data.totals.objectives, l: "Objectives" },
    { v: data.recentCount, l: "Added (90 days)" },
  ];

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Deployment Intelligence"
        title={
          <>
            AI Use Case <span className="text-primary">Intelligence</span>
          </>
        }
        description="A live, data-driven view of the entire UseCasesX™ corpus — what AI is being applied, where the value concentrates, and how risk is distributed across industries."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="font-mono text-2xl font-bold text-foreground">{k.v}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {k.l}
              </div>
            </div>
          ))}
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <BarCard
            title="Top AI capability types"
            subtitle="Most-applied AI capabilities across all use cases"
            items={data.topCapabilities}
            facet="capabilities"
            color={COLORS[0]}
          />
          <BarCard
            title="Top business functions"
            subtitle="Where AI is being deployed by function"
            items={data.topBusinessFunctions}
            facet="businessFunctions"
            color={COLORS[1]}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <BarCard
            title="Coverage by industry"
            subtitle="Use case distribution across industries"
            items={data.byIndustry}
            facet="industries"
            color={COLORS[2]}
          />
          <div className="grid gap-6">
            <RankCard title="Value potential" items={data.valuePotential} tone="value" />
            <RankCard title="Complexity" items={data.complexity} tone="complexity" />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RankCard title="Risk profile" items={data.riskLevel} tone="risk" />
          <RankCard title="Time to value" items={data.timeToValue} tone="ttv" />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-foreground">Value concentration by industry</h2>
          <p className="text-sm text-muted-foreground">
            Where high-value AI opportunities cluster.
          </p>
          {canDeepDive ? (
            <ValueHeatTable rows={data.industryValue} />
          ) : (
            <div className="mt-4">
              <UpgradePrompt
                feature="Deep deployment intelligence"
                description="Unlock the value-concentration matrix and per-industry drilldowns with UseCasesX Pro™."
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BarCard({
  title,
  subtitle,
  items,
  facet,
  color,
}: {
  title: string;
  subtitle: string;
  items: CountItem[];
  facet: string;
  color: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-5 space-y-2.5">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {items.map((it) => (
          <Link
            key={it.slug}
            to="/repository"
            search={{ [facet]: [it.slug] } as never}
            className="group block"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground group-hover:text-primary">
                {it.name}
              </span>
              <span className="font-mono text-muted-foreground">{it.count}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(it.count / max) * 100}%`, background: color }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const TONE_COLORS: Record<string, Record<string, string>> = {
  value: {
    Critical: "oklch(0.6 0.18 145)",
    High: "oklch(0.66 0.16 150)",
    Medium: "oklch(0.75 0.13 95)",
    Low: "oklch(0.7 0.05 258)",
  },
  complexity: {
    Low: "oklch(0.66 0.16 150)",
    Medium: "oklch(0.75 0.13 95)",
    High: "oklch(0.62 0.2 25)",
  },
  risk: {
    Low: "oklch(0.66 0.16 150)",
    Medium: "oklch(0.75 0.13 95)",
    High: "oklch(0.65 0.19 45)",
    Critical: "oklch(0.6 0.22 25)",
  },
  ttv: { Short: "oklch(0.66 0.16 150)", Medium: "oklch(0.75 0.13 95)", Long: "oklch(0.62 0.2 25)" },
};

function RankCard({ title, items, tone }: { title: string; items: RankItem[]; tone: string }) {
  const total = Math.max(
    1,
    items.reduce((s, i) => s + i.count, 0),
  );
  const palette = TONE_COLORS[tone] ?? {};
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-secondary">
        {items.map((it) => (
          <div
            key={it.label}
            title={`${it.label}: ${it.count}`}
            style={{
              width: `${(it.count / total) * 100}%`,
              background: palette[it.label] ?? "oklch(0.62 0.17 258)",
            }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: palette[it.label] ?? "oklch(0.62 0.17 258)" }}
            />
            <span className="text-foreground">{it.label}</span>
            <span className="font-mono text-muted-foreground">{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueHeatTable({ rows }: { rows: IndustryValueCell[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">Industry</th>
            <th className="px-4 py-2.5 text-right">Total</th>
            <th className="px-4 py-2.5 text-right text-[oklch(0.55_0.18_145)]">High value</th>
            <th className="px-4 py-2.5 text-right">Medium</th>
            <th className="px-4 py-2.5 text-right">Low</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium text-foreground">
                <Link
                  to="/repository"
                  search={{ industries: [r.slug] } as never}
                  className="hover:text-primary"
                >
                  {r.industry}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right font-mono">{r.total}</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold text-[oklch(0.55_0.18_145)]">
                {r.high}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{r.medium}</td>
              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{r.low}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
