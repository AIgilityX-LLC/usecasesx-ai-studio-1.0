/**
 * Canvas V2 section keys (FR-03) — pure catalogue for V2-04 storage.
 * UI lands in V2-07; this module pins the stable section_key vocabulary.
 */

export const CANVAS_SECTION_KEYS = [
  "problem_workflow",
  "users_stakeholders",
  "outcome_alignment",
  "ai_capability",
  "human_authority",
  "data_rights",
  "vendor_build_buy",
  "integrations_process",
  "autonomy_limits",
  "risks_controls",
  "value_contract",
  "pilot_hypothesis",
  "owners_lifecycle",
] as const;

export type CanvasSectionKey = (typeof CANVAS_SECTION_KEYS)[number];

export const CANVAS_SECTION_LABEL: Record<CanvasSectionKey, string> = {
  problem_workflow: "Problem and current workflow",
  users_stakeholders: "Target users, stakeholders and affected groups",
  outcome_alignment: "Target outcome and strategic alignment",
  ai_capability: "AI capability and modality",
  human_authority: "Human role and decision authority",
  data_rights: "Data sources, classification, residency, quality and rights",
  vendor_build_buy: "Model/vendor/tool options and build/buy/partner posture",
  integrations_process: "Integrations and business-process changes",
  autonomy_limits: "Autonomy level and allowed/prohibited actions",
  risks_controls: "Risks, impacts, controls and evidence expectations",
  value_contract: "Value contract, cost, benefit and adoption assumptions",
  pilot_hypothesis: "Pilot hypothesis, success thresholds and stop/scale criteria",
  owners_lifecycle: "Responsible owner, reviewers and lifecycle status",
};

export const VERSION_KINDS = ["draft", "submitted", "published"] as const;
export type VersionKind = (typeof VERSION_KINDS)[number];

export function isCanvasSectionKey(value: string): value is CanvasSectionKey {
  return (CANVAS_SECTION_KEYS as readonly string[]).includes(value);
}
