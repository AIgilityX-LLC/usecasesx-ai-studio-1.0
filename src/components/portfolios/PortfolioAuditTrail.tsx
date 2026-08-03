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

const CATEGORIES: Array<{ value: string; label: string; match: (e: PortfolioAuditEvent) => boolean }> =
  [
    { value: "all", label: "All activity", match: () => true },
    {
      value: "membership",
      label: "Use cases added / removed",
      match: (e) => e.eventType.endsWith(".added") || e.eventType.endsWith(".removed"),
    },
    {
      value: "decisions",
      label: "Decision changes",
      match: (e) => e.eventType === "portfolio_item.updated",
    },
    {
      value: "portfolio",
      label: "Portfolio lifecycle",
      match: (e) => e.entityType === "portfolio" && !e.eventType.startsWith("export"),
    },
    { value: "exports", label: "Exports & shares", match: (e) => e.eventType.startsWith("export") },
  ];

const RANGES: Array<{ value: string; label: string; days: number | null }> = [
  { value: "all", label: "All time", days: null },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
];

/** Full append-only trail for a portfolio: lifecycle plus every membership change. */
export function PortfolioAuditTrail({ portfolioId }: { portfolioId: string }) {
  const { data, isLoading, error } = usePortfolioAudit(portfolioId);
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState("all");

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0]!;
    const days = RANGES.find((r) => r.value === range)?.days ?? null;
    const cutoff = days == null ? null : Date.now() - days * 86_400_000;
    return (data ?? []).filter(
      (event) =>
        cat.match(event) && (cutoff == null || new Date(event.at).getTime() >= cutoff),
    );
  }, [data, category, range]);

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-[220px]" aria-label="Filter audit trail by activity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-8 w-[160px]" aria-label="Filter audit trail by date">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="self-center text-xs text-muted-foreground" aria-live="polite">
          {filtered.length} of {data.length} events
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events match these filters.</p>
      ) : (
        <EventList events={filtered} />
      )}
    </div>
  );
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
