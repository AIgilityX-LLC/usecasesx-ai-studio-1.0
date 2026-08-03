/**
 * Portfolio analytics charts.
 *
 * Read-only visualisation of the currently filtered membership records. Nothing
 * here writes: the charts summarise portfolio decisions, never the source use
 * cases or their scores.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui-kit";
import {
  FUNDING_STATES,
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISIONS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  type PortfolioEntry,
} from "@/lib/portfolio-model";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    color: "var(--popover-foreground)",
    fontSize: "12px",
  },
  cursor: { fill: "var(--muted)", opacity: 0.35 },
} as const;

function ChartFrame({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3 h-56 w-full">{children}</div>
    </div>
  );
}

export function PortfolioCharts({ entries }: { entries: PortfolioEntry[] }) {
  const decisionData = useMemo(
    () =>
      PORTFOLIO_ITEM_DECISIONS.map((decision) => ({
        name: PORTFOLIO_ITEM_DECISION_LABELS[decision],
        value: entries.filter((e) => e.decision === decision).length,
      })).filter((d) => d.value > 0),
    [entries],
  );

  const fundingData = useMemo(
    () =>
      FUNDING_STATES.map((state) => ({
        name: FUNDING_STATE_LABELS[state],
        value: entries.filter((e) => e.fundingState === state).length,
      })).filter((d) => d.value > 0),
    [entries],
  );

  const periodData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.targetPeriod?.trim() || "Unscheduled";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) =>
        a.name === "Unscheduled" ? 1 : b.name === "Unscheduled" ? -1 : a.name.localeCompare(b.name),
      );
  }, [entries]);

  const valueData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.valuePotential?.trim() || "Not scored";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [entries]);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nothing to chart"
        description="No portfolio entries match the current filters."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartFrame title="Decision mix" hint="Portfolio decisions across the filtered entries.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={decisionData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} interval={0} angle={-18} textAnchor="end" height={54} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" name="Use cases" radius={[4, 4, 0, 0]}>
              {decisionData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Funding state" hint="Where the money conversation currently stands.">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={fundingData}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {fundingData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Tooltip {...tooltipStyle} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Target periods" hint="Delivery pressure by target period.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={periodData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" {...axisProps} interval={0} angle={-18} textAnchor="end" height={54} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" name="Use cases" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Value potential" hint="Source use-case value bands. Read-only.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={valueData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 24, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="name" width={90} {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" name="Use cases" fill="var(--chart-4)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
