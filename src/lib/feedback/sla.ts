/**
 * Triage vocabulary for the consolidated requests inbox: priority, the service
 * commitment attached to each priority, and how a due date reads to a human.
 *
 * Client-safe: no transport, no database client. The same table drives the
 * admin inbox badges and the reporter-facing status alerts, so a request can
 * never show one deadline to us and a different one to the person waiting.
 */

export const REQUEST_PRIORITIES = [
  { value: "p1", label: "P1 — blocking", slaHours: 8 },
  { value: "p2", label: "P2 — high", slaHours: 24 },
  { value: "p3", label: "P3 — normal", slaHours: 72 },
  { value: "p4", label: "P4 — low", slaHours: 336 },
] as const;

export type RequestPriority = (typeof REQUEST_PRIORITIES)[number]["value"];

export const DEFAULT_REQUEST_PRIORITY: RequestPriority = "p3";

/** Statuses that stop the SLA clock — nothing is "overdue" once it is closed. */
const CLOSED_STATUSES = new Set(["resolved", "declined"]);

export function isRequestPriority(value: unknown): value is RequestPriority {
  return REQUEST_PRIORITIES.some((item) => item.value === value);
}

export function requestPriorityLabel(value: string): string {
  return REQUEST_PRIORITIES.find((item) => item.value === value)?.label ?? value;
}

export function slaHoursFor(priority: string): number {
  return (
    REQUEST_PRIORITIES.find((item) => item.value === priority)?.slaHours ??
    REQUEST_PRIORITIES.find((item) => item.value === DEFAULT_REQUEST_PRIORITY)!.slaHours
  );
}

/** Severity reported by the user maps to a starting priority; admins can override. */
export function priorityFromSeverity(severity: string): RequestPriority {
  if (severity === "blocking") return "p1";
  if (severity === "high") return "p2";
  if (severity === "low") return "p4";
  return "p3";
}

/** Due date = start of the clock + the SLA window for that priority. */
export function computeDueAt(priority: string, from: string | number | Date = Date.now()): string {
  const start = new Date(from).getTime();
  return new Date(start + slaHoursFor(priority) * 3_600_000).toISOString();
}

export interface SlaState {
  /** Short line for a badge, e.g. "Due in 6h" or "Overdue by 2d". */
  label: string;
  tone: "default" | "secondary" | "outline" | "destructive";
  overdue: boolean;
  /** Negative when the deadline has passed. Null when there is no due date. */
  hoursRemaining: number | null;
}

function humaniseHours(hours: number): string {
  const abs = Math.abs(hours);
  if (abs < 1) return `${Math.max(1, Math.round(abs * 60))}m`;
  if (abs < 48) return `${Math.round(abs)}h`;
  return `${Math.round(abs / 24)}d`;
}

/**
 * How a due date reads right now. Closed requests report the outcome instead of
 * a countdown, so a resolved item never nags.
 */
export function slaState(
  dueAt: string | null,
  status: string,
  now: string | number | Date = Date.now(),
): SlaState {
  if (CLOSED_STATUSES.has(status)) {
    return { label: "Clock stopped", tone: "secondary", overdue: false, hoursRemaining: null };
  }
  if (!dueAt) {
    return { label: "No due date", tone: "outline", overdue: false, hoursRemaining: null };
  }
  const hoursRemaining = (new Date(dueAt).getTime() - new Date(now).getTime()) / 3_600_000;
  if (hoursRemaining < 0) {
    return {
      label: `Overdue by ${humaniseHours(hoursRemaining)}`,
      tone: "destructive",
      overdue: true,
      hoursRemaining,
    };
  }
  return {
    label: `Due in ${humaniseHours(hoursRemaining)}`,
    tone: hoursRemaining <= 8 ? "default" : "outline",
    overdue: false,
    hoursRemaining,
  };
}
