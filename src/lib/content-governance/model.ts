/**
 * Repository content governance (V2-19 / FR-01).
 * Pure workflow + evidence-class rules — no invented outcomes.
 */

import { z } from "zod";

/** Editorial workflow for global catalogue / pattern records. */
export const CONTENT_WORKFLOW = [
  "draft",
  "submitted_for_review",
  "approved",
  "published",
  "unpublished",
  "deprecated",
  "archived",
] as const;
export type ContentWorkflowStatus = (typeof CONTENT_WORKFLOW)[number];

export const CONTENT_WORKFLOW_LABEL: Record<ContentWorkflowStatus, string> = {
  draft: "Draft",
  submitted_for_review: "In review",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  deprecated: "Deprecated",
  archived: "Archived",
};

/** Allowed transitions (permission checks live at the call site). */
export const CONTENT_TRANSITIONS: Record<ContentWorkflowStatus, ContentWorkflowStatus[]> = {
  draft: ["submitted_for_review", "archived"],
  submitted_for_review: ["draft", "approved", "archived"],
  approved: ["published", "submitted_for_review", "archived"],
  published: ["unpublished", "deprecated"],
  unpublished: ["draft", "published", "archived"],
  deprecated: ["archived"],
  archived: [],
};

export function canTransitionContent(
  from: ContentWorkflowStatus,
  to: ContentWorkflowStatus,
): boolean {
  return (CONTENT_TRANSITIONS[from] ?? []).includes(to);
}

export function assertContentTransition(
  from: ContentWorkflowStatus,
  to: ContentWorkflowStatus,
): void {
  if (!canTransitionContent(from, to)) {
    throw new Error(`Content workflow: cannot move from "${from}" to "${to}".`);
  }
}

/**
 * How strongly the record is evidenced. Public UI must label these differently.
 * - example: illustrative / teaching shape — not a client claim
 * - verified_case_study: attributable real-world reference with provenance URL
 * - pattern_template: reusable capability pattern (no client, no ROI figures)
 */
export const EVIDENCE_CLASSES = ["example", "verified_case_study", "pattern_template"] as const;
export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

export const EVIDENCE_CLASS_LABEL: Record<EvidenceClass, string> = {
  example: "Illustrative example",
  verified_case_study: "Verified case study",
  pattern_template: "Pattern template",
};

export const EVIDENCE_CLASS_DISCLAIMER: Record<EvidenceClass, string> = {
  example:
    "Illustrative content for discovery and training. Not a client engagement, and not a measured outcome.",
  verified_case_study:
    "Attributable case study with recorded provenance. Outcomes are only those stated in the cited source.",
  pattern_template:
    "Reusable solution shape. Contains no client names and no invented ROI or performance figures.",
};

export const TEMPLATE_KINDS = [
  "genai",
  "rag",
  "predictive_ml",
  "computer_vision",
  "automation",
  "agentic_workflow",
] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  genai: "Generative AI",
  rag: "Retrieval-augmented generation (RAG)",
  predictive_ml: "Predictive ML",
  computer_vision: "Computer vision",
  automation: "Automation / RPA+",
  agentic_workflow: "Agentic workflow",
};

export const SECTOR_CONTEXTS = [
  "enterprise",
  "sme",
  "government",
  "defense",
  "regulated_industry",
] as const;
export type SectorContext = (typeof SECTOR_CONTEXTS)[number];

export const SECTOR_CONTEXT_LABEL: Record<SectorContext, string> = {
  enterprise: "Enterprise",
  sme: "SME",
  government: "Government",
  defense: "Defense",
  regulated_industry: "Regulated industry",
};

export type ContentGovernanceFields = {
  contentStatus: ContentWorkflowStatus;
  evidenceClass: EvidenceClass;
  licenseUsageNote: string | null;
  contentOwnerName: string | null;
  contentReviewerName: string | null;
  lastReviewedAt: string | null;
  supersededById: string | null;
  provenanceUrl: string | null;
  provenanceNote: string | null;
};

/** Publish gate: verified case studies need a provenance URL; examples must not claim verification. */
export function publishBlockingIssues(input: {
  evidenceClass: EvidenceClass;
  provenanceUrl?: string | null;
  qualityStatus?: string | null;
  contentOwnerName?: string | null;
  lastReviewedAt?: string | null;
  licenseUsageNote?: string | null;
}): string[] {
  const issues: string[] = [];
  if (input.evidenceClass === "verified_case_study" && !input.provenanceUrl?.trim()) {
    issues.push("Verified case studies require a provenance URL or reference.");
  }
  if (input.evidenceClass === "verified_case_study" && input.qualityStatus === "unverified") {
    issues.push("Verified case studies cannot remain quality=unverified.");
  }
  if (!input.contentOwnerName?.trim()) {
    issues.push("Content owner is required before publishing.");
  }
  if (!input.lastReviewedAt) {
    issues.push("Last-reviewed date is required before publishing.");
  }
  if (!input.licenseUsageNote?.trim()) {
    issues.push("License / usage note is required before publishing.");
  }
  return issues;
}

/** Reject seed/import payloads that invent numeric ROI or named clients without verification. */
const INVENTED_CLAIM =
  /(\d+\s*%|\bROI\b|\$\s*\d|\bclient\s+[A-Z]|\bFortune\s*500\b)/i;

export function looksLikeInventedOutcomeClaim(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return INVENTED_CLAIM.test(text);
}

export const contentGovernancePatchSchema = z.object({
  contentStatus: z.enum(CONTENT_WORKFLOW).optional(),
  evidenceClass: z.enum(EVIDENCE_CLASSES).optional(),
  licenseUsageNote: z.string().trim().max(2000).nullable().optional(),
  contentOwnerName: z.string().trim().max(200).nullable().optional(),
  contentReviewerName: z.string().trim().max(200).nullable().optional(),
  lastReviewedAt: z.string().datetime().nullable().optional(),
  supersededById: z.string().uuid().nullable().optional(),
  provenanceUrl: z.string().url().max(2000).nullable().optional(),
  provenanceNote: z.string().trim().max(2000).nullable().optional(),
});
