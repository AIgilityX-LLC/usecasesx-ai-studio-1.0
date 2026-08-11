/**
 * Observability reads and writes — server-only.
 *
 * Everything here runs through the caller's RLS-scoped client, so a workspace
 * admin sees their workspace and nobody else's: the `audit_events` and
 * `ai_usage_events` policies are the boundary, not a filter written here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAuditEvent } from "@/lib/telemetry/recorder.server";
import {
  aggregateAiUsage,
  evaluateAlerts,
  evaluateRetryShield,
  EXPORT_AUDIT_EVENTS,
  OBSERVABILITY_EVENTS,
  outcomeFromEvent,
  RETRY_SHIELD,
  SECURITY_SIGNAL_EVENTS,
  type AiUsageAnalytics,
  type AiUsageRow,
  type ExportAuditRow,
  type RateLimitCounts,
  type SecurityAlert,
  type SecuritySignal,
  type ShieldVerdict,
} from "./observability.model";

type Client = SupabaseClient<any, any, any>;

const MAX_ROWS = 500;
const MAX_USAGE_ROWS = 5000;

/* --------------------------------------------------------------- writers */

export type ExportOutcome = "downloaded" | "denied" | "throttled";

/**
 * Append one export/download record. Called on the allow *and* the deny path so
 * the trail answers "who took what out of this workspace, and who was refused".
 */
export async function recordExportEvent(
  supabase: Client,
  userId: string,
  input: {
    outcome: ExportOutcome;
    format: string;
    workspaceId: string | null;
    organizationId?: string | null;
    subject?: string | null;
    entity?: { type: string; id?: string | null };
    reason?: string | null;
    requestId?: string | null;
    role?: string | null;
  },
): Promise<string> {
  const event =
    input.outcome === "downloaded"
      ? OBSERVABILITY_EVENTS.exportDownloaded
      : input.outcome === "throttled"
        ? OBSERVABILITY_EVENTS.exportThrottled
        : OBSERVABILITY_EVENTS.exportDenied;

  return writeAuditEvent(
    {
      supabase,
      userId,
      tenant: {
        organizationId: input.organizationId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
      requestId: input.requestId ?? null,
    },
    {
      event,
      entity: input.entity ?? { type: "report_export", id: null },
      next: {
        format: input.format,
        subject: input.subject ?? null,
        reason: input.reason ?? null,
        role: input.role ?? null,
      },
      severity: input.outcome === "downloaded" ? "info" : "warning",
      source: "export",
      workspaceId: input.workspaceId ?? null,
      organizationId: input.organizationId ?? null,
    },
  );
}

/** Record a refused storage action (MIME/size block, or a denied signed URL). */
export async function recordStorageDenied(
  supabase: Client,
  userId: string,
  input: {
    bucket: string;
    reason: string;
    path?: string | null;
    crossWorkspace?: boolean;
    workspaceId?: string | null;
    organizationId?: string | null;
  },
): Promise<void> {
  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: {
        organizationId: input.organizationId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    },
    {
      event: input.crossWorkspace
        ? OBSERVABILITY_EVENTS.crossWorkspaceAttempt
        : OBSERVABILITY_EVENTS.storageDenied,
      entity: { type: "storage_object", id: null },
      next: { bucket: input.bucket, reason: input.reason, path: input.path ?? null },
      severity: input.crossWorkspace ? "critical" : "warning",
      source: "storage",
      workspaceId: input.workspaceId ?? null,
      organizationId: input.organizationId ?? null,
    },
  );
}

/** Record an enforced AI rate limit (burst window or daily fair use). */
export async function recordRateLimitEnforced(
  supabase: Client,
  userId: string,
  input: {
    task: string;
    kind: "burst" | "fair_use";
    used: number;
    limit: number;
    resetsAt: string;
    workspaceId?: string | null;
    organizationId?: string | null;
  },
): Promise<void> {
  await writeAuditEvent(
    {
      supabase,
      userId,
      tenant: {
        organizationId: input.organizationId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    },
    {
      event: OBSERVABILITY_EVENTS.rateLimitEnforced,
      entity: { type: "ai_task", id: null },
      next: {
        task: input.task,
        kind: input.kind,
        used: input.used,
        limit: input.limit,
        resets_at: input.resetsAt,
      },
      severity: "notice",
      source: "ai",
      workspaceId: input.workspaceId ?? null,
      organizationId: input.organizationId ?? null,
    },
  );
}

/* ---------------------------------------------------------- retry shield */

/**
 * Cheap cooldown after repeated refusals. Counted from the caller's own audit
 * rows (which they can always read), so it survives across workers without any
 * in-memory state.
 */
export async function exportRetryShield(
  supabase: Client,
  userId: string,
): Promise<ShieldVerdict> {
  const since = new Date(Date.now() - RETRY_SHIELD.windowSeconds * 1000).toISOString();
  const { data, error } = await supabase
    .from("audit_events")
    .select("created_at")
    .eq("actor_id", userId)
    .in("event_type", [OBSERVABILITY_EVENTS.exportDenied, OBSERVABILITY_EVENTS.exportThrottled])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return { blocked: false, failures: 0 };
  return evaluateRetryShield(data.map((r: any) => r.created_at as string));
}

/* ----------------------------------------------------------- name lookups */

async function displayNames(
  supabase: Client,
  workspaceId: string | null,
  userIds: string[],
): Promise<Record<string, string>> {
  if (!workspaceId || userIds.length === 0) return {};
  const { data, error } = await supabase.rpc("workspace_display_names", {
    _workspace_id: workspaceId,
    _user_ids: userIds,
  });
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data as any[]) {
    if (row?.user_id) out[row.user_id as string] = (row.full_name as string) || "Workspace member";
  }
  return out;
}

async function workspaceNames(
  supabase: Client,
  ids: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("workspaces").select("id, name").in("id", unique);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as any[]) out[row.id as string] = (row.name as string) ?? "Workspace";
  return out;
}

/* -------------------------------------------------------------- readers */

export type ExportAuditResult = {
  rows: ExportAuditRow[];
  windowDays: number;
};

export async function listExportAudit(
  supabase: Client,
  workspaceId: string | null,
  windowDays: number,
): Promise<ExportAuditResult> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("audit_events")
    .select(
      "id, created_at, actor_id, workspace_id, event_type, entity_type, entity_id, new_value, request_id",
    )
    .in("event_type", EXPORT_AUDIT_EVENTS as string[])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;

  const raw = (data ?? []) as any[];
  const [names, wsNames] = await Promise.all([
    displayNames(
      supabase,
      workspaceId,
      [...new Set(raw.map((r) => r.actor_id).filter(Boolean))] as string[],
    ),
    workspaceNames(supabase, raw.map((r) => r.workspace_id).filter(Boolean) as string[]),
  ]);

  const rows: ExportAuditRow[] = raw.map((r) => {
    const payload = (r.new_value ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      at: r.created_at as string,
      actorId: (r.actor_id as string | null) ?? null,
      actorName: names[r.actor_id as string] ?? "Workspace member",
      workspaceId: (r.workspace_id as string | null) ?? null,
      workspaceName: wsNames[r.workspace_id as string] ?? "—",
      outcome: outcomeFromEvent(r.event_type as string),
      eventType: r.event_type as string,
      format: (payload.format as string | null) ?? null,
      subject:
        (payload.subject as string | null) ??
        (payload.kind as string | null) ??
        (payload.title as string | null) ??
        null,
      entityType: (r.entity_type as string | null) ?? null,
      entityId: (r.entity_id as string | null) ?? null,
      reason: (payload.reason as string | null) ?? null,
      requestId: (r.request_id as string | null) ?? null,
    };
  });

  return { rows, windowDays };
}

export async function aiUsageAnalytics(
  supabase: Client,
  workspaceId: string | null,
  windowDays: number,
): Promise<AiUsageAnalytics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: usage, error }, { data: limitRows }] = await Promise.all([
    supabase
      .from("ai_usage_events")
      .select(
        "user_id, workspace_id, status, error_kind, prompt_tokens, completion_tokens, total_tokens, task, model, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_USAGE_ROWS),
    supabase
      .from("audit_events")
      .select("actor_id, workspace_id")
      .eq("event_type", OBSERVABILITY_EVENTS.rateLimitEnforced)
      .gte("created_at", since)
      .limit(MAX_ROWS),
  ]);
  if (error) throw error;

  const rows: AiUsageRow[] = ((usage ?? []) as any[]).map((r) => ({
    userId: (r.user_id as string | null) ?? null,
    workspaceId: (r.workspace_id as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    errorKind: (r.error_kind as string | null) ?? null,
    promptTokens: (r.prompt_tokens as number | null) ?? null,
    completionTokens: (r.completion_tokens as number | null) ?? null,
    totalTokens: (r.total_tokens as number | null) ?? null,
    task: (r.task as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    createdAt: r.created_at as string,
  }));

  const rateLimits: RateLimitCounts = { byUser: {}, byWorkspace: {}, total: 0 };
  for (const row of (limitRows ?? []) as any[]) {
    rateLimits.total += 1;
    if (row.actor_id)
      rateLimits.byUser[row.actor_id as string] =
        (rateLimits.byUser[row.actor_id as string] ?? 0) + 1;
    if (row.workspace_id)
      rateLimits.byWorkspace[row.workspace_id as string] =
        (rateLimits.byWorkspace[row.workspace_id as string] ?? 0) + 1;
  }

  const userIds = [
    ...new Set([
      ...rows.map((r) => r.userId).filter(Boolean),
      ...Object.keys(rateLimits.byUser),
    ]),
  ] as string[];

  const [userNames, wsNames] = await Promise.all([
    displayNames(supabase, workspaceId, userIds),
    workspaceNames(supabase, [
      ...(rows.map((r) => r.workspaceId).filter(Boolean) as string[]),
      ...Object.keys(rateLimits.byWorkspace),
    ]),
  ]);

  return aggregateAiUsage(rows, {
    windowDays,
    userNames,
    workspaceNames: wsNames,
    rateLimits,
  });
}

export type SecurityAlertResult = {
  alerts: SecurityAlert[];
  signals: SecuritySignal[];
  windowDays: number;
};

export async function securityAlerts(
  supabase: Client,
  workspaceId: string | null,
  windowDays: number,
): Promise<SecurityAlertResult> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("audit_events")
    .select("id, created_at, actor_id, workspace_id, event_type, severity, new_value, request_id")
    .in("event_type", SECURITY_SIGNAL_EVENTS as string[])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;

  const raw = (data ?? []) as any[];
  const names = await displayNames(
    supabase,
    workspaceId,
    [...new Set(raw.map((r) => r.actor_id).filter(Boolean))] as string[],
  );

  const signals: SecuritySignal[] = raw.map((r) => {
    const payload = (r.new_value ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      at: r.created_at as string,
      eventType: r.event_type as string,
      actorId: (r.actor_id as string | null) ?? null,
      actorName: names[r.actor_id as string] ?? "Workspace member",
      workspaceId: (r.workspace_id as string | null) ?? null,
      severity: (r.severity as string | null) ?? "info",
      detail:
        (payload.reason as string | null) ??
        (payload.kind as string | null) ??
        (payload.task as string | null) ??
        null,
      requestId: (r.request_id as string | null) ?? null,
    };
  });

  return { alerts: evaluateAlerts(signals), signals, windowDays };
}

/* -------------------------------------------------------- authorization */

export type ObservabilityAccess =
  | { authorized: true; workspaceId: string | null; role: string | null; scope: string }
  | { authorized: false; reason: string };

/**
 * Only workspace owners/admins (or platform staff) may read the workspace-wide
 * trails. RLS already refuses the rows; this gives the UI an honest message
 * instead of a silently empty table.
 */
export async function observabilityAccess(
  supabase: Client,
  userId: string,
): Promise<ObservabilityAccess> {
  const { resolveSubject } = await import("@/lib/authz.server");
  try {
    const subject = await resolveSubject(supabase, userId);
    const role = subject.workspaceRole ?? null;
    const isWorkspaceAdmin = role === "owner" || role === "admin";
    if (!isWorkspaceAdmin && !subject.isPlatformAdmin) {
      return {
        authorized: false,
        reason:
          "Export and AI activity trails are visible to workspace owners and admins. Ask an admin in your workspace for access.",
      };
    }
    return {
      authorized: true,
      workspaceId: subject.workspaceId,
      role: subject.isPlatformAdmin ? (role ?? "platform_admin") : role,
      scope: subject.isPlatformAdmin && !isWorkspaceAdmin ? "platform" : "workspace",
    };
  } catch {
    return { authorized: false, reason: "We could not verify your workspace access." };
  }
}
