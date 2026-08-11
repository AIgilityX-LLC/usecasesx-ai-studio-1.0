/**
 * Observability model — client-safe vocabulary and pure helpers for the
 * export/download audit trail, AI usage analytics, the security alert
 * thresholds and the export retry shield.
 *
 * No transport, no database client, no secrets: the same rules are applied by
 * the server enforcement point and by the admin surface that displays them.
 */

/* -------------------------------------------------------- event vocabulary */

/** Audit events that make up the export/download and abuse signal streams. */
export const OBSERVABILITY_EVENTS = {
  exportDownloaded: "export.downloaded",
  exportDenied: "export.denied",
  exportThrottled: "export.throttled",
  storageDenied: "storage.denied",
  crossWorkspaceAttempt: "access.cross_workspace_attempt",
  rateLimitEnforced: "ai.rate_limit_enforced",
} as const;

export type ObservabilityEvent =
  (typeof OBSERVABILITY_EVENTS)[keyof typeof OBSERVABILITY_EVENTS];

/** Events shown on the export/download audit log. */
export const EXPORT_AUDIT_EVENTS: readonly string[] = [
  OBSERVABILITY_EVENTS.exportDownloaded,
  OBSERVABILITY_EVENTS.exportDenied,
  OBSERVABILITY_EVENTS.exportThrottled,
  "export.generated",
  "report.generated",
];

/** Events that feed the abuse/security alert panel. */
export const SECURITY_SIGNAL_EVENTS: readonly string[] = [
  OBSERVABILITY_EVENTS.crossWorkspaceAttempt,
  OBSERVABILITY_EVENTS.storageDenied,
  OBSERVABILITY_EVENTS.exportDenied,
  OBSERVABILITY_EVENTS.rateLimitEnforced,
];

/* --------------------------------------------------------- retry shield */

/**
 * Repeated authorization failures on an export are either a broken client or a
 * probe. Either way the answer is the same: refuse cheaply for a short while
 * instead of re-running role, membership and entitlement resolution per click.
 */
export const RETRY_SHIELD = {
  /** Window in which failures are counted. */
  windowSeconds: 5 * 60,
  /** Failures inside the window before the cooldown engages. */
  maxFailures: 3,
  /** Cooldown measured from the most recent failure. */
  cooldownSeconds: 90,
} as const;

export type ShieldVerdict =
  | { blocked: false; failures: number }
  | { blocked: true; failures: number; retryAfterSeconds: number; reason: string };

export function shieldMessage(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  return `Too many refused download attempts. Try again in ${seconds}s — if you believe you should have access, ask a workspace admin to check your role and plan.`;
}

/**
 * Decide the shield verdict from failure timestamps (newest first or any order).
 * Pure so the unit tests and the server share one definition.
 */
export function evaluateRetryShield(
  failureTimestamps: readonly (string | number | Date)[],
  now: number = Date.now(),
): ShieldVerdict {
  const windowStart = now - RETRY_SHIELD.windowSeconds * 1000;
  const times = failureTimestamps
    .map((t) => new Date(t).getTime())
    .filter((t) => Number.isFinite(t) && t >= windowStart)
    .sort((a, b) => b - a);

  if (times.length < RETRY_SHIELD.maxFailures) return { blocked: false, failures: times.length };

  const latest = times[0] ?? now;
  const elapsed = (now - latest) / 1000;
  const remaining = RETRY_SHIELD.cooldownSeconds - elapsed;
  if (remaining <= 0) return { blocked: false, failures: times.length };

  return {
    blocked: true,
    failures: times.length,
    retryAfterSeconds: Math.ceil(remaining),
    reason: shieldMessage(remaining),
  };
}

/* ------------------------------------------------------ export audit rows */

export type ExportAuditRow = {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string;
  workspaceId: string | null;
  workspaceName: string;
  outcome: "downloaded" | "denied" | "throttled";
  eventType: string;
  /** csv / pdf / roadmap-json … */
  format: string | null;
  /** Report kind or the use case / portfolio the artefact covers. */
  subject: string | null;
  entityType: string | null;
  entityId: string | null;
  reason: string | null;
  requestId: string | null;
};

export function outcomeLabel(outcome: ExportAuditRow["outcome"]): string {
  if (outcome === "downloaded") return "Downloaded";
  if (outcome === "throttled") return "Throttled";
  return "Denied";
}

export function outcomeFromEvent(eventType: string): ExportAuditRow["outcome"] {
  if (eventType === OBSERVABILITY_EVENTS.exportDenied) return "denied";
  if (eventType === OBSERVABILITY_EVENTS.exportThrottled) return "throttled";
  return "downloaded";
}

/* ------------------------------------------------------- AI usage analytics */

export type AiUsageBucket = {
  key: string;
  label: string;
  prompts: number;
  failures: number;
  /** Token spend proxy: total tokens observed for the bucket. */
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  /** Rate-limit / fair-use refusals recorded against this bucket. */
  rateLimited: number;
  lastAt: string | null;
};

export type AiUsageRow = {
  userId: string | null;
  workspaceId: string | null;
  status: string | null;
  errorKind: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  task: string | null;
  model: string | null;
  createdAt: string;
};

export type AiUsageAnalytics = {
  windowDays: number;
  totals: Omit<AiUsageBucket, "key" | "label">;
  byUser: AiUsageBucket[];
  byWorkspace: AiUsageBucket[];
  byTask: AiUsageBucket[];
  failureKinds: { kind: string; count: number }[];
};

function emptyBucket(key: string, label: string): AiUsageBucket {
  return {
    key,
    label,
    prompts: 0,
    failures: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    rateLimited: 0,
    lastAt: null,
  };
}

function addRow(bucket: AiUsageBucket, row: AiUsageRow): void {
  bucket.prompts += 1;
  if (row.status !== "ok") bucket.failures += 1;
  bucket.promptTokens += row.promptTokens ?? 0;
  bucket.completionTokens += row.completionTokens ?? 0;
  bucket.totalTokens += row.totalTokens ?? (row.promptTokens ?? 0) + (row.completionTokens ?? 0);
  if (!bucket.lastAt || row.createdAt > bucket.lastAt) bucket.lastAt = row.createdAt;
}

/** Rate-limit refusals keyed by user id and by workspace id. */
export type RateLimitCounts = {
  byUser: Record<string, number>;
  byWorkspace: Record<string, number>;
  total: number;
};

/**
 * Aggregate raw usage rows into the per-user / per-workspace / per-task view.
 * Names are resolved by the caller and passed in as a lookup.
 */
export function aggregateAiUsage(
  rows: readonly AiUsageRow[],
  options: {
    windowDays: number;
    userNames?: Record<string, string>;
    workspaceNames?: Record<string, string>;
    rateLimits?: RateLimitCounts;
  },
): AiUsageAnalytics {
  const byUser = new Map<string, AiUsageBucket>();
  const byWorkspace = new Map<string, AiUsageBucket>();
  const byTask = new Map<string, AiUsageBucket>();
  const failureKinds = new Map<string, number>();
  const totals = emptyBucket("totals", "All activity");

  for (const row of rows) {
    addRow(totals, row);

    const userKey = row.userId ?? "unknown";
    const userBucket =
      byUser.get(userKey) ??
      emptyBucket(userKey, options.userNames?.[userKey] ?? "Workspace member");
    addRow(userBucket, row);
    byUser.set(userKey, userBucket);

    const wsKey = row.workspaceId ?? "none";
    const wsBucket =
      byWorkspace.get(wsKey) ??
      emptyBucket(
        wsKey,
        options.workspaceNames?.[wsKey] ?? (wsKey === "none" ? "No workspace" : "Workspace"),
      );
    addRow(wsBucket, row);
    byWorkspace.set(wsKey, wsBucket);

    const taskKey = row.task ?? "unknown";
    const taskBucket = byTask.get(taskKey) ?? emptyBucket(taskKey, taskKey);
    addRow(taskBucket, row);
    byTask.set(taskKey, taskBucket);

    if (row.status !== "ok") {
      const kind = row.errorKind ?? "unknown";
      failureKinds.set(kind, (failureKinds.get(kind) ?? 0) + 1);
    }
  }

  const limits = options.rateLimits;
  if (limits) {
    totals.rateLimited = limits.total;
    for (const [userId, count] of Object.entries(limits.byUser)) {
      const bucket =
        byUser.get(userId) ??
        emptyBucket(userId, options.userNames?.[userId] ?? "Workspace member");
      bucket.rateLimited += count;
      byUser.set(userId, bucket);
    }
    for (const [workspaceId, count] of Object.entries(limits.byWorkspace)) {
      const bucket =
        byWorkspace.get(workspaceId) ??
        emptyBucket(workspaceId, options.workspaceNames?.[workspaceId] ?? "Workspace");
      bucket.rateLimited += count;
      byWorkspace.set(workspaceId, bucket);
    }
  }

  const sorted = (map: Map<string, AiUsageBucket>) =>
    [...map.values()].sort((a, b) => b.prompts - a.prompts || b.rateLimited - a.rateLimited);

  return {
    windowDays: options.windowDays,
    totals: {
      prompts: totals.prompts,
      failures: totals.failures,
      totalTokens: totals.totalTokens,
      promptTokens: totals.promptTokens,
      completionTokens: totals.completionTokens,
      rateLimited: totals.rateLimited,
      lastAt: totals.lastAt,
    },
    byUser: sorted(byUser),
    byWorkspace: sorted(byWorkspace),
    byTask: sorted(byTask),
    failureKinds: [...failureKinds.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/* ------------------------------------------------------------ alerting */

/**
 * Alert thresholds. Deliberately conservative: an admin should hear about a
 * pattern, not about a single mistyped URL.
 */
export const ALERT_RULES = [
  {
    id: "cross_workspace",
    events: [OBSERVABILITY_EVENTS.crossWorkspaceAttempt],
    threshold: 1,
    windowHours: 24,
    severity: "critical" as const,
    title: "Cross-workspace access attempts",
    guidance:
      "A signed-in user tried to read or write records outside their workspace. Review the actors below and confirm their membership and role.",
  },
  {
    id: "storage_blocked",
    events: [OBSERVABILITY_EVENTS.storageDenied],
    threshold: 5,
    windowHours: 24,
    severity: "warning" as const,
    title: "Repeated storage blocks",
    guidance:
      "Uploads or file links were refused repeatedly. Usually a client bug or an unsupported file type; a burst from one actor may be probing.",
  },
  {
    id: "export_denied",
    events: [OBSERVABILITY_EVENTS.exportDenied, OBSERVABILITY_EVENTS.exportThrottled],
    threshold: 5,
    windowHours: 24,
    severity: "warning" as const,
    title: "Repeated export refusals",
    guidance:
      "Export authorization failed repeatedly. Check whether a member is missing a role or plan entitlement they need.",
  },
  {
    id: "ai_rate_limited",
    events: [OBSERVABILITY_EVENTS.rateLimitEnforced],
    threshold: 10,
    windowHours: 24,
    severity: "notice" as const,
    title: "AI rate limits enforced",
    guidance:
      "Fair-use or burst limits refused generations. Sustained volume can indicate scripted use or an unhealthy retry loop.",
  },
] as const;

export type AlertRuleId = (typeof ALERT_RULES)[number]["id"];

export type SecuritySignal = {
  id: string;
  at: string;
  eventType: string;
  actorId: string | null;
  actorName: string;
  workspaceId: string | null;
  severity: string;
  detail: string | null;
  requestId: string | null;
};

export type SecurityAlert = {
  id: AlertRuleId;
  title: string;
  guidance: string;
  severity: "critical" | "warning" | "notice";
  count: number;
  threshold: number;
  windowHours: number;
  triggered: boolean;
  actors: { actorId: string | null; actorName: string; count: number }[];
  lastAt: string | null;
};

/** Evaluate every alert rule against the recent signal stream. */
export function evaluateAlerts(
  signals: readonly SecuritySignal[],
  now: number = Date.now(),
): SecurityAlert[] {
  return ALERT_RULES.map((rule) => {
    const since = now - rule.windowHours * 60 * 60 * 1000;
    const matched = signals.filter(
      (s) =>
        (rule.events as readonly string[]).includes(s.eventType) &&
        new Date(s.at).getTime() >= since,
    );
    const actors = new Map<string, { actorId: string | null; actorName: string; count: number }>();
    for (const signal of matched) {
      const key = signal.actorId ?? "unknown";
      const entry = actors.get(key) ?? {
        actorId: signal.actorId,
        actorName: signal.actorName,
        count: 0,
      };
      entry.count += 1;
      actors.set(key, entry);
    }
    return {
      id: rule.id,
      title: rule.title,
      guidance: rule.guidance,
      severity: rule.severity,
      count: matched.length,
      threshold: rule.threshold,
      windowHours: rule.windowHours,
      triggered: matched.length >= rule.threshold,
      actors: [...actors.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      lastAt:
        matched.reduce<string | null>((acc, s) => (!acc || s.at > acc ? s.at : acc), null) ?? null,
    };
  });
}
