/**
 * Evidence version history for a benefit.
 *
 * Evidence is stored inline on the benefit row, and every change is captured
 * by the database audit trigger as `benefit.evidence_changed` (plus the
 * creating `benefit.created` event). Rather than duplicating storage in a
 * second table, this repository reconstructs the revision timeline from that
 * append-only audit trail and can restore any earlier state by writing it back
 * as a new revision — history is never rewritten.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { normalizeError, unwrapResult } from "./errors";
import type { BenefitEvidenceItem } from "@/lib/value/benefits.model";

export interface EvidenceRevision {
  /** Audit event id — stable key for the revision. */
  id: string;
  at: string;
  eventType: string;
  /** Evidence state as it was AFTER this event. */
  items: BenefitEvidenceItem[];
  added: number;
  removed: number;
  /** True for the state currently on the benefit row. */
  isCurrent: boolean;
}

function toItems(value: unknown): BenefitEvidenceItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BenefitEvidenceItem => {
    const record = item as { id?: unknown; kind?: unknown };
    return typeof record?.id === "string" && typeof record?.kind === "string";
  });
}

function idSet(items: BenefitEvidenceItem[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

/** Newest revision first; the first entry is the state on the benefit today. */
export async function listEvidenceRevisions(
  useCaseId: string,
  benefitId: string,
): Promise<EvidenceRevision[]> {
  const result = await supabase
    .from("audit_events")
    .select("id, event_type, created_at, previous_value, new_value")
    .eq("entity_type", "use_case_benefit")
    .eq("entity_id", useCaseId)
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as {
    id: string;
    event_type: string;
    created_at: string;
    previous_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
  }[];

  const revisions: EvidenceRevision[] = [];

  for (const row of rows) {
    const payloadId =
      (row.new_value?.["benefit_id"] as string | undefined) ??
      (row.previous_value?.["benefit_id"] as string | undefined);
    if (payloadId !== benefitId) continue;

    const next = toItems(row.new_value?.["evidence_links"]);
    const previous = toItems(row.previous_value?.["evidence_links"]);
    const changed =
      row.event_type === "benefit.created" ||
      JSON.stringify(next.map((i) => i.id)) !== JSON.stringify(previous.map((i) => i.id));
    if (!changed) continue;

    const previousIds = idSet(previous);
    const nextIds = idSet(next);
    revisions.push({
      id: row.id,
      at: row.created_at,
      eventType: row.event_type,
      items: next,
      added: next.filter((item) => !previousIds.has(item.id)).length,
      removed: previous.filter((item) => !nextIds.has(item.id)).length,
      isCurrent: false,
    });
  }

  if (revisions[0]) revisions[0].isCurrent = true;
  return revisions;
}

/**
 * Restore an earlier evidence state. This writes the old set back onto the
 * benefit, which the trigger records as a new `benefit.evidence_changed`
 * event — the timeline stays append-only and auditable.
 */
export async function restoreEvidenceRevision(
  benefitId: string,
  items: BenefitEvidenceItem[],
): Promise<void> {
  const result = await supabase
    .from("use_case_benefits")
    .update({ evidence_links: JSON.parse(JSON.stringify(items)) as Json })
    .eq("id", benefitId);
  if (result.error) throw normalizeError(result.error);
}
