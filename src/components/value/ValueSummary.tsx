/**
 * Value summary — the shared read-only view of aggregated benefits.
 *
 * Used by the Studio value tab, the portfolio, the roadmap and reports so the
 * same aggregation rules and the same honesty about incompatible units appear
 * everywhere. Never combines units, currencies or periods that differ.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, TriangleAlert } from "lucide-react";
import {
  describeGroup,
  formatBenefitAmount,
  type ValueAggregate,
} from "@/lib/value/benefits.model";

export function ValueSummary({
  aggregate,
  loading = false,
  title = "Value summary",
  description,
  emptyHint = "No benefits recorded yet.",
  compact = false,
}: {
  aggregate: ValueAggregate;
  loading?: boolean;
  title?: string;
  description?: string;
  emptyHint?: string;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-56" />
        </CardContent>
      </Card>
    );
  }

  const hasContent = aggregate.groups.length > 0 || aggregate.exclusions.length > 0;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <>
            {aggregate.mixed && (
              <p className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Benefits use more than one unit or currency, so they are reported side by side
                rather than as one number.
              </p>
            )}

            <ul className="space-y-2">
              {aggregate.groups.map((group) => (
                <li key={group.key} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold tabular-nums">
                      {formatBenefitAmount(group.expectedTotal, group.unitType, group.currency)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {describeGroup(group)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.count} benefit{group.count === 1 ? "" : "s"} ·{" "}
                    {group.evidencedTotal > 0
                      ? `${formatBenefitAmount(group.evidencedTotal, group.unitType, group.currency)} verified or sustained`
                      : "none verified yet"}
                  </p>
                </li>
              ))}
            </ul>

            {!compact && aggregate.ownersMissing > 0 && (
              <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {aggregate.ownersMissing} benefit{aggregate.ownersMissing === 1 ? "" : "s"} have no
                named owner.
              </p>
            )}

            {aggregate.exclusions.length > 0 && (
              <>
                <Separator />
                <ul className="space-y-1">
                  {aggregate.exclusions.map((exclusion) => (
                    <li key={exclusion.reason} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {exclusion.benefits.length} excluded:
                      </span>{" "}
                      {exclusion.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
