import { supabase } from "@/integrations/supabase/client";
import type { DeliverableType, DeliverableStatus } from "@/lib/deliverables";

export interface DeliverableRow {
  id: string;
  use_case_id: string;
  deliverable_type: DeliverableType;
  status: DeliverableStatus;
  content: Record<string, unknown>;
  updated_at: string;
}

/** How a stored version came to be — authored in the editor, or generated. */
export type DeliverableOrigin = "authored" | "generated" | "reverted";

export interface DeliverableVersionRow {
  id: string;
  deliverable_id: string;
  use_case_id: string;
  deliverable_type: DeliverableType;
  version: number;
  content: Record<string, unknown>;
  status: DeliverableStatus;
  origin: DeliverableOrigin;
  summary: string | null;
  created_at: string;
}

export async function loadDeliverables(useCaseId: string): Promise<DeliverableRow[]> {
  const { data, error } = await supabase
    .from("use_case_deliverables")
    .select("id,use_case_id,deliverable_type,status,content,updated_at")
    .eq("use_case_id", useCaseId);
  if (error) throw error;
  return (data ?? []) as DeliverableRow[];
}

export async function loadDeliverable(
  useCaseId: string,
  type: DeliverableType,
): Promise<DeliverableRow | null> {
  const { data, error } = await supabase
    .from("use_case_deliverables")
    .select("id,use_case_id,deliverable_type,status,content,updated_at")
    .eq("use_case_id", useCaseId)
    .eq("deliverable_type", type)
    .maybeSingle();
  if (error) throw error;
  return (data as DeliverableRow | null) ?? null;
}

/* ----------------------------- version history ---------------------------- */

/**
 * Every save snapshots the deliverable, so a user can see how a document
 * changed and go back to any earlier generation. History is append-only.
 */
export async function loadDeliverableVersions(
  useCaseId: string,
  type: DeliverableType,
): Promise<DeliverableVersionRow[]> {
  const { data, error } = await supabase
    .from("use_case_deliverable_versions")
    .select("id,deliverable_id,use_case_id,deliverable_type,version,content,status,origin,summary,created_at")
    .eq("use_case_id", useCaseId)
    .eq("deliverable_type", type)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DeliverableVersionRow[];
}

/** Version counts for every deliverable of a use case, keyed by type. */
export async function loadVersionCounts(
  useCaseId: string,
): Promise<Record<string, { count: number; latestAt: string }>> {
  const { data, error } = await supabase
    .from("use_case_deliverable_versions")
    .select("deliverable_type,created_at")
    .eq("use_case_id", useCaseId)
    .order("created_at", { ascending: false });
  if (error) return {};
  const out: Record<string, { count: number; latestAt: string }> = {};
  (data ?? []).forEach((row) => {
    const key = row.deliverable_type as string;
    const existing = out[key];
    if (existing) existing.count += 1;
    else out[key] = { count: 1, latestAt: row.created_at as string };
  });
  return out;
}

async function nextVersion(deliverableId: string): Promise<number> {
  const { data } = await supabase
    .from("use_case_deliverable_versions")
    .select("version")
    .eq("deliverable_id", deliverableId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.version as number | undefined) ?? 0) + 1;
}

async function recordVersion(args: {
  deliverableId: string;
  useCaseId: string;
  type: DeliverableType;
  content: Record<string, unknown>;
  status: DeliverableStatus;
  origin: DeliverableOrigin;
  summary?: string;
  userId: string | null;
}): Promise<void> {
  const version = await nextVersion(args.deliverableId);
  const { error } = await supabase.from("use_case_deliverable_versions").insert({
    deliverable_id: args.deliverableId,
    use_case_id: args.useCaseId,
    deliverable_type: args.type,
    version,
    content: args.content as never,
    status: args.status,
    origin: args.origin,
    summary: args.summary ?? null,
    created_by: args.userId,
  });
  // History must never block the primary save — surface it in logs only.
  if (error) console.error("Could not record deliverable version", error);
}

export async function saveDeliverable(
  useCaseId: string,
  type: DeliverableType,
  content: Record<string, unknown>,
  status: DeliverableStatus,
  options?: { origin?: DeliverableOrigin; summary?: string },
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: existing } = await supabase
    .from("use_case_deliverables")
    .select("id")
    .eq("use_case_id", useCaseId)
    .eq("deliverable_type", type)
    .maybeSingle();

  let deliverableId = existing?.id as string | undefined;

  if (deliverableId) {
    const { error } = await supabase
      .from("use_case_deliverables")
      .update({ content: content as never, status })
      .eq("id", deliverableId);
    if (error) throw error;
  } else {
    const { data: inserted, error } = await supabase
      .from("use_case_deliverables")
      .insert({
        use_case_id: useCaseId,
        deliverable_type: type,
        content: content as never,
        status,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    deliverableId = inserted?.id as string;
  }

  if (deliverableId) {
    await recordVersion({
      deliverableId,
      useCaseId,
      type,
      content,
      status,
      origin: options?.origin ?? "authored",
      summary: options?.summary,
      userId,
    });
  }
}

/**
 * Restore an earlier version. The current content is not lost: reverting
 * writes a new version on top, so history stays linear and auditable.
 */
export async function revertDeliverableToVersion(
  useCaseId: string,
  type: DeliverableType,
  version: DeliverableVersionRow,
): Promise<void> {
  await saveDeliverable(useCaseId, type, version.content ?? {}, version.status, {
    origin: "reverted",
    summary: `Reverted to version ${version.version}`,
  });
}
