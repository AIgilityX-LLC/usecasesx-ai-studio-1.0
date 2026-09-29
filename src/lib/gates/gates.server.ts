/**
 * Decision gates persistence (server-only).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertGateSod,
  assertHumanClose,
  assertHumanDecide,
  assertReadyToSubmit,
  computeSla,
  gateDefinition,
  identifyMissingInputs,
  isDecideAction,
  statusAfterAction,
  type FieldPresence,
  type GateAction,
  type GateActorKind,
  type GateKey,
  type GateReviewStatus,
  type MissingInput,
  type OpenItemKind,
  type OpenItemStatus,
} from "./model";
import {
  assertScopedPermission,
  hasScopedPermission,
  type PermissionSubject,
} from "@/lib/authz/scoped-permissions";
import { AUDIT_EVENTS } from "@/lib/telemetry/events";
import { writeAuditEvent } from "@/lib/telemetry/recorder.server";

type Client = SupabaseClient<any, any, any>;

const REVIEW_SELECT =
  "id, organization_id, workspace_id, use_case_id, gate_key, status, submitted_by, submitted_at, sla_due_at, record_version_id, decision_authority, sod_enabled, sla_hours, current_event_id, missing_inputs, created_by, created_at, updated_at, deleted_at";

const EVENT_SELECT =
  "id, review_id, organization_id, workspace_id, action, actor_id, rationale, conditions_snapshot, change_requests_snapshot, record_version_id, decision_authority, created_at";

const ITEM_SELECT =
  "id, review_id, event_id, organization_id, workspace_id, kind, field_key, body, status, closed_by, closed_at, close_note, created_by, created_at, updated_at";

export type GateReview = {
  id: string;
  organizationId: string | null;
  workspaceId: string;
  useCaseId: string;
  gateKey: GateKey;
  status: GateReviewStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  slaDueAt: string | null;
  recordVersionId: string | null;
  decisionAuthority: string;
  sodEnabled: boolean;
  slaHours: number;
  currentEventId: string | null;
  missingInputs: MissingInput[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GateEvent = {
  id: string;
  reviewId: string;
  organizationId: string | null;
  workspaceId: string;
  action: GateAction;
  actorId: string;
  rationale: string | null;
  conditionsSnapshot: string[];
  changeRequestsSnapshot: { fieldKey: string; message: string }[];
  recordVersionId: string | null;
  decisionAuthority: string | null;
  createdAt: string;
};

export type GateOpenItem = {
  id: string;
  reviewId: string;
  eventId: string;
  organizationId: string | null;
  workspaceId: string;
  kind: OpenItemKind;
  fieldKey: string | null;
  body: string;
  status: OpenItemStatus;
  closedBy: string | null;
  closedAt: string | null;
  closeNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function asMissing(raw: unknown): MissingInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is MissingInput =>
      !!x &&
      typeof x === "object" &&
      typeof (x as MissingInput).field === "string" &&
      typeof (x as MissingInput).reason === "string",
  );
}

function rowToReview(row: Record<string, unknown>): GateReview {
  return {
    id: String(row.id),
    organizationId: (row.organization_id as string) ?? null,
    workspaceId: String(row.workspace_id),
    useCaseId: String(row.use_case_id),
    gateKey: row.gate_key as GateKey,
    status: row.status as GateReviewStatus,
    submittedBy: (row.submitted_by as string) ?? null,
    submittedAt: (row.submitted_at as string) ?? null,
    slaDueAt: (row.sla_due_at as string) ?? null,
    recordVersionId: (row.record_version_id as string) ?? null,
    decisionAuthority: String(row.decision_authority),
    sodEnabled: Boolean(row.sod_enabled),
    slaHours: Number(row.sla_hours),
    currentEventId: (row.current_event_id as string) ?? null,
    missingInputs: asMissing(row.missing_inputs),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToEvent(row: Record<string, unknown>): GateEvent {
  const crs = Array.isArray(row.change_requests_snapshot)
    ? (row.change_requests_snapshot as { fieldKey?: string; message?: string }[])
        .filter((c) => c?.fieldKey && c?.message)
        .map((c) => ({ fieldKey: String(c.fieldKey), message: String(c.message) }))
    : [];
  const conditions = Array.isArray(row.conditions_snapshot)
    ? (row.conditions_snapshot as unknown[]).map(String)
    : [];
  return {
    id: String(row.id),
    reviewId: String(row.review_id),
    organizationId: (row.organization_id as string) ?? null,
    workspaceId: String(row.workspace_id),
    action: row.action as GateAction,
    actorId: String(row.actor_id),
    rationale: (row.rationale as string) ?? null,
    conditionsSnapshot: conditions,
    changeRequestsSnapshot: crs,
    recordVersionId: (row.record_version_id as string) ?? null,
    decisionAuthority: (row.decision_authority as string) ?? null,
    createdAt: String(row.created_at),
  };
}

function rowToItem(row: Record<string, unknown>): GateOpenItem {
  return {
    id: String(row.id),
    reviewId: String(row.review_id),
    eventId: String(row.event_id),
    organizationId: (row.organization_id as string) ?? null,
    workspaceId: String(row.workspace_id),
    kind: row.kind as OpenItemKind,
    fieldKey: (row.field_key as string) ?? null,
    body: String(row.body),
    status: row.status as OpenItemStatus,
    closedBy: (row.closed_by as string) ?? null,
    closedAt: (row.closed_at as string) ?? null,
    closeNote: (row.close_note as string) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function loadUseCaseTenant(
  supabase: Client,
  useCaseId: string,
): Promise<{
  id: string;
  workspaceId: string;
  organizationId: string | null;
  title: string | null;
  currentVersionId: string | null;
  createdBy: string | null;
}> {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select("id, workspace_id, organization_id, title, current_version_id, created_by")
    .eq("id", useCaseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.workspace_id) throw new Error("Use case not found or has no workspace.");
  return {
    id: String(data.id),
    workspaceId: String(data.workspace_id),
    organizationId: (data.organization_id as string) ?? null,
    title: (data.title as string) ?? null,
    currentVersionId: (data.current_version_id as string) ?? null,
    createdBy: (data.created_by as string) ?? null,
  };
}

export async function listReviewsForUseCase(
  supabase: Client,
  useCaseId: string,
): Promise<GateReview[]> {
  const { data, error } = await supabase
    .from("decision_gate_reviews")
    .select(REVIEW_SELECT)
    .eq("use_case_id", useCaseId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToReview(r as Record<string, unknown>));
}

export async function listInbox(
  supabase: Client,
  workspaceId: string,
): Promise<
  Array<
    GateReview & {
      useCaseTitle: string | null;
      sla: ReturnType<typeof computeSla>;
      openConditionCount: number;
      openChangeRequestCount: number;
    }
  >
> {
  const { data, error } = await supabase
    .from("decision_gate_reviews")
    .select(REVIEW_SELECT)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .in("status", [
      "submitted",
      "in_review",
      "changes_requested",
      "approved_with_conditions",
    ])
    .order("sla_due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);

  const reviews = (data ?? []).map((r) => rowToReview(r as Record<string, unknown>));
  if (reviews.length === 0) return [];

  const useCaseIds = [...new Set(reviews.map((r) => r.useCaseId))];
  const reviewIds = reviews.map((r) => r.id);

  const [{ data: ucRows }, { data: openRows }] = await Promise.all([
    supabase.from("ai_use_cases").select("id, title").in("id", useCaseIds),
    supabase
      .from("decision_gate_open_items")
      .select("review_id, kind")
      .in("review_id", reviewIds)
      .eq("status", "open"),
  ]);

  const titleById = new Map(
    (ucRows ?? []).map((u) => [String((u as { id: string }).id), (u as { title: string | null }).title]),
  );
  const openByReview = new Map<string, { conditions: number; changes: number }>();
  for (const row of openRows ?? []) {
    const rid = String((row as { review_id: string }).review_id);
    const kind = (row as { kind: string }).kind;
    const cur = openByReview.get(rid) ?? { conditions: 0, changes: 0 };
    if (kind === "condition") cur.conditions += 1;
    else cur.changes += 1;
    openByReview.set(rid, cur);
  }

  return reviews.map((r) => {
    const open = openByReview.get(r.id) ?? { conditions: 0, changes: 0 };
    return {
      ...r,
      useCaseTitle: titleById.get(r.useCaseId) ?? null,
      sla: computeSla(r.submittedAt, r.slaHours),
      openConditionCount: open.conditions,
      openChangeRequestCount: open.changes,
    };
  });
}

export async function listOpenItems(
  supabase: Client,
  reviewId: string,
): Promise<GateOpenItem[]> {
  const { data, error } = await supabase
    .from("decision_gate_open_items")
    .select(ITEM_SELECT)
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToItem(r as Record<string, unknown>));
}

export async function listEvents(
  supabase: Client,
  reviewId: string,
): Promise<GateEvent[]> {
  const { data, error } = await supabase
    .from("decision_gate_events")
    .select(EVENT_SELECT)
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToEvent(r as Record<string, unknown>));
}

export async function previewMissingInputs(
  gateKey: GateKey,
  fields: FieldPresence,
): Promise<MissingInput[]> {
  return identifyMissingInputs(gateDefinition(gateKey), fields);
}

export async function submitGateReview(
  supabase: Client,
  userId: string,
  subject: PermissionSubject,
  input: {
    useCaseId: string;
    gateKey: GateKey;
    recordVersionId?: string | null;
    fields: FieldPresence;
    allowGaps?: boolean;
  },
): Promise<GateReview> {
  const gate = gateDefinition(input.gateKey);
  assertScopedPermission(subject, gate.submitPermission);

  const missing = assertReadyToSubmit(gate, input.fields, input.allowGaps ?? false);
  const uc = await loadUseCaseTenant(supabase, input.useCaseId);

  const submittedAt = new Date();
  const slaDue = new Date(submittedAt.getTime() + gate.slaHours * 3_600_000);
  const versionId = input.recordVersionId ?? uc.currentVersionId;

  const { data: reviewRow, error: reviewErr } = await supabase
    .from("decision_gate_reviews")
    .insert({
      organization_id: uc.organizationId,
      workspace_id: uc.workspaceId,
      use_case_id: uc.id,
      gate_key: gate.key,
      status: "submitted",
      submitted_by: userId,
      submitted_at: submittedAt.toISOString(),
      sla_due_at: slaDue.toISOString(),
      record_version_id: versionId,
      decision_authority: gate.decisionAuthority,
      sod_enabled: gate.sodEnabled,
      sla_hours: gate.slaHours,
      missing_inputs: missing,
      created_by: userId,
    })
    .select(REVIEW_SELECT)
    .single();
  if (reviewErr) throw new Error(reviewErr.message);

  const review = rowToReview(reviewRow as Record<string, unknown>);

  const { data: eventRow, error: eventErr } = await supabase
    .from("decision_gate_events")
    .insert({
      review_id: review.id,
      organization_id: review.organizationId,
      workspace_id: review.workspaceId,
      action: "submit",
      actor_id: userId,
      rationale: "Submitted for gate review",
      record_version_id: versionId,
      decision_authority: gate.decisionAuthority,
    })
    .select(EVENT_SELECT)
    .single();
  if (eventErr) throw new Error(eventErr.message);

  await supabase
    .from("decision_gate_reviews")
    .update({ current_event_id: (eventRow as { id: string }).id })
    .eq("id", review.id);

  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: review.organizationId, workspaceId: review.workspaceId },
    },
    {
      event: AUDIT_EVENTS.gateSubmitted,
      entity: { type: "decision_gate_review", id: review.id },
      next: {
        gateKey: review.gateKey,
        action: "submit",
        status: "submitted",
        recordVersionId: versionId,
      },
    },
  );

  return { ...review, currentEventId: (eventRow as { id: string }).id };
}

export async function decideGateReview(
  supabase: Client,
  userId: string,
  subject: PermissionSubject,
  input: {
    reviewId: string;
    action: Exclude<GateAction, "submit">;
    rationale: string;
    conditions?: string[];
    changeRequests?: { fieldKey: string; message: string }[];
    actorKind?: GateActorKind;
  },
): Promise<{ review: GateReview; event: GateEvent; openItems: GateOpenItem[] }> {
  const actorKind = input.actorKind ?? "human";
  assertHumanDecide(actorKind, input.action);
  if (!isDecideAction(input.action)) {
    throw new Error(`Action ${input.action} is not a decide action.`);
  }

  const { data: row, error } = await supabase
    .from("decision_gate_reviews")
    .select(REVIEW_SELECT)
    .eq("id", input.reviewId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Gate review not found.");
  const review = rowToReview(row as Record<string, unknown>);

  const gate = gateDefinition(review.gateKey);
  assertScopedPermission(subject, gate.decidePermission);
  assertGateSod({
    sodEnabled: review.sodEnabled,
    submittedBy: review.submittedBy,
    actorUserId: userId,
  });

  if (
    review.status === "approved" ||
    review.status === "rejected" ||
    review.status === "held"
  ) {
    throw new Error(`Review is already ${review.status} and cannot be decided again.`);
  }

  if (input.action === "approve_with_conditions") {
    if (!input.conditions?.length) {
      throw new Error("Approve with conditions requires at least one condition.");
    }
  }
  if (input.action === "request_changes") {
    if (!input.changeRequests?.length) {
      throw new Error("Request changes requires at least one field-level change request.");
    }
  }

  const nextStatus = statusAfterAction(input.action);
  const conditions = input.conditions ?? [];
  const changeRequests = input.changeRequests ?? [];

  const { data: eventRow, error: eventErr } = await supabase
    .from("decision_gate_events")
    .insert({
      review_id: review.id,
      organization_id: review.organizationId,
      workspace_id: review.workspaceId,
      action: input.action,
      actor_id: userId,
      rationale: input.rationale,
      conditions_snapshot: conditions,
      change_requests_snapshot: changeRequests,
      record_version_id: review.recordVersionId,
      decision_authority: review.decisionAuthority,
    })
    .select(EVENT_SELECT)
    .single();
  if (eventErr) throw new Error(eventErr.message);
  const event = rowToEvent(eventRow as Record<string, unknown>);

  const openItems: GateOpenItem[] = [];
  if (conditions.length) {
    const inserts = conditions.map((body) => ({
      review_id: review.id,
      event_id: event.id,
      organization_id: review.organizationId,
      workspace_id: review.workspaceId,
      kind: "condition" as const,
      field_key: null,
      body,
      status: "open" as const,
      created_by: userId,
    }));
    const { data: items, error: itemErr } = await supabase
      .from("decision_gate_open_items")
      .insert(inserts)
      .select(ITEM_SELECT);
    if (itemErr) throw new Error(itemErr.message);
    for (const i of items ?? []) openItems.push(rowToItem(i as Record<string, unknown>));
  }
  if (changeRequests.length) {
    const inserts = changeRequests.map((cr) => ({
      review_id: review.id,
      event_id: event.id,
      organization_id: review.organizationId,
      workspace_id: review.workspaceId,
      kind: "change_request" as const,
      field_key: cr.fieldKey,
      body: cr.message,
      status: "open" as const,
      created_by: userId,
    }));
    const { data: items, error: itemErr } = await supabase
      .from("decision_gate_open_items")
      .insert(inserts)
      .select(ITEM_SELECT);
    if (itemErr) throw new Error(itemErr.message);
    for (const i of items ?? []) openItems.push(rowToItem(i as Record<string, unknown>));
  }

  const { data: updated, error: updErr } = await supabase
    .from("decision_gate_reviews")
    .update({
      status: nextStatus,
      current_event_id: event.id,
    })
    .eq("id", review.id)
    .select(REVIEW_SELECT)
    .single();
  if (updErr) throw new Error(updErr.message);

  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: review.organizationId, workspaceId: review.workspaceId },
    },
    {
      event: AUDIT_EVENTS.gateDecided,
      entity: { type: "decision_gate_review", id: review.id },
      previous: { status: review.status },
      next: {
        gateKey: review.gateKey,
        action: input.action,
        status: nextStatus,
        recordVersionId: review.recordVersionId,
        decisionAuthority: review.decisionAuthority,
        openItemCount: openItems.length,
      },
    },
  );

  return {
    review: rowToReview(updated as Record<string, unknown>),
    event,
    openItems,
  };
}

export async function closeOpenItem(
  supabase: Client,
  userId: string,
  subject: PermissionSubject,
  input: {
    itemId: string;
    closeNote?: string | null;
    actorKind?: GateActorKind;
  },
): Promise<GateOpenItem> {
  assertHumanClose(input.actorKind ?? "human");
  if (!hasScopedPermission(subject, "decide") && !hasScopedPermission(subject, "review")) {
    assertScopedPermission(subject, "decide");
  }

  const { data: row, error } = await supabase
    .from("decision_gate_open_items")
    .select(ITEM_SELECT)
    .eq("id", input.itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Open item not found.");
  const item = rowToItem(row as Record<string, unknown>);
  if (item.status === "closed") throw new Error("Item is already closed.");

  const { data: updated, error: updErr } = await supabase
    .from("decision_gate_open_items")
    .update({
      status: "closed",
      closed_by: userId,
      closed_at: new Date().toISOString(),
      close_note: input.closeNote ?? null,
    })
    .eq("id", item.id)
    .select(ITEM_SELECT)
    .single();
  if (updErr) throw new Error(updErr.message);

  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: { organizationId: item.organizationId, workspaceId: item.workspaceId },
    },
    {
      event: AUDIT_EVENTS.gateConditionClosed,
      entity: { type: "decision_gate_open_item", id: item.id },
      previous: { status: "open", kind: item.kind },
      next: { status: "closed", kind: item.kind, fieldKey: item.fieldKey },
    },
  );

  return rowToItem(updated as Record<string, unknown>);
}
