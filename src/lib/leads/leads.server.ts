/**
 * Server-only lead pipeline reads/writes. Runs on the caller's RLS-scoped
 * client, so only platform-admin roles (per the lead_captures policies) can
 * see or change lead records.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

import type { LeadRecord, LeadStatus } from "./leads.model";

const COLUMNS =
  "id, reference_id, full_name, email, company, country, interest_area, cta, source_page, lead_status, waitlist_status, eligible, utm_source, utm_medium, utm_campaign, referrer_host, created_at";

export async function listLeads(supabase: Client, limit = 1000): Promise<LeadRecord[]> {
  const { data, error } = await supabase
    .from("lead_captures")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadRecord[];
}

export async function setLeadStatus(
  supabase: Client,
  input: { ids: string[]; status: LeadStatus; note?: string | null },
): Promise<number> {
  const patch: Record<string, unknown> = { lead_status: input.status };
  if (input.note !== undefined && input.note !== null) patch.notes = input.note;
  const { data, error } = await supabase
    .from("lead_captures")
    .update(patch)
    .in("id", input.ids)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
