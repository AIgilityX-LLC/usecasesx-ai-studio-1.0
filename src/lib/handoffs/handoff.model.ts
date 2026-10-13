/**
 * Suite handoff requests — client-safe domain model.
 *
 * A handoff is a *request record*, not a copy of the work. Nothing here
 * duplicates a use case, a portfolio or an assessment: a request points at the
 * source rows by reference and records the version of those rows at the moment
 * the request was raised, so a downstream reader can always ask "what exactly
 * did they see when they asked for this?".
 *
 * The four targets (SARPI, SARN/CyberX C3G, AdvisorX/ConversX and human
 * advisory) have no live API integration today. That is stated in the model
 * rather than hidden in the UI: every target declares its `connection` state,
 * and while it is `internal_queue` the surfaces say so plainly. No code path
 * claims an automatic integration that does not exist.
 *
 * Pure module — no database client, no transport, no secrets.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ targets */

export const HANDOFF_TARGETS = ["sarpi", "sarn_c3g", "advisorx", "human_advisory"] as const;
export type HandoffTarget = (typeof HANDOFF_TARGETS)[number];

/**
 * How a request actually leaves the product.
 * - `internal_queue`: it lands in a queue a human works. Honest default.
 * - `endpoint`: a real, configured integration exists and was called.
 */
export type HandoffDelivery = "internal_queue" | "endpoint";

export type HandoffTargetMeta = {
  key: HandoffTarget;
  label: string;
  /** What the receiving service is, in the user's language. */
  description: string;
  /** Delivery state today. Never hardcode `endpoint` without a working call. */
  connection: HandoffDelivery;
  /** Request types this target accepts. */
  requestTypes: { key: string; label: string; help: string }[];
  /** Default sensitivity of the context this target receives. */
  sensitivity: HandoffSensitivity;
};

export const HANDOFF_SENSITIVITIES = ["internal", "confidential", "restricted"] as const;
export type HandoffSensitivity = (typeof HANDOFF_SENSITIVITIES)[number];

export const SENSITIVITY_META: Record<
  HandoffSensitivity,
  { label: string; note: string; requiresConsent: boolean }
> = {
  internal: {
    label: "Internal",
    note: "Workspace context only. Stays inside your organization's queue.",
    requiresConsent: false,
  },
  confidential: {
    label: "Confidential",
    note: "Includes commercial or risk detail. Explicit confirmation required before it is shared.",
    requiresConsent: true,
  },
  restricted: {
    label: "Restricted",
    note: "Includes named contacts or governance findings. Explicit confirmation required, and it is only shared with the named recipient.",
    requiresConsent: true,
  },
};

export const HANDOFF_TARGET_META: Record<HandoffTarget, HandoffTargetMeta> = {
  sarpi: {
    key: "sarpi",
    label: "SARPI™ readiness & value",
    description: "Readiness assessment and value validation for a selected set of use cases.",
    connection: "internal_queue",
    sensitivity: "internal",
    requestTypes: [
      {
        key: "readiness_assessment",
        label: "AI readiness assessment",
        help: "Strategy, data, process, people, technology and governance readiness.",
      },
      {
        key: "value_validation",
        label: "Value assumption validation",
        help: "Challenge the baseline, target and expected value behind the case.",
      },
      {
        key: "roi_scorecard",
        label: "Agentic AI ROI scorecard",
        help: "Structured ROI review across productivity, financial and risk dimensions.",
      },
    ],
  },
  sarn_c3g: {
    key: "sarn_c3g",
    label: "SARN & CyberX C3G governance",
    description: "Governance, risk and assurance review of a specific case.",
    connection: "internal_queue",
    sensitivity: "confidential",
    requestTypes: [
      {
        key: "risk_review",
        label: "Risk indicator review",
        help: "Review the identified risk indicators against the lifecycle stage.",
      },
      {
        key: "governance_gate",
        label: "Governance gate check",
        help: "Confirm what must be in place before the case moves stage.",
      },
      {
        key: "assurance_review",
        label: "Assurance review",
        help: "Independent assurance over controls and evidence.",
      },
    ],
  },
  advisorx: {
    key: "advisorx",
    label: "AdvisorX™ / ConversX™",
    description: "Controlled advisory context for a requested written output.",
    connection: "internal_queue",
    sensitivity: "confidential",
    requestTypes: [
      {
        key: "executive_brief",
        label: "Executive brief",
        help: "A short written brief for an executive audience.",
      },
      {
        key: "option_appraisal",
        label: "Option appraisal",
        help: "Compare the shortlisted options and their trade-offs.",
      },
      {
        key: "board_narrative",
        label: "Board narrative",
        help: "Narrative framing for a board or investment committee.",
      },
    ],
  },
  human_advisory: {
    key: "human_advisory",
    label: "Human advisory & workshops",
    description: "A conversation with an advisor, or a facilitated workshop.",
    connection: "internal_queue",
    sensitivity: "restricted",
    requestTypes: [
      {
        key: "advisory_call",
        label: "Advisory conversation",
        help: "Introductory conversation about the portfolio.",
      },
      {
        key: "workshop",
        label: "Discovery / value workshop",
        help: "Facilitated AI use case discovery and value design workshop.",
      },
      {
        key: "design_partner",
        label: "Enterprise design partner",
        help: "Discuss a paid Enterprise design partner engagement.",
      },
    ],
  },
};

export const HANDOFF_TARGET_ORDER: HandoffTarget[] = [
  "sarpi",
  "sarn_c3g",
  "advisorx",
  "human_advisory",
];

/** True when the target has a live, working integration. Today: never. */
export function isTargetConnected(target: HandoffTarget): boolean {
  return HANDOFF_TARGET_META[target].connection === "endpoint";
}

/**
 * The sentence a surface must show next to any handoff action. It exists so
 * that no screen can imply an automatic integration that is not built.
 */
export function deliveryStatement(target: HandoffTarget): string {
  return isTargetConnected(target)
    ? `Sent directly to ${HANDOFF_TARGET_META[target].label}.`
    : `${HANDOFF_TARGET_META[target].label} is not connected to an automatic integration yet. Your request is queued for a person to pick up, and you can track its status here.`;
}

/* ------------------------------------------------------------------- status */

export const HANDOFF_STATUSES = [
  "queued",
  "in_review",
  "accepted",
  "dispatched",
  "completed",
  "declined",
  "cancelled",
] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

export const HANDOFF_STATUS_META: Record<
  HandoffStatus,
  { label: string; description: string; tone: "neutral" | "info" | "positive" | "warning" }
> = {
  queued: {
    label: "Queued",
    description: "Received and waiting to be picked up.",
    tone: "neutral",
  },
  in_review: {
    label: "In review",
    description: "Someone is reading the request and its context.",
    tone: "info",
  },
  accepted: {
    label: "Accepted",
    description: "Agreed to be taken forward.",
    tone: "info",
  },
  dispatched: {
    label: "Dispatched",
    description: "Handed to the receiving team or service.",
    tone: "info",
  },
  completed: {
    label: "Completed",
    description: "The requested output has been delivered.",
    tone: "positive",
  },
  declined: {
    label: "Declined",
    description: "Not taken forward. The reason is recorded on the request.",
    tone: "warning",
  },
  cancelled: {
    label: "Cancelled",
    description: "Withdrawn by the requester.",
    tone: "warning",
  },
};

/**
 * Allowed status moves. Kept deliberately narrow so the queue reads as a real
 * process rather than a free-text field, and so audit records are meaningful.
 */
const STATUS_TRANSITIONS: Record<HandoffStatus, HandoffStatus[]> = {
  queued: ["in_review", "accepted", "declined", "cancelled"],
  in_review: ["accepted", "declined", "cancelled"],
  accepted: ["dispatched", "declined", "cancelled"],
  dispatched: ["completed", "declined"],
  completed: [],
  declined: [],
  cancelled: [],
};

export function nextStatuses(current: HandoffStatus): HandoffStatus[] {
  return STATUS_TRANSITIONS[current] ?? [];
}

export function canTransition(from: HandoffStatus, to: HandoffStatus): boolean {
  return nextStatuses(from).includes(to);
}

export function isTerminalStatus(status: HandoffStatus): boolean {
  return nextStatuses(status).length === 0;
}

/** A declined request must say why; the queue is a record, not a black hole. */
export function statusNoteRequired(to: HandoffStatus): boolean {
  return to === "declined";
}

/* ------------------------------------------------------ source provenance */

/**
 * A pointer to a source record plus enough version information to reproduce
 * what the requester was looking at. `version` is whatever the source exposes
 * (an `updated_at`, a status, a draft revision); `capturedAt` is when we read
 * it. Together they answer "which version of the truth was this raised from?".
 */
export const sourceRefSchema = z.object({
  type: z.string().min(1),
  id: z.string().min(1),
  label: z.string().min(1),
  version: z.string().nullable().default(null),
  capturedAt: z.string(),
});
export type HandoffSourceRef = z.infer<typeof sourceRefSchema>;

export function makeSourceRef(input: {
  type: string;
  id: string;
  label: string;
  version?: string | null;
}): HandoffSourceRef {
  return {
    type: input.type,
    id: input.id,
    label: input.label,
    version: input.version ?? null,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * A single fingerprint over every referenced record. Two requests raised from
 * identical source state share a fingerprint; if anything moved underneath,
 * they do not. Deterministic and order-independent.
 */
export function sourceFingerprint(refs: HandoffSourceRef[]): string {
  const parts = refs.map((ref) => `${ref.type}:${ref.id}@${ref.version ?? "unversioned"}`).sort();
  let hash = 2166136261; // FNV-1a, enough to detect drift; not a security hash
  const input = parts.join("|");
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type HandoffSourceVersion = {
  fingerprint: string;
  refCount: number;
  capturedAt: string;
  /** App build/source version, when the surface knows it. */
  appVersion: string | null;
};

export function buildSourceVersion(
  refs: HandoffSourceRef[],
  appVersion: string | null = null,
): HandoffSourceVersion {
  return {
    fingerprint: sourceFingerprint(refs),
    refCount: refs.length,
    capturedAt: new Date().toISOString(),
    appVersion,
  };
}

/** Did the source move since the request was raised? */
export function sourceHasDrifted(
  recorded: HandoffSourceVersion | null | undefined,
  currentRefs: HandoffSourceRef[],
): boolean {
  if (!recorded?.fingerprint) return false;
  return recorded.fingerprint !== sourceFingerprint(currentRefs);
}

/* ------------------------------------------------------------------ consent */

/**
 * Consent is recorded, not assumed. For confidential and restricted targets
 * the requester must actively confirm that the listed context may be shared,
 * and we keep who confirmed, when, and exactly what they were told.
 */
export const consentSchema = z.object({
  confirmed: z.boolean(),
  confirmedAt: z.string().nullable(),
  statement: z.string(),
  sharedContext: z.array(z.string()),
});
export type HandoffConsent = z.infer<typeof consentSchema>;

export function consentStatement(target: HandoffTarget): string {
  const meta = HANDOFF_TARGET_META[target];
  return `I confirm this workspace context may be shared with ${meta.label} for the purpose of this request.`;
}

export function requiresConsent(target: HandoffTarget): boolean {
  return SENSITIVITY_META[HANDOFF_TARGET_META[target].sensitivity].requiresConsent;
}

/* ------------------------------------------------------------- request input */

const contactSchema = z.object({
  name: z.string().trim().min(1, "Add a contact name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  role: z.string().trim().max(120).optional().default(""),
});

/**
 * Per-target payload. Each shape mirrors what that receiving service actually
 * needs to act, and nothing more — a request carries context, not a data dump.
 */
export const payloadSchemas = {
  sarpi: z.object({
    organizationName: z.string().trim().min(1, "Name the organization.").max(200),
    assessmentType: z.string().trim().min(1, "Choose an assessment type."),
    readinessAssumptions: z.string().trim().max(4000).optional().default(""),
    valueAssumptions: z.string().trim().max(4000).optional().default(""),
  }),
  sarn_c3g: z.object({
    caseReference: z.string().trim().min(1, "Add the case reference.").max(200),
    lifecycleStage: z.string().trim().min(1, "Choose a lifecycle stage."),
    riskIndicators: z.array(z.string().trim().min(1)).min(1, "List at least one risk indicator."),
    governanceConcerns: z.string().trim().max(4000).optional().default(""),
  }),
  advisorx: z.object({
    requestedOutput: z.string().trim().min(1, "Say what output you need.").max(400),
    audience: z.string().trim().max(200).optional().default(""),
    contextSnapshot: z.array(z.string().trim().min(1)).min(1, "Confirm the context to share."),
    constraints: z.string().trim().max(4000).optional().default(""),
  }),
  human_advisory: z.object({
    contact: contactSchema,
    portfolioSummary: z.string().trim().min(1, "Summarise the portfolio.").max(4000),
    workshopInterest: z.boolean().default(false),
    nextStep: z.string().trim().min(1, "Say what the next step should be.").max(400),
  }),
} as const;

export type HandoffPayload = {
  [K in HandoffTarget]: z.infer<(typeof payloadSchemas)[K]>;
};

export const LIFECYCLE_STAGES = ["Concept", "Prototype", "Pilot", "Production", "Scaled"] as const;

/** The default risk indicator vocabulary offered by the C3G request form. */
export const RISK_INDICATOR_OPTIONS = [
  "Personal data processed",
  "Automated decision affecting people",
  "Third-party model or vendor dependency",
  "Safety-critical or operational technology",
  "Regulated process or reporting",
  "Model output published externally",
  "Unclear data lineage or provenance",
] as const;

/* ---------------------------------------------------------------- validation */

export type HandoffDraft = {
  target: HandoffTarget;
  requestType: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  consentConfirmed: boolean;
  sourceRefs: HandoffSourceRef[];
};

export type HandoffValidation =
  { ok: true; errors: Record<string, string> } | { ok: false; errors: Record<string, string> };

/**
 * Validates a draft against its target's schema plus the cross-cutting rules:
 * a request must reference at least one source record, and sensitive targets
 * must have explicit consent.
 */
export function validateDraft(draft: HandoffDraft): HandoffValidation {
  const errors: Record<string, string> = {};

  if (!draft.title.trim()) errors["title"] = "Give the request a title.";
  if (!draft.requestType) errors["requestType"] = "Choose what you are asking for.";

  const validTypes = HANDOFF_TARGET_META[draft.target].requestTypes.map((t) => t.key);
  if (draft.requestType && !validTypes.includes(draft.requestType)) {
    errors["requestType"] = "That request type is not available for this service.";
  }

  if (draft.sourceRefs.length === 0) {
    errors["sourceRefs"] = "A request must reference at least one record.";
  }

  const parsed = payloadSchemas[draft.target].safeParse(draft.payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors[`payload.${issue.path.join(".")}`] = issue.message;
    }
  }

  if (requiresConsent(draft.target) && !draft.consentConfirmed) {
    errors["consent"] = "Confirm the context may be shared before sending.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** Builds the consent record that is stored alongside the request. */
export function buildConsent(draft: HandoffDraft): HandoffConsent {
  return {
    confirmed: draft.consentConfirmed || !requiresConsent(draft.target),
    confirmedAt: draft.consentConfirmed ? new Date().toISOString() : null,
    statement: consentStatement(draft.target),
    sharedContext: draft.sourceRefs.map((ref) => `${ref.type}: ${ref.label}`),
  };
}

/* ------------------------------------------------------------------- record */

export type HandoffRequest = {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  target: HandoffTarget;
  requestType: string;
  status: HandoffStatus;
  deliveryMode: HandoffDelivery;
  title: string;
  summary: string | null;
  requestedBy: string;
  ownerUserId: string | null;
  sourceRefs: HandoffSourceRef[];
  sourceVersion: HandoffSourceVersion | null;
  payload: Record<string, unknown>;
  consent: HandoffConsent | null;
  sensitivity: HandoffSensitivity;
  statusNote: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function requestTypeLabel(target: HandoffTarget, requestType: string): string {
  return (
    HANDOFF_TARGET_META[target].requestTypes.find((t) => t.key === requestType)?.label ??
    requestType
  );
}

/** Queue counts by status, used by the admin queue header and analytics. */
export function summarizeQueue(requests: HandoffRequest[]) {
  const byStatus = Object.fromEntries(HANDOFF_STATUSES.map((status) => [status, 0])) as Record<
    HandoffStatus,
    number
  >;
  const byTarget = Object.fromEntries(HANDOFF_TARGETS.map((t) => [t, 0])) as Record<
    HandoffTarget,
    number
  >;
  for (const request of requests) {
    if (byStatus[request.status] !== undefined) byStatus[request.status] += 1;
    if (byTarget[request.target] !== undefined) byTarget[request.target] += 1;
  }
  const open = requests.filter((r) => !isTerminalStatus(r.status)).length;
  return { total: requests.length, open, byStatus, byTarget };
}
