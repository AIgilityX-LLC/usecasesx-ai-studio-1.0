/**
 * Server-only lead pipeline reads/writes. Runs on the caller's RLS-scoped
 * client, so only platform-admin roles (per the lead_captures policies) can
 * see or change lead records.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

import type { LeadEvent, LeadRecord, LeadStatus } from "./leads.model";
import { isRetryDue, normalizeLeadStatus } from "./leads.model";

const COLUMNS =
  "id, reference_id, full_name, email, company, country, interest_area, cta, source_page, lead_status, waitlist_status, eligible, utm_source, utm_medium, utm_campaign, referrer_host, created_at, confirmation_status, confirmation_attempts, confirmation_last_attempt_at, confirmation_sent_at, confirmation_next_retry_at, confirmation_last_error";

export async function listLeads(supabase: Client, limit = 1000): Promise<LeadRecord[]> {
  const { data, error } = await supabase
    .from("lead_captures")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadRecord[];
}

/** Append-only activity timeline for one lead (status changes + email attempts). */
export async function listLeadEvents(
  supabase: Client,
  leadId: string,
  limit = 200,
): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from("lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadEvent[];
}

export async function recordLeadEvents(
  supabase: Client,
  rows: Omit<LeadEvent, "id" | "created_at">[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("lead_events").insert(rows);
  // The timeline is observability, never a reason to fail the caller's action.
  if (error) console.warn("[usecasex:leads] timeline write failed", error.message);
}

export async function setLeadStatus(
  supabase: Client,
  input: {
    ids: string[];
    status: LeadStatus;
    note?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    correlationId?: string | null;
  },
): Promise<number> {
  // Read the prior statuses first so the timeline records the real transition.
  const { data: before } = await supabase
    .from("lead_captures")
    .select("id, lead_status")
    .in("id", input.ids);
  const previous = new Map<string, string>(
    ((before ?? []) as { id: string; lead_status: string | null }[]).map((r) => [
      r.id,
      normalizeLeadStatus(r.lead_status),
    ]),
  );

  const patch: Record<string, unknown> = { lead_status: input.status };
  if (input.note !== undefined && input.note !== null) patch.notes = input.note;
  const { data, error } = await supabase
    .from("lead_captures")
    .update(patch)
    .in("id", input.ids)
    .select("id");
  if (error) throw new Error(error.message);
  const updated = (data ?? []) as { id: string }[];

  await recordLeadEvents(
    supabase,
    updated.map((row) => ({
      lead_id: row.id,
      event_type: "status_change",
      from_status: previous.get(row.id) ?? null,
      to_status: input.status,
      actor_id: input.actorId ?? null,
      actor_label: input.actorLabel ?? null,
      detail: input.note ?? null,
      correlation_id: input.correlationId ?? null,
    })),
  );
  return updated.length;
}

/**
 * Retries confirmation-email delivery for every lead whose attempt is due.
 *
 * Lovable's managed email service already retries an accepted send; this pass
 * covers the failures it cannot retry for us (unverified sender domain, rate
 * limits, transient API errors) using capped exponential backoff, and records
 * each outcome on the lead and in its timeline.
 */
export async function retryDueConfirmations(
  supabase: Client,
  options: { limit?: number; actorId?: string | null; actorLabel?: string | null } = {},
): Promise<{ attempted: number; sent: number; failed: number }> {
  const leads = (await listLeads(supabase, options.limit ?? 100)).filter(isRetryDue);
  const { deliverLeadConfirmation, recordDeliveryOutcome } = await import(
    "./lead-confirmation.server"
  );

  let sent = 0;
  let failed = 0;
  for (const lead of leads) {
    const result = await deliverLeadConfirmation({
      fullName: lead.full_name,
      email: lead.email,
      referenceId: lead.reference_id ?? "",
      triggerCase: lead.cta ?? "waitlist",
      interestArea: lead.interest_area,
    });
    if (result.sent) sent += 1;
    else failed += 1;
    await recordDeliveryOutcome(supabase, {
      leadId: lead.id,
      attempts: (lead.confirmation_attempts ?? 0) + 1,
      result,
      actorId: options.actorId ?? null,
      actorLabel: options.actorLabel ?? null,
    });
  }
  return { attempted: leads.length, sent, failed };
}
