/**
 * Fair-use policy for AI assistance (pure, testable, no I/O).
 *
 * Pro Founding Access is complimentary through 31 December 2026 "subject to
 * fair-use limits" — this module is the single definition of those limits.
 * Enforcement lives in `service.server.ts`, which counts `ai_usage_events`.
 */

import type { Edition } from "@/lib/authz/editions";
import type { AiTask } from "./prompts";

export type FairUseLimits = {
  /** Requests per user per rolling 24 hours. */
  perUserPerDay: number;
  /** Requests per workspace per rolling 24 hours. */
  perWorkspacePerDay: number;
};

const DEFAULT_LIMITS: Record<Edition, FairUseLimits> = {
  lite: { perUserPerDay: 5, perWorkspacePerDay: 20 },
  pro: { perUserPerDay: 60, perWorkspacePerDay: 300 },
  enterprise: { perUserPerDay: 500, perWorkspacePerDay: 5_000 },
};

/** Tasks that are cheap enough not to consume the interactive budget. */
const UNMETERED_TASKS: ReadonlySet<AiTask> = new Set<AiTask>([]);

export function isMetered(task: AiTask): boolean {
  return !UNMETERED_TASKS.has(task);
}

function positiveInt(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Resolve the limits for an edition. Environment overrides let operations
 * loosen or tighten fair use without a deploy.
 */
export function limitsForEdition(
  edition: Edition,
  env: Record<string, string | undefined> = {},
): FairUseLimits {
  const base = DEFAULT_LIMITS[edition] ?? DEFAULT_LIMITS.lite;
  return {
    perUserPerDay: positiveInt(env.AI_FAIR_USE_PER_USER_PER_DAY) ?? base.perUserPerDay,
    perWorkspacePerDay:
      positiveInt(env.AI_FAIR_USE_PER_WORKSPACE_PER_DAY) ?? base.perWorkspacePerDay,
  };
}

export type FairUseVerdict = {
  allowed: boolean;
  used: number;
  limit: number;
  resetsAt: string;
};

/** Decide whether one more request fits inside the window. */
export function evaluateFairUse(
  usedByUser: number,
  usedByWorkspace: number,
  limits: FairUseLimits,
  windowStart: Date,
): FairUseVerdict {
  const resetsAt = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const userExceeded = usedByUser >= limits.perUserPerDay;
  const workspaceExceeded = usedByWorkspace >= limits.perWorkspacePerDay;
  return {
    allowed: !userExceeded && !workspaceExceeded,
    used: workspaceExceeded && !userExceeded ? usedByWorkspace : usedByUser,
    limit:
      workspaceExceeded && !userExceeded ? limits.perWorkspacePerDay : limits.perUserPerDay,
    resetsAt,
  };
}
