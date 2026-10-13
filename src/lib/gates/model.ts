/**
 * Decision gates V2 (FR-08) — catalogue, actions, SLA, readiness, SoD.
 * Pure module: no React, no Supabase. AI may flag gaps; never decide or close.
 */

import { z } from "zod";
import type { ScopedPermission } from "@/lib/authz/scoped-permissions";
import type { CanonicalState } from "@/lib/lifecycle/states";
import { assertNotSelfReview } from "@/lib/submissions";

/* --------------------------------------------------------------- catalogue */

export const GATE_KEYS = [
  "intake",
  "discovery_complete",
  "investment_review",
  "pilot_authorization",
  "scale_authorization",
  "retirement_review",
] as const;

export type GateKey = (typeof GATE_KEYS)[number];

export const GATE_ACTIONS = [
  "submit",
  "request_changes",
  "approve_with_conditions",
  "approve",
  "hold",
  "reject",
] as const;

export type GateAction = (typeof GATE_ACTIONS)[number];

export const GATE_REVIEW_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "changes_requested",
  "approved",
  "approved_with_conditions",
  "held",
  "rejected",
] as const;

export type GateReviewStatus = (typeof GATE_REVIEW_STATUSES)[number];

export const OPEN_ITEM_KINDS = ["condition", "change_request"] as const;
export type OpenItemKind = (typeof OPEN_ITEM_KINDS)[number];

export const OPEN_ITEM_STATUSES = ["open", "closed"] as const;
export type OpenItemStatus = (typeof OPEN_ITEM_STATUSES)[number];

/** Human decision actions — AI must never perform these. */
export const HUMAN_DECIDE_ACTIONS: readonly GateAction[] = [
  "request_changes",
  "approve_with_conditions",
  "approve",
  "hold",
  "reject",
] as const;

export type GateDefinition = {
  key: GateKey;
  label: string;
  description: string;
  /** Field keys expected on the use-case / canvas payload before submit. */
  requiredFields: readonly string[];
  /** Evidence subject fields that should have at least one active item (soft). */
  requiredEvidenceFields: readonly string[];
  /** Minimum permission to submit into the gate. */
  submitPermission: ScopedPermission;
  /** Minimum permission to decide at the gate. */
  decidePermission: ScopedPermission;
  /** Named decision authority (snapshotted onto the review). */
  decisionAuthority: string;
  /** Target hours from submit → first decision (SLA indicator). */
  slaHours: number;
  /** When true, submitter cannot decide. */
  sodEnabled: boolean;
  /** Lifecycle state after a clean approve (null = no auto transition). */
  approveLifecycleTo: CanonicalState | null;
};

export const DEFAULT_GATES: readonly GateDefinition[] = [
  {
    key: "intake",
    label: "Intake",
    description: "Problem, outcome and ownership are clear enough to enter Design.",
    requiredFields: ["title", "problem", "desiredOutcome", "owner"],
    requiredEvidenceFields: [],
    submitPermission: "submit",
    decidePermission: "decide",
    decisionAuthority: "Workspace Admin / Intake Reviewer",
    slaHours: 48,
    sodEnabled: true,
    approveLifecycleTo: "designing",
  },
  {
    key: "discovery_complete",
    label: "Discovery Complete",
    description: "Canvas discovery sections and baseline evidence are sufficient.",
    requiredFields: ["problem", "users", "workflow", "painBaseline"],
    requiredEvidenceFields: ["problem", "painBaseline"],
    submitPermission: "submit",
    decidePermission: "decide",
    decisionAuthority: "Technical Reviewer / Workspace Admin",
    slaHours: 72,
    sodEnabled: true,
    approveLifecycleTo: "review_ready",
  },
  {
    key: "investment_review",
    label: "Investment Review",
    description: "Scorecard, value hypothesis and investment ask are reviewable.",
    requiredFields: ["scoreSummary", "valueHypothesis", "investmentAsk"],
    requiredEvidenceFields: ["scoreSummary"],
    submitPermission: "submit",
    decidePermission: "decide",
    decisionAuthority: "Executive Reviewer / Portfolio Manager",
    slaHours: 120,
    sodEnabled: true,
    approveLifecycleTo: "under_review",
  },
  {
    key: "pilot_authorization",
    label: "Pilot Authorization",
    description: "Pilot scope, controls and agentic guards (when applicable) are ready.",
    requiredFields: ["pilotScope", "successCriteria", "controls"],
    requiredEvidenceFields: ["controls"],
    submitPermission: "submit",
    decidePermission: "decide",
    decisionAuthority: "Risk Reviewer / Workspace Admin",
    slaHours: 96,
    sodEnabled: true,
    approveLifecycleTo: "approved_pilot",
  },
  {
    key: "scale_authorization",
    label: "Scale Authorization",
    description: "Pilot evidence supports scale; operating model and value contract ready.",
    requiredFields: ["pilotResults", "operatingModel", "valueContract"],
    requiredEvidenceFields: ["pilotResults"],
    submitPermission: "submit",
    decidePermission: "decide",
    decisionAuthority: "Executive Reviewer / Portfolio Manager",
    slaHours: 168,
    sodEnabled: true,
    approveLifecycleTo: "approved_scale",
  },
  {
    key: "retirement_review",
    label: "Retirement Review",
    description: "Stop/scale criteria met; retirement rationale and retention decided.",
    requiredFields: ["retirementRationale", "retentionPlan"],
    requiredEvidenceFields: [],
    submitPermission: "submit",
    decidePermission: "decide",
    decisionAuthority: "Workspace Admin / Portfolio Manager",
    slaHours: 72,
    sodEnabled: true,
    approveLifecycleTo: "retired",
  },
] as const;

export function gateDefinition(key: GateKey): GateDefinition {
  const g = DEFAULT_GATES.find((d) => d.key === key);
  if (!g) throw new Error(`Unknown gate: ${key}`);
  return g;
}

export function isGateKey(value: string): value is GateKey {
  return (GATE_KEYS as readonly string[]).includes(value);
}

/* --------------------------------------------------------------- statuses */

/** Map a human action onto the resulting review status. */
export function statusAfterAction(action: GateAction): GateReviewStatus {
  switch (action) {
    case "submit":
      return "submitted";
    case "request_changes":
      return "changes_requested";
    case "approve_with_conditions":
      return "approved_with_conditions";
    case "approve":
      return "approved";
    case "hold":
      return "held";
    case "reject":
      return "rejected";
  }
}

export function isTerminalGateStatus(status: GateReviewStatus): boolean {
  return (
    status === "approved" ||
    status === "approved_with_conditions" ||
    status === "held" ||
    status === "rejected"
  );
}

export function isDecideAction(action: GateAction): boolean {
  return HUMAN_DECIDE_ACTIONS.includes(action);
}

/* -------------------------------------------------------------------- SLA */

export type SlaIndicator = {
  dueAt: string | null;
  hoursRemaining: number | null;
  overdue: boolean;
  label: string;
};

export function computeSla(
  submittedAt: string | null | undefined,
  slaHours: number,
  now: Date = new Date(),
): SlaIndicator {
  if (!submittedAt) {
    return { dueAt: null, hoursRemaining: null, overdue: false, label: "Not submitted" };
  }
  const due = new Date(new Date(submittedAt).getTime() + slaHours * 3_600_000);
  const ms = due.getTime() - now.getTime();
  const hoursRemaining = Math.round((ms / 3_600_000) * 10) / 10;
  const overdue = ms < 0;
  return {
    dueAt: due.toISOString(),
    hoursRemaining,
    overdue,
    label: overdue ? `Overdue by ${Math.abs(hoursRemaining)}h` : `${hoursRemaining}h remaining`,
  };
}

/* ------------------------------------------------------------- readiness */

export type FieldPresence = Record<string, string | null | undefined>;

export type MissingInput = {
  field: string;
  reason: string;
  source: "rule" | "ai_suggestion";
};

/**
 * Deterministic gap check used as the default "AI may identify missing inputs"
 * surface. Never mutates review state; never approves or closes conditions.
 */
export function identifyMissingInputs(gate: GateDefinition, fields: FieldPresence): MissingInput[] {
  const out: MissingInput[] = [];
  for (const field of gate.requiredFields) {
    const v = fields[field];
    if (v == null || String(v).trim().length === 0) {
      out.push({
        field,
        reason: `Required for ${gate.label}`,
        source: "rule",
      });
    }
  }
  return out;
}

export class GateReadinessError extends Error {
  readonly missing: MissingInput[];
  constructor(gate: GateDefinition, missing: MissingInput[]) {
    super(
      `${gate.label} is not ready to submit: missing ${missing.map((m) => m.field).join(", ")}.`,
    );
    this.name = "GateReadinessError";
    this.missing = missing;
  }
}

export function assertReadyToSubmit(
  gate: GateDefinition,
  fields: FieldPresence,
  /** When true, allow submit with gaps (draft soft-submit). Default hard. */
  allowGaps = false,
): MissingInput[] {
  const missing = identifyMissingInputs(gate, fields);
  if (!allowGaps && missing.length > 0) throw new GateReadinessError(gate, missing);
  return missing;
}

/* ------------------------------------------------------ SoD + AI bounds */

export class AiMayNotDecideError extends Error {
  constructor(action: GateAction) {
    super(`AI cannot ${action.replace(/_/g, " ")} a decision gate. A human reviewer must act.`);
    this.name = "AiMayNotDecideError";
  }
}

export class AiMayNotCloseConditionError extends Error {
  constructor() {
    super("AI cannot close gate conditions or change requests. A human must close them.");
    this.name = "AiMayNotCloseConditionError";
  }
}

/**
 * Actor kinds for gate mutations. `ai` is allowed only for missing-input hints.
 */
export type GateActorKind = "human" | "ai";

export function assertHumanDecide(actor: GateActorKind, action: GateAction): void {
  if (actor === "ai" && isDecideAction(action)) {
    throw new AiMayNotDecideError(action);
  }
}

export function assertHumanClose(actor: GateActorKind): void {
  if (actor === "ai") throw new AiMayNotCloseConditionError();
}

export function assertGateSod(opts: {
  sodEnabled: boolean;
  submittedBy: string | null | undefined;
  actorUserId: string;
}): void {
  if (!opts.sodEnabled) return;
  assertNotSelfReview(
    opts.submittedBy,
    opts.actorUserId,
    "Segregation of duties: you cannot decide on a gate you submitted.",
  );
}

/* --------------------------------------------------------------- schemas */

export const gateKeySchema = z.enum(GATE_KEYS);
export const gateActionSchema = z.enum(GATE_ACTIONS);

export const changeRequestInputSchema = z.object({
  fieldKey: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
});

export const decideGateInputSchema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(["request_changes", "approve_with_conditions", "approve", "hold", "reject"]),
  rationale: z.string().trim().min(1).max(4000),
  conditions: z.array(z.string().trim().min(1).max(2000)).max(20).optional(),
  changeRequests: z.array(changeRequestInputSchema).max(40).optional(),
  /** Always human for decide paths — kept for explicit denial of AI callers. */
  actorKind: z.enum(["human", "ai"]).default("human"),
});

export const submitGateInputSchema = z.object({
  useCaseId: z.string().uuid(),
  gateKey: gateKeySchema,
  recordVersionId: z.string().uuid().nullable().optional(),
  /** Snapshot of field values used for readiness + missing-input display. */
  fields: z.record(z.string(), z.string().nullable()).default({}),
  allowGaps: z.boolean().optional().default(false),
});

export const closeOpenItemInputSchema = z.object({
  itemId: z.string().uuid(),
  closeNote: z.string().trim().max(2000).nullable().optional(),
  actorKind: z.enum(["human", "ai"]).default("human"),
});
