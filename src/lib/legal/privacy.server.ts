/**
 * Server-only data-rights persistence: personal export assembly, deletion
 * scheduling and consent recording.
 *
 * Every query runs through the caller's RLS-scoped client, so a request can
 * only ever read or write the requesting person's own rows.
 */
import {
  DEFAULT_EXPORT_SCOPE,
  DELETION_GRACE_DAYS,
  EXPORT_MAX_ROWS_PER_TABLE,
  type DeletionRequestRecord,
  type DeletionStatus,
  type ExportRequestRecord,
  type ExportStatus,
} from "./privacy.model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapExport(row: any): ExportRequestRecord {
  return {
    id: String(row.id),
    status: (row.status ?? "pending") as ExportStatus,
    progress: Number(row.progress ?? 0),
    scope: Array.isArray(row.scope) ? row.scope.map(String) : [],
    rowCounts: (row.row_counts ?? {}) as Record<string, number>,
    payloadBytes: Number(row.payload_bytes ?? 0),
    errorMessage: row.error_message ?? null,
    requestedAt: String(row.requested_at ?? row.created_at),
    completedAt: row.completed_at ?? null,
    expiresAt: String(row.expires_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeletion(row: any): DeletionRequestRecord {
  return {
    id: String(row.id),
    status: (row.status ?? "scheduled") as DeletionStatus,
    reason: row.reason ?? null,
    graceDays: Number(row.grace_days ?? DELETION_GRACE_DAYS),
    requestedAt: String(row.requested_at ?? row.created_at),
    effectiveAt: String(row.effective_at),
    cancelledAt: row.cancelled_at ?? null,
    completedAt: row.completed_at ?? null,
  };
}

const EXPORT_COLUMNS =
  "id,status,progress,scope,row_counts,payload_bytes,error_message,requested_at,completed_at,expires_at,created_at";

const DELETION_COLUMNS =
  "id,status,reason,grace_days,requested_at,effective_at,cancelled_at,completed_at,created_at";

/* ------------------------------------------------------------------ export */

export async function listExportRequests(
  supabase: Client,
  userId: string,
): Promise<ExportRequestRecord[]> {
  const { data, error } = await supabase
    .from("data_export_requests")
    .select(EXPORT_COLUMNS)
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapExport);
}

async function collectRows(
  supabase: Client,
  table: string,
  column: string,
  userId: string,
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(column, userId)
    .limit(EXPORT_MAX_ROWS_PER_TABLE);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

/**
 * Assembles the person's own records into a single JSON document and stores it
 * on the request row. Bounded per table so the payload can never run away.
 */
export async function runExportRequest(
  supabase: Client,
  userId: string,
  requestId: string,
  scope: string[],
): Promise<ExportRequestRecord> {
  const wanted = new Set(scope.length ? scope : DEFAULT_EXPORT_SCOPE);
  await supabase
    .from("data_export_requests")
    .update({ status: "processing", progress: 10 })
    .eq("id", requestId)
    .eq("user_id", userId);

  const sources: { key: string; table: string; column: string }[] = [
    { key: "profile", table: "profiles", column: "user_id" },
    { key: "consents", table: "consent_records", column: "user_id" },
    { key: "opportunities", table: "opportunities", column: "created_by" },
    { key: "use_cases", table: "use_case_submissions", column: "user_id" },
    { key: "portfolios", table: "portfolios", column: "user_id" },
    { key: "saved", table: "saved_use_cases", column: "user_id" },
    { key: "feedback", table: "product_feedback", column: "user_id" },
  ];

  try {
    const payload: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      subjectUserId: userId,
      notice:
        "This file contains the records this product holds about you, exported at your request.",
    };
    const rowCounts: Record<string, number> = {};

    let done = 0;
    for (const source of sources) {
      done += 1;
      if (!wanted.has(source.key)) continue;
      const rows = await collectRows(supabase, source.table, source.column, userId);
      payload[source.key] = rows;
      rowCounts[source.key] = rows.length;
      const progress = 10 + Math.round((done / sources.length) * 80);
      await supabase
        .from("data_export_requests")
        .update({ progress })
        .eq("id", requestId)
        .eq("user_id", userId);
    }

    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    const { data, error } = await supabase
      .from("data_export_requests")
      .update({
        status: "ready",
        progress: 100,
        payload,
        payload_bytes: bytes,
        row_counts: rowCounts,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", requestId)
      .eq("user_id", userId)
      .select(EXPORT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return mapExport(data);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Export failed";
    await supabase
      .from("data_export_requests")
      .update({ status: "failed", error_message: message.slice(0, 500) })
      .eq("id", requestId)
      .eq("user_id", userId);
    throw cause;
  }
}

export async function createExportRequest(
  supabase: Client,
  input: {
    userId: string;
    scope: string[];
    workspaceId: string | null;
    organizationId: string | null;
  },
): Promise<ExportRequestRecord> {
  const { data, error } = await supabase
    .from("data_export_requests")
    .insert({
      user_id: input.userId,
      scope: input.scope.length ? input.scope : DEFAULT_EXPORT_SCOPE,
      workspace_id: input.workspaceId,
      organization_id: input.organizationId,
      status: "pending",
      progress: 0,
    })
    .select(EXPORT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapExport(data);
}

/** Returns the stored document as JSON text for download. Expired requests are refused. */
export async function readExportPayload(
  supabase: Client,
  userId: string,
  requestId: string,
): Promise<{ payloadJson: string; requestedAt: string }> {
  const { data, error } = await supabase
    .from("data_export_requests")
    .select("payload,status,expires_at,requested_at")
    .eq("id", requestId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Export request not found.");
  if (data.status !== "ready") throw new Error("This export is not ready yet.");
  if (Date.parse(String(data.expires_at)) < Date.now()) {
    await supabase
      .from("data_export_requests")
      .update({ status: "expired", payload: null, payload_bytes: 0 })
      .eq("id", requestId)
      .eq("user_id", userId);
    throw new Error("This download link has expired. Request a new copy.");
  }
  // Serialised here: the RPC boundary only carries plain, typed values.
  return {
    payloadJson: JSON.stringify(data.payload ?? {}, null, 2),
    requestedAt: String(data.requested_at),
  };
}

/* ---------------------------------------------------------------- deletion */

export async function getActiveDeletionRequest(
  supabase: Client,
  userId: string,
): Promise<DeletionRequestRecord | null> {
  const { data, error } = await supabase
    .from("data_deletion_requests")
    .select(DELETION_COLUMNS)
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  return row ? mapDeletion(row) : null;
}

export async function createDeletionRequest(
  supabase: Client,
  input: {
    userId: string;
    reason: string | null;
    graceDays?: number;
    workspaceId: string | null;
    organizationId: string | null;
  },
): Promise<DeletionRequestRecord> {
  const existing = await getActiveDeletionRequest(supabase, input.userId);
  if (existing && (existing.status === "scheduled" || existing.status === "processing")) {
    return existing;
  }
  const graceDays = input.graceDays ?? DELETION_GRACE_DAYS;
  const effectiveAt = new Date(Date.now() + graceDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("data_deletion_requests")
    .insert({
      user_id: input.userId,
      reason: input.reason,
      grace_days: graceDays,
      effective_at: effectiveAt,
      status: "scheduled",
      workspace_id: input.workspaceId,
      organization_id: input.organizationId,
    })
    .select(DELETION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapDeletion(data);
}

export async function cancelDeletionRequest(
  supabase: Client,
  userId: string,
  requestId: string,
): Promise<DeletionRequestRecord> {
  const { data, error } = await supabase
    .from("data_deletion_requests")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .select(DELETION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This request can no longer be cancelled.");
  return mapDeletion(data);
}

/* ----------------------------------------------------------------- consent */

export async function recordConsent(
  supabase: Client,
  input: {
    userId: string;
    analytics: boolean;
    marketing: boolean;
    policyVersion: string;
    source: string;
    workspaceId: string | null;
    organizationId: string | null;
  },
): Promise<{ id: string; decidedAt: string }> {
  const { data, error } = await supabase
    .from("consent_records")
    .insert({
      user_id: input.userId,
      analytics: input.analytics,
      marketing: input.marketing,
      policy_version: input.policyVersion,
      source: input.source,
      workspace_id: input.workspaceId,
      organization_id: input.organizationId,
    })
    .select("id,decided_at")
    .single();
  if (error) throw new Error(error.message);
  return { id: String(data.id), decidedAt: String(data.decided_at) };
}

export async function getLatestConsent(
  supabase: Client,
  userId: string,
): Promise<{
  analytics: boolean;
  marketing: boolean;
  policyVersion: string;
  decidedAt: string;
} | null> {
  const { data, error } = await supabase
    .from("consent_records")
    .select("analytics,marketing,policy_version,decided_at")
    .eq("user_id", userId)
    .order("decided_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    analytics: Boolean(row.analytics),
    marketing: Boolean(row.marketing),
    policyVersion: String(row.policy_version ?? ""),
    decidedAt: String(row.decided_at),
  };
}
