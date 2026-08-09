/**
 * Suite handoff analytics — pure aggregation over requests and their recorded
 * status audit events.
 *
 * Nothing here queries a database or invents a number. Every figure is derived
 * from rows the workspace already owns: the requests themselves and the
 * append-only audit records of their status changes. When a signal cannot be
 * derived (no audit history, no source version), the analytics say so instead
 * of estimating.
 */

import {
  HANDOFF_STATUSES,
  HANDOFF_STATUS_META,
  HANDOFF_TARGETS,
  HANDOFF_TARGET_META,
  isTerminalStatus,
  sourceHasDrifted,
  type HandoffRequest,
  type HandoffStatus,
  type HandoffTarget,
} from "./handoff.model";

/* ------------------------------------------------------------------ inputs */

/**
 * One recorded status move, read from `audit_events`. `from` is null when the
 * audit row did not carry a previous value (e.g. the creation event).
 */
export type HandoffStatusEvent = {
  requestId: string | null;
  at: string;
  from: HandoffStatus | null;
  to: HandoffStatus | null;
  actorId: string | null;
};

export type HandoffAnalyticsOptions = {
  /** Size of the trend window in days, counted back from `now`. */
  days?: number;
  now?: Date;
  /** A queued/in-review request older than this is flagged as stalled. */
  staleAfterDays?: number;
};

/* ----------------------------------------------------------------- outputs */

export type TargetCount = {
  target: HandoffTarget;
  label: string;
  total: number;
  open: number;
  completed: number;
  declined: number;
};

export type TransitionDay = {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  total: number;
  byStatus: Record<HandoffStatus, number>;
};

export const HANDOFF_WARNING_TYPES = [
  "source_drift",
  "missing_source_version",
  "unversioned_reference",
  "no_reference",
  "consent_missing",
  "stalled_open",
] as const;
export type HandoffWarningType = (typeof HANDOFF_WARNING_TYPES)[number];

export const HANDOFF_WARNING_META: Record<
  HandoffWarningType,
  { label: string; explanation: string; severity: "warning" | "notice" }
> = {
  source_drift: {
    label: "Source changed after the request",
    explanation:
      "The referenced records no longer match the fingerprint captured when the request was raised.",
    severity: "warning",
  },
  missing_source_version: {
    label: "No source version captured",
    explanation: "The request has no fingerprint, so drift cannot be detected for it.",
    severity: "warning",
  },
  unversioned_reference: {
    label: "Reference without a version",
    explanation:
      "At least one referenced record exposed no version, weakening the provenance of the request.",
    severity: "notice",
  },
  no_reference: {
    label: "Request with no references",
    explanation: "Nothing was referenced, so the receiving side has no context to read.",
    severity: "warning",
  },
  consent_missing: {
    label: "Consent not confirmed",
    explanation:
      "A confidential or restricted request was stored without a confirmed consent record.",
    severity: "warning",
  },
  stalled_open: {
    label: "Open with no recent movement",
    explanation: "The request is still open and has not changed status inside the trend window.",
    severity: "notice",
  },
};

export type WarningCount = {
  type: HandoffWarningType;
  label: string;
  explanation: string;
  severity: "warning" | "notice";
  count: number;
  requestIds: string[];
};

export type HandoffAnalytics = {
  windowDays: number;
  from: string;
  to: string;
  total: number;
  open: number;
  completed: number;
  byTarget: TargetCount[];
  byStatus: { status: HandoffStatus; label: string; count: number }[];
  transitions: TransitionDay[];
  /** Total status moves recorded inside the window. */
  transitionCount: number;
  warnings: WarningCount[];
  /** Median hours from raised to completed, or null when nothing completed. */
  medianHoursToComplete: number | null;
};

/* --------------------------------------------------------------- utilities */

function isoDay(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function emptyStatusMap(): Record<HandoffStatus, number> {
  return Object.fromEntries(HANDOFF_STATUSES.map((s) => [s, 0])) as Record<HandoffStatus, number>;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);
  return Math.round(raw * 10) / 10;
}

/** Read a status audit row into the shape the analytics expect. */
export function toStatusEvent(row: {
  entity_id?: string | null;
  created_at?: string | null;
  previous_value?: unknown;
  new_value?: unknown;
  actor_id?: string | null;
}): HandoffStatusEvent {
  const prev = (row.previous_value ?? null) as { status?: string } | null;
  const next = (row.new_value ?? null) as { status?: string } | null;
  const known = (value: string | undefined): HandoffStatus | null =>
    value && (HANDOFF_STATUSES as readonly string[]).includes(value)
      ? (value as HandoffStatus)
      : null;
  return {
    requestId: row.entity_id ?? null,
    at: row.created_at ?? new Date().toISOString(),
    from: known(prev?.status),
    to: known(next?.status),
    actorId: row.actor_id ?? null,
  };
}

/* -------------------------------------------------------------- aggregation */

export function buildHandoffAnalytics(
  requests: HandoffRequest[],
  events: HandoffStatusEvent[] = [],
  options: HandoffAnalyticsOptions = {},
): HandoffAnalytics {
  const windowDays = Math.max(1, options.days ?? 30);
  const staleAfterDays = Math.max(1, options.staleAfterDays ?? 14);
  const now = options.now ?? new Date();
  const from = new Date(now.getTime() - (windowDays - 1) * 86_400_000);

  /* counts by target */
  const byTarget: TargetCount[] = HANDOFF_TARGETS.map((target) => {
    const scoped = requests.filter((r) => r.target === target);
    return {
      target,
      label: HANDOFF_TARGET_META[target].label,
      total: scoped.length,
      open: scoped.filter((r) => !isTerminalStatus(r.status)).length,
      completed: scoped.filter((r) => r.status === "completed").length,
      declined: scoped.filter((r) => r.status === "declined").length,
    };
  });

  const statusTally = emptyStatusMap();
  for (const request of requests) {
    if (statusTally[request.status] !== undefined) statusTally[request.status] += 1;
  }

  /* status transitions over time — one bucket per day in the window */
  const buckets = new Map<string, TransitionDay>();
  for (let i = 0; i < windowDays; i += 1) {
    const date = isoDay(new Date(from.getTime() + i * 86_400_000));
    buckets.set(date, { date, total: 0, byStatus: emptyStatusMap() });
  }
  let transitionCount = 0;
  for (const event of events) {
    if (!event.to) continue;
    const bucket = buckets.get(isoDay(event.at));
    if (!bucket) continue;
    bucket.total += 1;
    bucket.byStatus[event.to] += 1;
    transitionCount += 1;
  }
  const transitions = [...buckets.values()];

  /* drift / provenance warnings */
  const movedIds = new Set(events.filter((e) => e.to).map((e) => e.requestId));
  const collected = new Map<HandoffWarningType, string[]>();
  const flag = (type: HandoffWarningType, id: string) => {
    const list = collected.get(type) ?? [];
    list.push(id);
    collected.set(type, list);
  };

  for (const request of requests) {
    if (request.sourceRefs.length === 0) flag("no_reference", request.id);
    if (!request.sourceVersion?.fingerprint) flag("missing_source_version", request.id);
    else if (sourceHasDrifted(request.sourceVersion, request.sourceRefs))
      flag("source_drift", request.id);
    if (request.sourceRefs.some((ref) => !ref.version)) flag("unversioned_reference", request.id);
    if (request.sensitivity !== "internal" && !request.consent?.confirmed)
      flag("consent_missing", request.id);
    const ageDays = (now.getTime() - new Date(request.createdAt).getTime()) / 86_400_000;
    if (!isTerminalStatus(request.status) && ageDays > staleAfterDays && !movedIds.has(request.id))
      flag("stalled_open", request.id);
  }

  const warnings: WarningCount[] = HANDOFF_WARNING_TYPES.map((type) => {
    const ids = collected.get(type) ?? [];
    return {
      type,
      label: HANDOFF_WARNING_META[type].label,
      explanation: HANDOFF_WARNING_META[type].explanation,
      severity: HANDOFF_WARNING_META[type].severity,
      count: ids.length,
      requestIds: ids,
    };
  })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const durations = requests
    .filter((r) => r.completedAt)
    .map(
      (r) =>
        (new Date(r.completedAt as string).getTime() - new Date(r.createdAt).getTime()) / 3_600_000,
    )
    .filter((hours) => Number.isFinite(hours) && hours >= 0);

  return {
    windowDays,
    from: isoDay(from),
    to: isoDay(now),
    total: requests.length,
    open: requests.filter((r) => !isTerminalStatus(r.status)).length,
    completed: requests.filter((r) => r.status === "completed").length,
    byTarget,
    byStatus: HANDOFF_STATUSES.map((status) => ({
      status,
      label: HANDOFF_STATUS_META[status].label,
      count: statusTally[status],
    })),
    transitions,
    transitionCount,
    warnings,
    medianHoursToComplete: median(durations),
  };
}
