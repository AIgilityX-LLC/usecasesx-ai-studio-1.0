/**
 * Side-by-side comparison of two recorded scoring results.
 *
 * Presentational only — every number comes from `compareResults`, which is the
 * same pure module the tests cover. Nothing here recalculates a score.
 */

import { useMemo } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui-kit";
import { compareResults, type Direction } from "@/lib/scoring/compare";
import type { ScoreResult } from "@/lib/scoring/model";
import { cn } from "@/lib/utils";

export type ComparableResult = {
  id: string;
  label: string;
  result: ScoreResult;
};

function DeltaBadge({
  delta,
  direction,
  suffix = "",
  invert = false,
}: {
  delta: number | null;
  direction: Direction;
  suffix?: string;
  invert?: boolean;
}) {
  if (delta === null) {
    return <StatusChip tone="neutral">not comparable</StatusChip>;
  }
  if (direction === "flat") {
    return <StatusChip tone="neutral">no change</StatusChip>;
  }
  const good = invert ? direction === "down" : direction === "up";
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <StatusChip tone={good ? "success" : "danger"}>
      <Icon className="h-3 w-3" aria-hidden />
      {delta > 0 ? "+" : ""}
      {delta}
      {suffix}
    </StatusChip>
  );
}

function HeadlineRow({
  label,
  from,
  to,
  delta,
  direction,
  suffix = "",
}: {
  label: string;
  from: number | null;
  to: number | null;
  delta: number | null;
  direction: Direction;
  suffix?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-2 text-sm tabular-nums">
        <span className="text-muted-foreground">
          {from ?? "—"}
          {suffix}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="font-semibold">
          {to ?? "—"}
          {suffix}
        </span>
        <DeltaBadge delta={delta} direction={direction} suffix={suffix} />
      </span>
    </div>
  );
}

export function ScoreCompare({ from, to }: { from: ComparableResult; to: ComparableResult }) {
  const diff = useMemo(() => compareResults(from.result, to.result), [from.result, to.result]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Compare results</CardTitle>
        <p className="text-xs text-muted-foreground">
          {from.label} <span aria-hidden>→</span> {to.label}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!diff.sameDefinition && (
          <p className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            These results were produced by different scorecard versions ({
              diff.fromVersionLabel
            } → {diff.toVersionLabel}). Treat the movement as indicative, not like-for-like.
          </p>
        )}

        <div className="space-y-2">
          <HeadlineRow
            label="Risk-adjusted priority"
            from={diff.riskAdjusted.from}
            to={diff.riskAdjusted.to}
            delta={diff.riskAdjusted.delta}
            direction={diff.riskAdjusted.direction}
          />
          <HeadlineRow
            label="Composite score"
            from={diff.composite.from}
            to={diff.composite.to}
            delta={diff.composite.delta}
            direction={diff.composite.direction}
          />
          <HeadlineRow
            label="Completeness"
            from={Math.round(diff.completeness.from * 100)}
            to={Math.round(diff.completeness.to * 100)}
            delta={Math.round(diff.completeness.delta * 100)}
            direction={diff.completeness.direction}
            suffix="%"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">What moved the score</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {diff.drivers.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">By dimension</p>
          <ul className="space-y-1.5">
            {diff.dimensions.map((d) => (
              <li
                key={d.dimensionId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className={cn(d.onlyIn && "text-muted-foreground")}>
                  {d.label}
                  {d.onlyIn === "to" && " (new)"}
                  {d.onlyIn === "from" && " (removed)"}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">{d.from ?? "—"}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                  <span>{d.to ?? "—"}</span>
                  <DeltaBadge delta={d.delta} direction={d.direction} invert={d.isRiskDimension} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Changed answers{" "}
            <span className="font-normal text-muted-foreground">
              ({diff.changedCriteria.length})
            </span>
          </p>
          {diff.changedCriteria.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every criterion was answered the same way in both results.
            </p>
          ) : (
            <ul className="space-y-2">
              {diff.changedCriteria.map((c) => (
                <li key={c.criterionId} className="rounded-md border border-border px-3 py-2">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.dimensionLabel}</p>
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">{c.fromAnswer ?? "Unanswered"}</span>
                    <span aria-hidden> → </span>
                    <span className="font-medium">{c.toAnswer ?? "Unanswered"}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
