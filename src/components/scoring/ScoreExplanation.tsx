/**
 * Score explanation panel.
 *
 * Shows every step of the calculation: dimension scores, weights, per-criterion
 * contributions, completeness and how the recommendation band was reached.
 * Nothing here computes anything — it renders the engine's output verbatim.
 */

import { Fragment } from "react";
import { AlertTriangle, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusChip, type StatusTone } from "@/components/ui-kit";
import type { ScoreResult } from "@/lib/scoring/model";

const BAND_TONE: Record<string, StatusTone> = {
  positive: "success",
  caution: "accent",
  warning: "warning",
  negative: "danger",
};

const CONFIDENCE_TONE: Record<string, StatusTone> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

function Metric({
  label,
  value,
  suffix = "/100",
  hint,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {value === null ? "—" : value}
        {value !== null && <span className="text-base text-muted-foreground">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ScoreExplanation({ result }: { result: ScoreResult }) {
  const band = result.recommendation;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Composite priority" value={result.composite} />
        <Metric
          label="Risk-adjusted"
          value={result.riskAdjusted}
          hint="Composite after the residual-risk adjustment."
        />
        <Metric
          label="Completeness"
          value={Math.round(result.completeness * 100)}
          suffix="%"
          hint={`${result.confidence} confidence`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {band && (
          <StatusChip tone={BAND_TONE[band.tone] ?? "neutral"}>{band.label}</StatusChip>
        )}
        <StatusChip tone={CONFIDENCE_TONE[result.confidence] ?? "neutral"}>
          {result.confidence} confidence
        </StatusChip>
        <span className="text-sm text-muted-foreground">
          {result.scorecardSlug} · v{result.scorecardVersion}
        </span>
      </div>

      {band && <p className="text-sm text-muted-foreground">{band.guidance}</p>}

      {result.incomplete && (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Incomplete input — treat this score as indicative.</p>
            <p className="mt-1">
              {result.missing.length} criteri{result.missing.length === 1 ? "on" : "a"} unanswered:{" "}
              {result.missing
                .slice(0, 6)
                .map((m) => m.label)
                .join(", ")}
              {result.missing.length > 6 ? ` and ${result.missing.length - 6} more.` : "."}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dimension contributions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.dimensions.map((dim) => (
            <div key={dim.dimensionId} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {dim.label}
                  {dim.isRiskDimension && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      drives the risk adjustment
                    </span>
                  )}
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {dim.score === null ? "not scored" : `${dim.score}/100`} ·{" "}
                  {Math.round(dim.weightShare * 100)}% weight · +{dim.contribution} pts
                </p>
              </div>
              <Progress value={dim.score ?? 0} aria-label={`${dim.label} score`} />
              <p className="text-xs text-muted-foreground">{dim.explanation}</p>
              <dl className="grid gap-1 text-xs sm:grid-cols-2">
                {dim.criteria.map((crit) => (
                  <Fragment key={crit.criterionId}>
                    <div className="flex items-start justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                      <span className="text-muted-foreground">
                        {crit.label}
                        <span className="block">
                          {crit.answered ? crit.answerLabel : "Not answered"}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {crit.answered ? `+${crit.contribution}` : "—"}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" aria-hidden /> How this score was calculated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {result.calculation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
