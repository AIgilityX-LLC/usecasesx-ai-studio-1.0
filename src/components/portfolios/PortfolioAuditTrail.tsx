import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import {
  listPortfolioAuditEvents,
  type PortfolioAuditEvent,
} from "@/lib/domain/portfolio-audit.repository";
import {
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  type FundingState,
  type PortfolioItemDecision,
} from "@/lib/portfolio-model";

export function usePortfolioAudit(portfolioId: string) {
  return useQuery({
    queryKey: ["portfolio", portfolioId, "audit"],
    queryFn: () => listPortfolioAuditEvents(portfolioId),
    staleTime: 15_000,
  });
}

const EVENT_LABELS: Record<string, string> = {
  "portfolio_item.added": "Use case added",
  "portfolio_item.updated": "Decision updated",
  "portfolio_item.removed": "Use case removed",
  "entity.created": "Portfolio created",
  "entity.updated": "Portfolio updated",
  "entity.archived": "Portfolio archived",
  "entity.deleted": "Portfolio deleted",
  "export.generated": "Export generated",
};

function label(event: string) {
  return EVENT_LABELS[event] ?? event.replace(/[._]/g, " ");
}

function decisionText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return (
    PORTFOLIO_ITEM_DECISION_LABELS[value as PortfolioItemDecision] ??
    FUNDING_STATE_LABELS[value as FundingState] ??
    value
  );
}

const TRACKED_FIELDS: Array<[string, string]> = [
  ["decision", "Decision"],
  ["funding_state", "Funding"],
  ["rank", "Rank"],
  ["target_period", "Target period"],
  ["status", "Status"],
  ["name", "Name"],
  ["visibility", "Visibility"],
  ["review_cadence", "Review cadence"],
];

/** Renders the "from → to" summary for one audit row. */
function Changes({ event }: { event: PortfolioAuditEvent }) {
  const parts = TRACKED_FIELDS.flatMap(([key, fieldLabel]) => {
    const before = event.previous?.[key];
    const after = event.next?.[key];
    if (after === undefined && before === undefined) return [];
    if (String(before ?? "") === String(after ?? "")) return [];
    const from = decisionText(before) ?? (before == null || before === "" ? "—" : String(before));
    const to = decisionText(after) ?? (after == null || after === "" ? "—" : String(after));
    return [`${fieldLabel}: ${from} → ${to}`];
  });

  if (parts.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {parts.map((part) => (
        <li key={part} className="text-xs text-muted-foreground">
          {part}
        </li>
      ))}
    </ul>
  );
}

function EventList({ events }: { events: PortfolioAuditEvent[] }) {
  return (
    <ol className="relative ml-2 space-y-3 border-l border-border">
      {events.map((event) => (
        <li key={event.id} className="ml-4">
          <span
            aria-hidden
            className="absolute -left-[5px] mt-1.5 block h-2.5 w-2.5 rounded-full bg-primary"
          />
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-sm font-medium text-foreground">{label(event.eventType)}</p>
            <time className="text-xs text-muted-foreground" dateTime={event.at}>
              {new Date(event.at).toLocaleString()}
            </time>
            {event.severity && event.severity !== "info" && (
              <Badge variant="secondary" className="text-[10px]">
                {event.severity}
              </Badge>
            )}
          </div>
          <Changes event={event} />
        </li>
      ))}
    </ol>
  );
}

/** Full append-only trail for a portfolio: lifecycle plus every membership change. */
export function PortfolioAuditTrail({ portfolioId }: { portfolioId: string }) {
  const { data, isLoading, error } = usePortfolioAudit(portfolioId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading audit trail…</p>;
  if (error)
    return (
      <p className="text-sm text-muted-foreground">
        The audit trail could not be read. You can only see events you generated, or events for a
        workspace you administer.
      </p>
    );
  if (!data || data.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No recorded events yet. Changes to this portfolio and its decisions are appended here.
      </p>
    );

  return <EventList events={data} />;
}

/** Decision history for a single use case inside one portfolio. */
export function EntryDecisionHistory({
  portfolioId,
  useCaseId,
}: {
  portfolioId: string;
  useCaseId: string;
}) {
  const { data, isLoading, error } = usePortfolioAudit(portfolioId);
  const events = (data ?? []).filter(
    (event) => event.entityType === "portfolio_item" && event.useCaseId === useCaseId,
  );

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading history…</p>;
  if (error) return <p className="text-xs text-muted-foreground">History unavailable.</p>;
  if (events.length === 0)
    return <p className="text-xs text-muted-foreground">No decision changes recorded yet.</p>;

  return <EventList events={events} />;
}
