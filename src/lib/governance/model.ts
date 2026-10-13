/**
 * V2-11 — Governance applicability preview (FR-07).
 * Informational readiness only — never legal advice, certification or final risk class.
 * Pure module: no React, no Supabase.
 */

import { z } from "zod";

/* -------------------------------------------------------------- disclaimer */

export const GOVERNANCE_DISCLAIMER =
  "This Governance Readiness preview is informational only. It is not legal advice, certification, assurance, or a final risk classification. Authoritative governance, risk, control and assurance records belong in CyberX C3G/SARN after a consented handoff.";

export const GOVERNANCE_CONTENT_PACK_VERSION = "2026.09.1";
export const GOVERNANCE_CONTENT_PACK_DATE = "2026-09-01";
export const GOVERNANCE_CONTENT_PACK_SOURCE =
  "UseCasesX configurable content themes (NIST AI RMF · ISO/IEC 42001 · EU AI Act concepts · OWASP GenAI)";

/* ------------------------------------------------------------------- facts */

export const PROVIDER_DEPLOYER_POSTURES = ["provider", "deployer", "both", "undetermined"] as const;
export type ProviderDeployerPosture = (typeof PROVIDER_DEPLOYER_POSTURES)[number];

export const TRI_STATE = ["yes", "no", "not_determined"] as const;
export type TriState = (typeof TRI_STATE)[number];

export const DATA_CATEGORY_OPTIONS = [
  "personal_data",
  "special_category",
  "biometric",
  "children",
  "financial",
  "health",
  "location",
  "operational",
  "public",
  "not_determined",
] as const;

export type GovernanceFacts = {
  intendedPurpose: string;
  providerDeployerPosture: ProviderDeployerPosture;
  geography: string;
  affectedPersons: string;
  dataCategories: string[];
  vulnerableGroups: TriState;
  criticalInfrastructure: TriState;
  biometrics: TriState;
  highImpactDecisions: TriState;
  prohibitedUseIndicators: TriState;
  prohibitedUseNotes: string;
};

export function emptyGovernanceFacts(partial: Partial<GovernanceFacts> = {}): GovernanceFacts {
  return {
    intendedPurpose: "",
    providerDeployerPosture: "undetermined",
    geography: "",
    affectedPersons: "",
    dataCategories: [],
    vulnerableGroups: "not_determined",
    criticalInfrastructure: "not_determined",
    biometrics: "not_determined",
    highImpactDecisions: "not_determined",
    prohibitedUseIndicators: "not_determined",
    prohibitedUseNotes: "",
    ...partial,
  };
}

export const governanceFactsSchema = z.object({
  intendedPurpose: z.string().trim().max(4000),
  providerDeployerPosture: z.enum(PROVIDER_DEPLOYER_POSTURES),
  geography: z.string().trim().max(500),
  affectedPersons: z.string().trim().max(2000),
  dataCategories: z.array(z.string().trim().min(1).max(80)).max(20),
  vulnerableGroups: z.enum(TRI_STATE),
  criticalInfrastructure: z.enum(TRI_STATE),
  biometrics: z.enum(TRI_STATE),
  highImpactDecisions: z.enum(TRI_STATE),
  prohibitedUseIndicators: z.enum(TRI_STATE),
  prohibitedUseNotes: z.string().trim().max(2000),
});

/** Only confirmed (non-empty / not undetermined) facts enter the handoff package. */
export function confirmedFacts(facts: GovernanceFacts): Partial<GovernanceFacts> {
  const out: Partial<GovernanceFacts> = {};
  if (facts.intendedPurpose.trim()) out.intendedPurpose = facts.intendedPurpose.trim();
  if (facts.providerDeployerPosture !== "undetermined") {
    out.providerDeployerPosture = facts.providerDeployerPosture;
  }
  if (facts.geography.trim()) out.geography = facts.geography.trim();
  if (facts.affectedPersons.trim()) out.affectedPersons = facts.affectedPersons.trim();
  if (facts.dataCategories.length && !facts.dataCategories.includes("not_determined")) {
    out.dataCategories = facts.dataCategories.filter((d) => d !== "not_determined");
  }
  for (const key of [
    "vulnerableGroups",
    "criticalInfrastructure",
    "biometrics",
    "highImpactDecisions",
    "prohibitedUseIndicators",
  ] as const) {
    if (facts[key] !== "not_determined") out[key] = facts[key];
  }
  if (facts.prohibitedUseNotes.trim()) out.prohibitedUseNotes = facts.prohibitedUseNotes.trim();
  return out;
}

/* ---------------------------------------------------------- framework pack */

export const FRAMEWORK_IDS = ["nist_ai_rmf", "iso_42001", "eu_ai_act", "owasp_genai"] as const;
export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

export type ThemeApplicability = "applicable" | "not_applicable" | "not_determined";

export type FrameworkTheme = {
  id: string;
  framework: FrameworkId;
  label: string;
  description: string;
};

export type MappedTheme = FrameworkTheme & {
  applicability: ThemeApplicability;
  rationale: string;
};

export const FRAMEWORK_META: Record<
  FrameworkId,
  { label: string; source: string; version: string; date: string }
> = {
  nist_ai_rmf: {
    label: "NIST AI RMF",
    source: "NIST AI Risk Management Framework (Govern · Map · Measure · Manage)",
    version: "1.0-themes",
    date: GOVERNANCE_CONTENT_PACK_DATE,
  },
  iso_42001: {
    label: "ISO/IEC 42001",
    source: "ISO/IEC 42001 AI management system control themes",
    version: "2023-themes",
    date: GOVERNANCE_CONTENT_PACK_DATE,
  },
  eu_ai_act: {
    label: "EU AI Act concepts",
    source: "EU AI Act role / purpose / risk-applicability concepts (not a determination)",
    version: "concepts-2024",
    date: GOVERNANCE_CONTENT_PACK_DATE,
  },
  owasp_genai: {
    label: "OWASP GenAI",
    source: "OWASP GenAI / agentic security themes",
    version: "2025-themes",
    date: GOVERNANCE_CONTENT_PACK_DATE,
  },
};

/** Versioned content themes — configurable catalogue, not hard-coded legal conclusions. */
export const FRAMEWORK_THEMES: readonly FrameworkTheme[] = [
  // NIST
  {
    id: "nist.govern",
    framework: "nist_ai_rmf",
    label: "Govern",
    description: "Policies, accountability and culture for AI risk.",
  },
  {
    id: "nist.map",
    framework: "nist_ai_rmf",
    label: "Map",
    description: "Context, intended use and impacts are understood.",
  },
  {
    id: "nist.measure",
    framework: "nist_ai_rmf",
    label: "Measure",
    description: "Risks, metrics and evaluations are measured.",
  },
  {
    id: "nist.manage",
    framework: "nist_ai_rmf",
    label: "Manage",
    description: "Risks are prioritized, treated and monitored.",
  },
  // ISO 42001
  {
    id: "iso.policy",
    framework: "iso_42001",
    label: "AI policy & objectives",
    description: "Policy linkage and AI objectives.",
  },
  {
    id: "iso.impact",
    framework: "iso_42001",
    label: "Impact & risk inputs",
    description: "Impact assessment and risk inputs.",
  },
  {
    id: "iso.lifecycle",
    framework: "iso_42001",
    label: "Lifecycle responsibility",
    description: "Roles across the AI system lifecycle.",
  },
  {
    id: "iso.supplier",
    framework: "iso_42001",
    label: "Supplier considerations",
    description: "Third-party / provider controls.",
  },
  {
    id: "iso.documented",
    framework: "iso_42001",
    label: "Documented information",
    description: "Records and evidence of the AIMS.",
  },
  // EU AI Act concepts
  {
    id: "euaia.role",
    framework: "eu_ai_act",
    label: "Provider / deployer role",
    description: "Role facts that affect obligations.",
  },
  {
    id: "euaia.purpose",
    framework: "eu_ai_act",
    label: "Intended purpose",
    description: "Stated purpose for applicability review.",
  },
  {
    id: "euaia.geography",
    framework: "eu_ai_act",
    label: "Geography / jurisdiction",
    description: "Geographic scope of placing on the market or use.",
  },
  {
    id: "euaia.high_impact",
    framework: "eu_ai_act",
    label: "High-impact decision signals",
    description: "Facts that may indicate elevated scrutiny — not a risk class.",
  },
  {
    id: "euaia.prohibited",
    framework: "eu_ai_act",
    label: "Prohibited-use indicators",
    description: "Flags for further legal review — not a determination.",
  },
  // OWASP GenAI
  {
    id: "owasp.prompt_injection",
    framework: "owasp_genai",
    label: "Prompt injection / abuse",
    description: "Input abuse and agent tool misuse themes.",
  },
  {
    id: "owasp.data_exposure",
    framework: "owasp_genai",
    label: "Sensitive data exposure",
    description: "Data categories and leakage risk themes.",
  },
  {
    id: "owasp.oversight",
    framework: "owasp_genai",
    label: "Human oversight & autonomy",
    description: "Oversight when high-impact or agentic decisions apply.",
  },
  {
    id: "owasp.supply_chain",
    framework: "owasp_genai",
    label: "Model / tool supply chain",
    description: "Provider and third-party model/tool themes.",
  },
] as const;

function tri(
  value: TriState,
  whenYes: ThemeApplicability,
  whenNo: ThemeApplicability = "not_applicable",
): ThemeApplicability {
  if (value === "yes") return whenYes;
  if (value === "no") return whenNo;
  return "not_determined";
}

/**
 * Map confirmed facts → theme applicability.
 * Unconfirmed / empty facts yield Not Determined — never invent a risk class.
 */
export function mapFactsToThemes(facts: GovernanceFacts): MappedTheme[] {
  const hasPurpose = facts.intendedPurpose.trim().length > 0;
  const hasGeo = facts.geography.trim().length > 0;
  const hasPersons = facts.affectedPersons.trim().length > 0;
  const hasData =
    facts.dataCategories.length > 0 && !facts.dataCategories.every((d) => d === "not_determined");
  const roleKnown = facts.providerDeployerPosture !== "undetermined";

  return FRAMEWORK_THEMES.map((theme) => {
    let applicability: ThemeApplicability = "not_determined";
    let rationale = "Insufficient confirmed facts.";

    switch (theme.id) {
      case "nist.govern":
      case "nist.map":
        applicability = hasPurpose || roleKnown ? "applicable" : "not_determined";
        rationale =
          hasPurpose || roleKnown
            ? "Purpose or role facts support mapping this function."
            : rationale;
        break;
      case "nist.measure":
      case "nist.manage":
        applicability =
          hasPurpose ||
          facts.highImpactDecisions === "yes" ||
          facts.prohibitedUseIndicators === "yes"
            ? "applicable"
            : "not_determined";
        rationale =
          applicability === "applicable"
            ? "Purpose or elevated signals support Measure/Manage themes."
            : rationale;
        break;
      case "iso.policy":
      case "iso.lifecycle":
        applicability = hasPurpose ? "applicable" : "not_determined";
        rationale = hasPurpose ? "Intended purpose is recorded." : rationale;
        break;
      case "iso.impact":
        applicability = tri(facts.highImpactDecisions, "applicable");
        if (facts.vulnerableGroups === "yes" || facts.criticalInfrastructure === "yes") {
          applicability = "applicable";
        }
        rationale =
          applicability === "applicable"
            ? "Impact-related facts are confirmed."
            : applicability === "not_applicable"
              ? "High-impact signals explicitly marked no."
              : rationale;
        break;
      case "iso.supplier":
        applicability =
          facts.providerDeployerPosture === "provider" || facts.providerDeployerPosture === "both"
            ? "applicable"
            : roleKnown
              ? "not_applicable"
              : "not_determined";
        rationale =
          applicability === "applicable"
            ? "Provider posture suggests supplier themes."
            : applicability === "not_applicable"
              ? "Deployer-only posture recorded."
              : rationale;
        break;
      case "iso.documented":
        applicability = hasPurpose || hasData ? "applicable" : "not_determined";
        rationale =
          applicability === "applicable" ? "Facts exist that should be documented." : rationale;
        break;
      case "euaia.role":
        applicability = roleKnown ? "applicable" : "not_determined";
        rationale = roleKnown ? `Posture: ${facts.providerDeployerPosture}.` : rationale;
        break;
      case "euaia.purpose":
        applicability = hasPurpose ? "applicable" : "not_determined";
        rationale = hasPurpose ? "Intended purpose captured." : rationale;
        break;
      case "euaia.geography":
        applicability = hasGeo ? "applicable" : "not_determined";
        rationale = hasGeo ? "Geography recorded." : rationale;
        break;
      case "euaia.high_impact":
        applicability = tri(facts.highImpactDecisions, "applicable");
        rationale =
          facts.highImpactDecisions === "yes"
            ? "High-impact decisions indicated — for CyberX review, not a risk class."
            : facts.highImpactDecisions === "no"
              ? "Marked as not high-impact."
              : rationale;
        break;
      case "euaia.prohibited":
        applicability = tri(facts.prohibitedUseIndicators, "applicable");
        rationale =
          facts.prohibitedUseIndicators === "yes"
            ? "Prohibited-use indicators flagged for legal review."
            : facts.prohibitedUseIndicators === "no"
              ? "No prohibited-use indicators recorded."
              : rationale;
        break;
      case "owasp.prompt_injection":
        applicability = hasPurpose ? "applicable" : "not_determined";
        rationale = hasPurpose
          ? "GenAI abuse themes apply when purpose involves AI systems."
          : rationale;
        break;
      case "owasp.data_exposure":
        applicability = hasData
          ? "applicable"
          : facts.biometrics === "yes"
            ? "applicable"
            : hasData === false && facts.biometrics === "no"
              ? "not_applicable"
              : "not_determined";
        if (facts.biometrics === "yes") applicability = "applicable";
        rationale =
          applicability === "applicable" ? "Data categories or biometrics confirmed." : rationale;
        break;
      case "owasp.oversight":
        applicability = tri(facts.highImpactDecisions, "applicable");
        if (hasPersons && facts.vulnerableGroups === "yes") applicability = "applicable";
        rationale =
          applicability === "applicable"
            ? "High-impact or vulnerable-group facts support oversight themes."
            : rationale;
        break;
      case "owasp.supply_chain":
        applicability =
          facts.providerDeployerPosture === "provider" ||
          facts.providerDeployerPosture === "both" ||
          facts.providerDeployerPosture === "deployer"
            ? "applicable"
            : "not_determined";
        rationale =
          applicability === "applicable" ? "Provider/deployer posture recorded." : rationale;
        break;
      default:
        break;
    }

    return { ...theme, applicability, rationale };
  });
}

/* ------------------------------------------------------------- delivery */

export const HANDOFF_DELIVERY_STATUSES = [
  "not_attempted",
  "endpoint_unavailable",
  "package_ready",
  "queued",
  "endpoint_delivered",
] as const;
export type HandoffDeliveryStatus = (typeof HANDOFF_DELIVERY_STATUSES)[number];

export function deliveryStatusLabel(status: HandoffDeliveryStatus): string {
  switch (status) {
    case "not_attempted":
      return "Not attempted";
    case "endpoint_unavailable":
      return "CyberX endpoint unavailable — package ready for download";
    case "package_ready":
      return "Signed-context package ready (not synchronized)";
    case "queued":
      return "Queued for human pickup (not synchronized)";
    case "endpoint_delivered":
      return "Delivered to CyberX endpoint";
  }
}

/** Never claim sync unless status is endpoint_delivered. */
export function claimsSynchronization(status: HandoffDeliveryStatus): boolean {
  return status === "endpoint_delivered";
}
