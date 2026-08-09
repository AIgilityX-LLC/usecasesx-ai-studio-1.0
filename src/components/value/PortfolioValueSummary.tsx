/**
 * Aggregated value across a set of portfolio entries.
 *
 * Benefits are stored against the Studio use case, so only entries with a
 * Studio draft contribute. The component says so explicitly rather than
 * implying the total covers the whole portfolio.
 */

import { ValueSummary } from "@/components/value/ValueSummary";
import { useBenefitsForUseCases } from "@/hooks/useBenefits";

export function PortfolioValueSummary({
  studioUseCaseIds,
  title = "Portfolio value",
  description,
}: {
  studioUseCaseIds: (string | undefined)[];
  title?: string;
  description?: string;
}) {
  const ids = studioUseCaseIds.filter((id): id is string => Boolean(id));
  const { aggregate, isLoading } = useBenefitsForUseCases(ids);

  return (
    <ValueSummary
      aggregate={aggregate}
      loading={isLoading}
      title={title}
      description={
        description ??
        "Benefits recorded in Studio for the use cases in view. Only matching units, currencies and periods are combined."
      }
      emptyHint={
        ids.length === 0
          ? "No use case in this view has a Studio draft with benefits yet."
          : "No benefits recorded for these use cases yet."
      }
    />
  );
}
