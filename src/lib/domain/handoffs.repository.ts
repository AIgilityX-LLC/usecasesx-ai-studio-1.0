/**
 * Suite handoff repository — the single data-access boundary for handoff
 * requests to SARPI, SARN/CyberX C3G, AdvisorX/ConversX and human advisory.
 *
 * Requests are references, never copies: the row stores pointers to the source
 * records plus a version fingerprint, so the receiving side always knows which
 * version of the work the request was raised from.
 *
 * Every write appends an audit event. Status changes are validated against the
 * model's transition table before they reach the database.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { DomainError, unwrapResult } from "./errors";
import {
  AUDIT_EVENTS,
  PRODUCT_EVENTS,
  recordAuditEvent,
  recordAuditEventDetailed,
  recordProductEvent,
  type AuditEventReceipt,
} from "@/lib/telemetry";
import {
  buildConsent,
  buildSourceVersion,
  canTransition,
  HANDOFF_TARGET_META,
  statusNoteRequired,
  validateDraft,
  type HandoffDraft,
  type HandoffRequest,
  type HandoffSourceRef,
  type HandoffStatus,
  type HandoffTarget,
} from "@/lib/handoffs/handoff.model";
import { toStatusEvent, type HandoffStatusEvent } from "@/lib/handoffs/handoff.analytics";

const TABLE = "suite_handoff_requests";

function db() {
  return (supabase as any).from(TABLE);
}

function mapRow(row: any): HandoffRequest {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    organizationId: row.organization_id ?? null,
    target: row.target as HandoffTarget,
    requestType: row.request_type,
    status: row.status as HandoffStatus,
    deliveryMode: row.delivery_mode,
    title: row.title,
    summary: row.summary ?? null,
    requestedBy: row.requested_by,
    ownerUserId: row.owner_user_id ?? null,
    sourceRefs: Array.isArray(row.subject_refs) ? (row.subject_refs as HandoffSourceRef[]) : [],
    sourceVersion: row.source_version ?? null,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    consent: row.consent ?? null,
    sensitivity: row.sensitivity,
    statusNote: row.status_note ?? null,
    dispatchedAt: row.dispatched_at ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------- reads */

export async function listHandoffRequests(
  workspaceId: string,
  options: { target?: HandoffTarget; status?: HandoffStatus; limit?: number } = {},
): Promise<HandoffRequest[]> {
  let query = db()
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (options.target) query = query.eq("target", options.target);
  if (options.status) query = query.eq("status", options.status);
  if (options.limit) query = query.limit(options.limit);
  const rows = (unwrapResult(await query, { allowNull: true }) ?? []) as any[];
  return rows.map(mapRow);
}

/** Requests raised from a specific source record (studio use case, portfolio…). */
export async function listHandoffRequestsForSubject(
  workspaceId: string,
  refType: string,
  refId: string,
): Promise<HandoffRequest[]> {
  const all = await listHandoffRequests(workspaceId);
  return all.filter((request) =>
    request.sourceRefs.some((ref) => ref.type === refType && ref.id === refId),
  );
}

export async function getHandoffRequest(id: string): Promise<HandoffRequest | null> {
  const row = unwrapResult(await db().select("*").eq("id", id).maybeSingle(), {
    allowNull: true,
  }) as any;
  return row ? mapRow(row) : null;
}

/* ------------------------------------------------------------------ writes */

export async function createHandoffRequest(input: {
  workspaceId: string;
  requestedBy: string;
  draft: HandoffDraft;
  appVersion?: string | null;
}): Promise<HandoffRequest> {
  const { draft } = input;
  const validation = validateDraft(draft);
  if (!validation.ok) {
    throw new DomainError(
      "validation",
      "This request is not complete yet. Check the highlighted fields.",
      { details: validation.errors },
    );
  }

  const meta = HANDOFF_TARGET_META[draft.target];
  const sourceVersion = buildSourceVersion(draft.sourceRefs, input.appVersion ?? null);

  const row = unwrapResult(
    await db()
      .insert({
        workspace_id: input.workspaceId,
        requested_by: input.requestedBy,
        target: draft.target,
        request_type: draft.requestType,
        status: "queued",
        // Honest by construction: only a target with a real integration is
        // ever recorded as `endpoint`.
        delivery_mode: meta.connection,
        title: draft.title.trim(),
        summary: draft.summary.trim() || null,
        subject_refs: draft.sourceRefs,
        source_version: sourceVersion,
        payload: draft.payload,
        consent: buildConsent(draft),
        sensitivity: meta.sensitivity,
      })
      .select("*")
      .single(),
  ) as any;

  const request = mapRow(row);

  await recordAuditEvent({
    event: AUDIT_EVENTS.handoffRequested,
    entity: { type: "suite_handoff_request", id: request.id },
    next: {
      target: request.target,
      requestType: request.requestType,
      deliveryMode: request.deliveryMode,
      sensitivity: request.sensitivity,
      sourceFingerprint: request.sourceVersion?.fingerprint ?? null,
      refCount: request.sourceRefs.length,
      consentConfirmed: request.consent?.confirmed ?? false,
    },
    severity: request.sensitivity === "internal" ? "info" : "notice",
    source: "handoffs",
  });

  await recordProductEvent({
    event: PRODUCT_EVENTS.handoffRequested,
    entity: { type: "suite_handoff_request", id: request.id },
    properties: { target: request.target, requestType: request.requestType },
  });

  return request;
}

export async function updateHandoffStatus(input: {
  id: string;
  nextStatus: HandoffStatus;
  note?: string;
  ownerUserId?: string | null;
}): Promise<HandoffRequest> {
  const existing = await getHandoffRequest(input.id);
  if (!existing) throw new DomainError("not_found", "We could not find that request.");

  if (!canTransition(existing.status, input.nextStatus)) {
    throw new DomainError(
      "validation",
      `A request that is ${existing.status.replace("_", " ")} cannot move to ${input.nextStatus.replace("_", " ")}.`,
    );
  }
  if (statusNoteRequired(input.nextStatus) && !input.note?.trim()) {
    throw new DomainError("validation", "Add a reason before declining this request.");
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: input.nextStatus,
    status_note: input.note?.trim() ?? existing.statusNote,
  };
  if (input.ownerUserId !== undefined) patch["owner_user_id"] = input.ownerUserId;
  if (input.nextStatus === "dispatched") patch["dispatched_at"] = now;
  if (input.nextStatus === "completed") patch["completed_at"] = now;

  const row = unwrapResult(await db().update(patch).eq("id", input.id).select("*").single()) as any;
  const updated = mapRow(row);

  await recordAuditEvent({
    event:
      input.nextStatus === "cancelled"
        ? AUDIT_EVENTS.handoffCancelled
        : AUDIT_EVENTS.handoffStatusChanged,
    entity: { type: "suite_handoff_request", id: updated.id },
    previous: { status: existing.status, ownerUserId: existing.ownerUserId },
    next: {
      status: updated.status,
      ownerUserId: updated.ownerUserId,
      note: updated.statusNote,
    },
    severity: input.nextStatus === "declined" ? "notice" : "info",
    source: "handoffs",
  });

  if (input.nextStatus === "completed") {
    await recordProductEvent({
      event: PRODUCT_EVENTS.handoffCompleted,
      entity: { type: "suite_handoff_request", id: updated.id },
      properties: { target: updated.target },
    });
  }

  return updated;
}

export async function assignHandoffOwner(id: string, ownerUserId: string | null) {
  const row = unwrapResult(
    await db().update({ owner_user_id: ownerUserId }).eq("id", id).select("*").single(),
  ) as any;
  await recordAuditEvent({
    event: AUDIT_EVENTS.handoffStatusChanged,
    entity: { type: "suite_handoff_request", id },
    next: { ownerUserId },
    source: "handoffs",
  });
  return mapRow(row);
}

/* -------------------------------------------------------- status history */

/**
 * Recorded status moves for the workspace's handoff requests, read back from
 * the append-only audit log. Analytics never invent a transition: if it is not
 * in `audit_events`, it did not happen as far as this surface is concerned.
 */
export async function listHandoffStatusEvents(
  workspaceId: string,
  options: { sinceDays?: number; limit?: number } = {},
): Promise<HandoffStatusEvent[]> {
  const since = new Date(
    Date.now() - Math.max(1, options.sinceDays ?? 30) * 86_400_000,
  ).toISOString();
  const rows =
    (unwrapResult(
      await supabase
        .from("audit_events")
        .select("entity_id, created_at, previous_value, new_value, actor_id, event_type")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "suite_handoff_request")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(options.limit ?? 1000),
      { allowNull: true },
    ) as any[] | null) ?? [];
  return rows.map((row) => toStatusEvent(row));
}

/* ----------------------------------------------------------- bulk actions */

export type BulkStatusOutcome = {
  updated: HandoffRequest[];
  skipped: { id: string; title: string; reason: string }[];
};

/**
 * Apply one status move across many requests. Each request is validated
 * individually against the transition table, so an illegal move on one row
 * never silently corrupts the rest of the selection — it is reported back.
 */
export async function bulkUpdateHandoffStatus(input: {
  requests: HandoffRequest[];
  nextStatus: HandoffStatus;
  note?: string;
}): Promise<BulkStatusOutcome> {
  const outcome: BulkStatusOutcome = { updated: [], skipped: [] };
  if (statusNoteRequired(input.nextStatus) && !input.note?.trim()) {
    throw new DomainError("validation", "Add a reason before declining these requests.");
  }
  for (const request of input.requests) {
    if (!canTransition(request.status, input.nextStatus)) {
      outcome.skipped.push({
        id: request.id,
        title: request.title,
        reason: `Cannot move from ${request.status.replace("_", " ")}.`,
      });
      continue;
    }
    try {
      outcome.updated.push(
        await updateHandoffStatus({
          id: request.id,
          nextStatus: input.nextStatus,
          note: input.note ?? "",
        }),
      );
    } catch (error) {
      outcome.skipped.push({
        id: request.id,
        title: request.title,
        reason: error instanceof Error ? error.message : "Update failed.",
      });
    }
  }
  return outcome;
}

/* --------------------------------------------------------- export receipt */

/**
 * Append the audit row behind a single-request export and hand the caller its
 * identity, so the surface can show a receipt that points at the real record.
 */
export async function recordHandoffExport(input: {
  request: HandoffRequest;
  format: "pdf" | "csv";
  fileName: string | null;
  outcome: "completed" | "denied";
  deniedReason?: string | null;
  workspaceRole: string | null;
  provenance: string[];
}): Promise<AuditEventReceipt> {
  return recordAuditEventDetailed({
    event: AUDIT_EVENTS.exportGenerated,
    entity: { type: "suite_handoff_request", id: input.request.id },
    next: {
      format: input.format,
      filename: input.fileName,
      outcome: input.outcome,
      deniedReason: input.deniedReason ?? null,
      role: input.workspaceRole,
      target: input.request.target,
      status: input.request.status,
      sourceFingerprint: input.request.sourceVersion?.fingerprint ?? null,
      consentConfirmed: input.request.consent?.confirmed ?? false,
      provenance: input.provenance,
    },
    severity: input.outcome === "denied" ? "warning" : "info",
    source: "handoffs",
  });
}
