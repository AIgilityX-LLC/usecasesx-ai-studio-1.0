/**
 * Priority score display primitives.
 *
 * One place decides how a score is rendered so the number means the same thing
 * on a board, in a portfolio and on the use case itself. An unscored use case
 * is shown as unscored — never as zero.
 */

import { AlertTriangle, Minus } from "lucide-react";

import { StatusChip, type StatusTone } from "@/components/ui-kit";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PriorityScoreValue = {
  riskAdjusted: number | null;
  completeness: number;
  confidence: string | null;
  recommendation: string | null;
  scoredAt?: string | null;
  incomplete?: boolean;
};

const BAND_TONE: Record<string, StatusTone> = {
  pursue: "success",
  shortlist: "accent",
  refine: "warning",
  hold: "danger",
};

const BAND_LABEL: Record<string, string> = {
  pursue: "Pursue",
  shortlist: "Shortlist",
  refine: "Refine",
  hold: "Hold",
};

export function bandTone(recommendation: string | null): StatusTone {
  return (recommendation && BAND_TONE[recommendation]) || "neutral";
}

export function bandLabel(recommendation: string | null): string {
  return (recommendation && BAND_LABEL[recommendation]) || "Unbanded";
}

/**
 * Compact inline score for lists and cards.
 */
export function PriorityScore({
  score,
  className,
  showBand = true,
}: {
  score: PriorityScoreValue | null | undefined;
  className?: string;
  showBand?: boolean;
}) {
  if (!score || score.riskAdjusted === null) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}
      >
        <Minus className="h-3 w-3" aria-hidden />
        Not scored
      </span>
    );
  }

  const percent = Math.round(score.completeness * 100);
  const detail = [
    `Risk-adjusted priority ${score.riskAdjusted} of 100`,
    `${percent}% of criteria answered`,
    score.confidence ? `${score.confidence} confidence` : null,
    score.scoredAt ? `scored ${new Date(score.scoredAt).toLocaleDateString()}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1.5", className)}>
            <StatusChip tone={bandTone(score.recommendation)}>
              <span className="tabular-nums font-semibold">{score.riskAdjusted}</span>
              <span className="opacity-70">/100</span>
            </StatusChip>
            {showBand && (
              <span className="text-xs text-muted-foreground">
                {bandLabel(score.recommendation)}
              </span>
            )}
            {score.incomplete && (
              <AlertTriangle
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-label="Scored on incomplete input"
              />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[16rem] text-xs">
            {detail}
            {score.incomplete ? ". Recorded below the completeness threshold." : "."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
