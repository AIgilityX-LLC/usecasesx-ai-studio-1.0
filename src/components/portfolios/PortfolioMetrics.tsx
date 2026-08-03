/**
 * Executive summary strip for one portfolio.
 *
 * Reads only the membership records already loaded with the portfolio — no
 * extra queries, no derived "metrics" that imply data we do not hold.
 */

import { useMemo } from "react";

import {
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISIONS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  type FundingState,
  type PortfolioEntry,
  type PortfolioItemDecision,
} from "@/lib/portfolio-model";
import { cn } from "@/lib/utils";

const DECISION_BAR_TONE: Record<PortfolioItemDecision, string> = {
  under_review: "bg-muted-foreground/40",
  shortlisted: "bg-primary/60",
  approved: "bg-primary",
  deferred: "bg-amber-500/70",
  rejected: "bg-destructive/70",
  delivered: "bg-emerald-500/80",
};

function formatDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export function PortfolioMetrics({
  entries,
  lastReviewedAt,
}: {
  entries: PortfolioEntry[];
  lastReviewedAt?: string;
}) {
  const summary = useMemo(() => {
    const byDecision = new Map<PortfolioItemDecision, number>();
    const byFunding = new Map<FundingState, number>();
    let ranked = 0;
    let withTargetPeriod = 0;
    for (const entry of entries) {
      byDecision.set(entry.decision, (byDecision.get(entry.decision) ?? 0) + 1);
      byFunding.set(entry.fundingState, (byFunding.get(entry.fundingState) ?? 0) + 1);
      if (entry.rank !== null && entry.rank !== undefined) ranked += 1;
      if (entry.targetPeriod) withTargetPeriod += 1;
    }
    return { byDecision, byFunding, ranked, withTargetPeriod, total: entries.length };
  }, [entries]);

  if (summary.total === 0) return null;

  const reviewed = formatDate(lastReviewedAt);
  const funded = summary.byFunding.get("funded") ?? 0;

  const tiles = [
    { label: "Use cases", value: String(summary.total) },
    { label: "Approved", value: String(summary.byDecision.get("approved") ?? 0) },
    { label: "Funded", value: String(funded) },
    { label: "Ranked", value: `${summary.ranked}/${summary.total}` },
    { label: "With target period", value: `${summary.withTargetPeriod}/${summary.total}` },
    { label: "Last reviewed", value: reviewed ?? "Not yet" },
  ];

  return (
    <section aria-label="Portfolio summary" className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {tile.label}
            </dt>
            <dd className="mt-1 truncate text-lg font-semibold text-foreground">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary"
          role="img"
          aria-label="Decision mix across this portfolio"
        >
          {PORTFOLIO_ITEM_DECISIONS.map((decision) => {
            const count = summary.byDecision.get(decision) ?? 0;
            if (count === 0) return null;
            return (
              <span
                key={decision}
                className={cn("h-full", DECISION_BAR_TONE[decision])}
                style={{ width: `${(count / summary.total) * 100}%` }}
              />
            );
          })}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {PORTFOLIO_ITEM_DECISIONS.map((decision) => {
            const count = summary.byDecision.get(decision) ?? 0;
            if (count === 0) return null;
            return (
              <li
                key={decision}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn("h-2 w-2 rounded-full", DECISION_BAR_TONE[decision])}
                />
                {PORTFOLIO_ITEM_DECISION_LABELS[decision]} ({count})
              </li>
            );
          })}
        </ul>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {[...summary.byFunding.entries()].map(([state, count]) => (
          <li key={state} className="text-xs text-muted-foreground">
            {FUNDING_STATE_LABELS[state]}: <span className="text-foreground">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
