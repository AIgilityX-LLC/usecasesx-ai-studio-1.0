/**
 * Server-only feedback persistence and triage.
 *
 * Every query runs through the caller's RLS-scoped client: contributors can
 * only ever write and read their own rows, platform admins read and triage
 * the whole queue.
 */
import type { FeedbackRecord, FeedbackStatus, RequestStatusAlert } from "./feedback.model";
import { DEFAULT_REQUEST_PRIORITY } from "./sla";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FeedbackRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    status: (row.status ?? "new") as FeedbackStatus,
    category: String(row.category ?? "other"),
    severity: String(row.severity ?? "normal"),
    contextRoute: row.context_route ?? null,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    message: String(row.message ?? ""),
    evidenceUrl: row.evidence_url ?? null,
    allowContact: Boolean(row.allow_contact),
    userId: row.user_id ?? null,
    workspaceId: row.workspace_id ?? null,
    resolutionNote: row.resolution_note ?? null,
    resolvedAt: row.resolved_at ?? null,
    isRealActivity: row.is_real_activity === undefined ? true : Boolean(row.is_real_activity),
    assignedTo: row.assigned_to ?? null,
    assignedBy: row.assigned_by ?? null,
    assignedAt: row.assigned_at ?? null,
    priority: String(row.priority ?? DEFAULT_REQUEST_PRIORITY),
    dueAt: row.due_at ?? null,
    firstResponseAt: row.first_response_at ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlert(row: any): RequestStatusAlert {
  return {
    id: String(row.id),
    feedbackId: String(row.feedback_id),
    fromStatus: row.from_status ?? null,
    toStatus: String(row.to_status),
    priority: row.priority ?? null,
    dueAt: row.due_at ?? null,
    note: row.note ?? null,
    readAt: row.read_at ?? null,
    createdAt: String(row.created_at),
  };
}

export interface SubmitFeedbackArgs {
  userId: string;
  category: string;
  severity: string;
  message: string;
  contextRoute: string | null;
  entityType: string | null;
  entityId: string | null;
  evidenceUrl: string | null;
  allowContact: boolean;
  contactEmail: string | null;
  workspaceId: string | null;
  organizationId: string | null;
}

export async function insertFeedback(
  supabase: Client,
  args: SubmitFeedbackArgs,
): Promise<FeedbackRecord> {
  const { data, error } = await supabase
    .from("product_feedback")
    .insert({
      user_id: args.userId,
      category: args.category,
      severity: args.severity,
      message: args.message,
      context_route: args.contextRoute,
      entity_type: args.entityType,
      entity_id: args.entityId,
      evidence_url: args.evidenceUrl,
      allow_contact: args.allowContact,
      contact_email: args.allowContact ? args.contactEmail : null,
      workspace_id: args.workspaceId,
      organization_id: args.organizationId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function listMyFeedback(supabase: Client, userId: string): Promise<FeedbackRecord[]> {
  const { data, error } = await supabase
    .from("product_feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export interface FeedbackQueueFilter {
  status?: FeedbackStatus | null;
  category?: string | null;
  includeDemo: boolean;
}

export async function listFeedbackQueue(
  supabase: Client,
  filter: FeedbackQueueFilter,
): Promise<FeedbackRecord[]> {
  let query = supabase
    .from("v_feedback_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.category) query = query.eq("category", filter.category);
  if (!filter.includeDemo) query = query.eq("is_real_activity", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function setFeedbackStatus(
  supabase: Client,
  input: { id: string; status: FeedbackStatus; resolutionNote: string | null; actorId: string },
): Promise<FeedbackRecord> {
  const closing = input.status === "resolved" || input.status === "declined";
  const { data: before } = await supabase
    .from("product_feedback")
    .select("status, first_response_at")
    .eq("id", input.id)
    .maybeSingle();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("product_feedback")
    .update({
      status: input.status,
      resolution_note: input.resolutionNote,
      resolved_by: closing ? input.actorId : null,
      resolved_at: closing ? nowIso : null,
      first_response_at: before?.first_response_at ?? nowIso,
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const record = mapRow(data);
  // The reporter learns about every status move in-app; a failed alert must not
  // roll back the triage decision, so it is best-effort and logged, not thrown.
  if (record.userId && before?.status !== record.status) {
    const { error: alertError } = await supabase.from("request_status_alerts").insert({
      feedback_id: record.id,
      user_id: record.userId,
      from_status: before?.status ?? null,
      to_status: record.status,
      priority: record.priority,
      due_at: record.dueAt,
      note: input.resolutionNote,
      actor_id: input.actorId,
    });
    if (alertError) console.error("request alert insert failed", alertError.message);
  }
  return record;
}

/** Assign an owner, set priority and set/derive the SLA due date. */
export async function setFeedbackTriage(
  supabase: Client,
  input: {
    id: string;
    assignedTo: string | null;
    priority: string;
    dueAt: string;
    actorId: string;
  },
): Promise<FeedbackRecord> {
  const { data, error } = await supabase
    .from("product_feedback")
    .update({
      assigned_to: input.assignedTo,
      assigned_by: input.assignedTo ? input.actorId : null,
      assigned_at: input.assignedTo ? new Date().toISOString() : null,
      priority: input.priority,
      due_at: input.dueAt,
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function listMyRequestAlerts(
  supabase: Client,
  userId: string,
): Promise<RequestStatusAlert[]> {
  const { data, error } = await supabase
    .from("request_status_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAlert);
}

export async function markRequestAlertsRead(
  supabase: Client,
  userId: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await supabase
    .from("request_status_alerts")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
