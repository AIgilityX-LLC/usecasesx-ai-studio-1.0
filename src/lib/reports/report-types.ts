/**
 * Generator report-type labels persisted in telemetry / generated_reports.
 * Shared by the Reports Hub catalogue and the workspace generator UI.
 */

export const GENERATOR_REPORT_TYPES = [
  "AI Use Case Summary Report",
  "AI Opportunity Portfolio Report",
  "AI Quick Wins Report",
  "Board AI Opportunity Brief",
  "Department AI Use Case Report",
  "AI Readiness and ROI Next-Step Report",
] as const;

export type GeneratorReportType = (typeof GENERATOR_REPORT_TYPES)[number];

/** Types that lead with per-use-case executive detail rather than roll-ups. */
export const USE_CASE_LED_REPORT_TYPES: readonly GeneratorReportType[] = [
  "AI Use Case Summary Report",
  "Department AI Use Case Report",
];

export function isGeneratorReportType(value: string): value is GeneratorReportType {
  return (GENERATOR_REPORT_TYPES as readonly string[]).includes(value);
}
