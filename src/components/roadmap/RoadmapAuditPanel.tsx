/**
 * Roadmap audit trail — who changed delivery stage, dates, owner, milestone,
 * blocker or dependencies, scoped to the use cases currently on screen.
 *
 * Reads the append-only `audit_events` trail written by the
 * `audit_portfolio_items` trigger. Nothing here ever writes.
 */

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolioAudit } from "@/components/portfolios/PortfolioAuditTrail";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { DELIVERY_STAGE_LABELS, type DeliveryStage } from "@/lib/portfolio-model";
import type { PortfolioAuditEvent } from "@/lib/domain/portfolio-audit.repository";

const ROADMAP_FIELDS: Array<[string, string]> = [
  ["delivery_stage", "Stage"],
  ["planned_start_date", "Planned start"],
  ["planned_end_date", "Planned end"],
  ["delivery_owner", "Owner"],
  ["milestone", "Milestone"],
  ["blocked_reason", "Blocker"],
  ["depends_on", "Dependencies"],
];

function display(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length === 0 ? "—" : `${value.length} linked`;
  if (field === "delivery_stage") {
    return DELIVERY_STAGE_LABELS[value as DeliveryStage] ?? String(value);
  }
  return String(value);
}

function changes(event: PortfolioAuditEvent) {
  const result: { label: string; from: string; to: string }[] = [];
  for (const [field, label] of ROADMAP_FIELDS) {
    const before = event.previous?.[field];
    const after = event.next?.[field];
    if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) continue;
    result.push({ label, from: display(field, before), to: display(field, after) });
  }
  return result;
}

export function RoadmapAuditPanel({
  portfolioId,
  useCaseIds,
  titles,
  scopeLabel,
}: {
  portfolioId: string;
  /** Use cases currently displayed — the panel shows only their changes. */
  useCaseIds: string[];
  titles: Map<string, string>;
  scopeLabel: string;
}) {
  const session = useSupabaseSession();
  const { data, isLoading, error } = usePortfolioAudit(portfolioId);

  const visible = useMemo(() => {
    const inView = new Set(useCaseIds);
    return (data ?? [])
      .filter((event) => event.useCaseId && inView.has(event.useCaseId))
      .map((event) => ({ event, fields: changes(event) }))
      .filter(({ event, fields }) => fields.length > 0 || event.eventType !== "portfolio_item.updated")
      .slice(0, 50);
  }, [data, useCaseIds]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>Roadmap change history</span>
          <Badge variant="secondary">{scopeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading change history…</p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">Change history is unavailable right now.</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recorded roadmap changes for the items in view.
          </p>
        ) : (
          <ol className="space-y-3">
            {visible.map(({ event, fields }) => (
              <li key={event.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {titles.get(event.useCaseId ?? "") ?? "Use case"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.at).toLocaleString()} ·{" "}
                    {event.actorId && event.actorId === session?.user.id
                      ? "You"
                      : event.actorId
                        ? "Workspace member"
                        : "System"}
                  </p>
                </div>
                {fields.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.eventType.replace(/[._]/g, " ")}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {fields.map((field) => (
                      <li key={field.label}>
                        <span className="font-medium text-foreground">{field.label}</span>:{" "}
                        {field.from} → {field.to}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
