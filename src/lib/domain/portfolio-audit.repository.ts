/**
 * Read-only access to the append-only audit trail for a portfolio.
 *
 * Two producers write these rows:
 *  • the `audit_portfolio_items` database trigger — membership and decision
 *    changes (`portfolio_item.added|updated|removed`), keyed by portfolio id
 *    with the affected `use_case_id` inside the value payloads;
 *  • the portfolio repository — portfolio lifecycle events (`entity.*`).
 *
 * Nothing here ever writes: `audit_events` is append-only and RLS only lets a
 * user read events they generated, or events for a workspace they administer.
 */

import { supabase } from "@/integrations/supabase/client";
import { unwrapResult } from "./errors";
import { parseInput, uuidSchema } from "./validation";

export interface PortfolioAuditEvent {
  id: string;
  at: string;
  eventType: string;
  entityType: string;
  severity: string | null;
  actorId: string | null;
  previous: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
  /** Present for `portfolio_item.*` events; identifies the affected use case. */
  useCaseId: string | null;
}

type Row = {
  id: string;
  created_at: string;
  event_type: string;
  entity_type: string;
  severity: string | null;
  actor_id: string | null;
  previous_value: unknown;
  new_value: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function listPortfolioAuditEvents(
  portfolioId: string,
  limit = 200,
): Promise<PortfolioAuditEvent[]> {
  const id = parseInput(uuidSchema, portfolioId);
  const result = await supabase
    .from("audit_events")
    .select(
      "id, created_at, event_type, entity_type, severity, actor_id, previous_value, new_value",
    )
    .eq("entity_id", id)
    .in("entity_type", ["portfolio", "portfolio_item"])
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as Row[];
  return rows.map((row) => {
    const next = asRecord(row.new_value);
    const previous = asRecord(row.previous_value);
    const useCaseId =
      typeof next?.["use_case_id"] === "string"
        ? (next["use_case_id"] as string)
        : typeof previous?.["use_case_id"] === "string"
          ? (previous["use_case_id"] as string)
          : null;
    return {
      id: row.id,
      at: row.created_at,
      eventType: row.event_type,
      entityType: row.entity_type,
      severity: row.severity,
      actorId: row.actor_id,
      previous,
      next,
      useCaseId,
    };
  });
}
