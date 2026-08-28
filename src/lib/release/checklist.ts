/**
 * Launch checklist (pure).
 *
 * One ordered view of the readiness gates, sorted by leverage: the item that
 * unblocks the most audience score first. Each item carries the live gate
 * status, when it was last verified and the concrete place to go and fix it.
 * Nothing here invents a status — an unmeasured gate stays "unknown".
 */

import {
  READINESS_AUDIENCES,
  audienceContributions,
  type GateStatus,
  type ReadinessGate,
} from "./readiness";

export type ChecklistAction = {
  label: string;
  /** In-app route to the surface that resolves the item. */
  to: string;
  /** True when the action is the primary way to clear this item. */
  primary?: boolean;
};

export type ChecklistItem = {
  id: string;
  label: string;
  status: GateStatus;
  detail: string;
  verifiedAt: string | null;
  /** Percentage points recoverable across all audiences — the leverage. */
  leverage: number;
  /** Why this item matters, in plain terms. */
  why: string;
  actions: ChecklistAction[];
};

const GATE_GUIDE: Record<string, { why: string; actions: ChecklistAction[] }> = {
  "checks.p0": {
    why: "P0 checks are the launch-blocking assertions; nothing ships with one failing.",
    actions: [
      { label: "Run launch checks", to: "/administration/launch-checks", primary: true },
      { label: "Release candidate record", to: "/administration/release-candidate" },
    ],
  },
  "checks.p1": {
    why: "P1 failures do not block launch but each one becomes a day-one support case.",
    actions: [{ label: "Run launch checks", to: "/administration/launch-checks", primary: true }],
  },
  "pilot.evidence": {
    why: "Evidence from real participants is what makes the go decision defensible.",
    actions: [
      { label: "Pilot evidence", to: "/administration/pilot", primary: true },
      { label: "Participant mission", to: "/pilot" },
    ],
  },
  "pilot.seats": {
    why: "Without an enrolled cohort there is no evidence to collect in the first place.",
    actions: [
      { label: "Enrol participants", to: "/administration/pilot", primary: true },
      { label: "Triage requests", to: "/administration/requests" },
    ],
  },
  "pipeline.verification": {
    why: "The recorded pipeline run is the artifact auditors read after launch.",
    actions: [
      { label: "Production readiness", to: "/administration/production-readiness", primary: true },
      { label: "Release candidate record", to: "/administration/release-candidate" },
    ],
  },
};

const STATUS_RANK: Record<GateStatus, number> = { fail: 0, unknown: 1, attention: 2, pass: 3 };

/**
 * Leverage = percentage points currently lost on this gate, summed across the
 * four audiences. Fixing the top item moves the most numbers at once.
 */
export function gateLeverage(gate: ReadinessGate, gates: readonly ReadinessGate[]): number {
  const lost = READINESS_AUDIENCES.reduce((sum, audience) => {
    const contribution = audienceContributions(audience, gates).find((c) => c.gate.id === gate.id);
    return sum + (contribution?.lostPercent ?? 0);
  }, 0);
  return Math.round(lost * 10) / 10;
}

/** Gates as an ordered checklist: blocking and highest-leverage items first. */
export function buildLaunchChecklist(gates: readonly ReadinessGate[]): ChecklistItem[] {
  return gates
    .map((gate) => {
      const guide = GATE_GUIDE[gate.id];
      return {
        id: gate.id,
        label: gate.label,
        status: gate.status,
        detail: gate.detail,
        verifiedAt: gate.verifiedAt ?? null,
        leverage: gateLeverage(gate, gates),
        why: guide?.why ?? "Contributes to the recorded launch verdict.",
        actions: guide?.actions ?? [],
      };
    })
    .sort((a, b) => {
      if (STATUS_RANK[a.status] !== STATUS_RANK[b.status])
        return STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (b.leverage !== a.leverage) return b.leverage - a.leverage;
      return a.label.localeCompare(b.label);
    });
}

export function checklistProgress(items: readonly ChecklistItem[]): {
  cleared: number;
  total: number;
  percent: number;
  open: number;
  blocking: number;
} {
  const cleared = items.filter((item) => item.status === "pass").length;
  const total = items.length;
  return {
    cleared,
    total,
    percent: total === 0 ? 0 : Math.round((cleared / total) * 100),
    open: total - cleared,
    blocking: items.filter((item) => item.status === "fail").length,
  };
}

/** Human phrasing for a last-verified stamp; never guesses a time. */
export function verifiedLabel(verifiedAt: string | null, now: Date = new Date()): string {
  if (!verifiedAt) return "Never verified";
  const then = new Date(verifiedAt);
  if (Number.isNaN(then.getTime())) return "Never verified";
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "Verified just now";
  if (minutes < 60) return `Verified ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Verified ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Verified ${days} day${days === 1 ? "" : "s"} ago`;
}
