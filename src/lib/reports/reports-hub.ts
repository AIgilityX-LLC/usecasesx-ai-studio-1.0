/**
 * Reports Hub catalogue — single source of truth for report cards, routes,
 * permissions, and implementation status.
 *
 * Output architecture is modular: today's live formats are print/PDF + CSV
 * (see `report-access.ts`). Future Excel / PowerPoint / Word adapters can
 * register against the same hub ids without adding sidebar entries.
 */

import type { NavCapability } from "@/lib/authz/nav-capabilities";
import type { ExportFormat } from "@/lib/reports/report-access";
import type { GeneratorReportType } from "@/lib/reports/report-types";

/** Shipped export surfaces. */
export type LiveOutputFormat = ExportFormat;

/**
 * Documented future adapters — never offered as live download buttons.
 */
export const FUTURE_OUTPUT_FORMATS = ["xlsx", "pptx", "docx"] as const;
export type FutureOutputFormat = (typeof FUTURE_OUTPUT_FORMATS)[number];

export type ReportHubStatus = "available" | "planned";

export type ReportHubItem = {
  id: string;
  /** URL segment under `/reports/$slug`. */
  slug: string;
  label: string;
  summary: string;
  audience: string;
  /** Nav capability required to see the card / open the route. */
  capability: NavCapability;
  /** Extra capability for generate/export actions when available. */
  generateCapability?: NavCapability;
  requiredData: readonly string[];
  /** Formats the existing engine can actually produce today. */
  liveFormats: readonly LiveOutputFormat[];
  /** Formats reserved for future adapters (not implemented). */
  plannedFormats: readonly FutureOutputFormat[];
  status: ReportHubStatus;
  /** When available: which generator recipe to open. */
  generatorType?: GeneratorReportType;
  /** Honest gaps — shown on planned cards / detail. */
  missingImplementation: readonly string[];
  existingImplementation: string;
};

/**
 * Hub entries. Global sidebar links only to `/reports` — never to these slugs.
 */
export const REPORTS_HUB_ITEMS: readonly ReportHubItem[] = [
  {
    id: "executive-summary",
    slug: "executive-summary",
    label: "Executive Summary",
    summary:
      "Department-oriented summary of selected AI use cases for leadership briefings.",
    audience: "Executives, AI leaders, department sponsors",
    capability: "report.read",
    generateCapability: "report.generate",
    requiredData: [
      "Saved use cases (repository content)",
      "Optional scores and notes",
      "Profile organization / author fields",
    ],
    liveFormats: ["pdf", "csv", "csv_benefits"],
    plannedFormats: ["xlsx", "pptx"],
    status: "available",
    generatorType: "Department AI Use Case Report",
    existingImplementation:
      "Workspace report generator (`ReportDocument` + `buildPortfolioReport`) with Department AI Use Case Report recipe.",
    missingImplementation: [
      "Dedicated executive pack layout (current output uses the shared document template)",
      "Native Excel / PowerPoint export",
    ],
  },
  {
    id: "board-pack",
    slug: "board-pack",
    label: "Board Pack",
    summary: "Board-ready brief of AI opportunities with narrative and provenance.",
    audience: "Board members, investment committee, sponsors",
    capability: "report.read",
    generateCapability: "report.generate",
    requiredData: [
      "Saved use cases",
      "Scores where captured",
      "Optional portfolio decisions when selected",
    ],
    liveFormats: ["pdf", "csv", "csv_benefits"],
    plannedFormats: ["xlsx", "pptx"],
    status: "available",
    generatorType: "Board AI Opportunity Brief",
    existingImplementation:
      "Generator recipe “Board AI Opportunity Brief” on the shared report engine.",
    missingImplementation: ["Slide-deck (PPTX) board pack", "Auto-assembled appendix pack"],
  },
  {
    id: "portfolio",
    slug: "portfolio",
    label: "Portfolio Report",
    summary: "Roll-up of a selected portfolio: decisions, funding, delivery and value.",
    audience: "Portfolio managers, PMO, workspace admins",
    capability: "report.read",
    generateCapability: "report.generate",
    requiredData: [
      "At least one readable portfolio",
      "Portfolio item decisions / funding / delivery fields",
      "Saved use-case content for members",
      "Studio benefits when lineage resolves",
    ],
    liveFormats: ["pdf", "csv", "csv_benefits"],
    plannedFormats: ["xlsx", "pptx"],
    status: "available",
    generatorType: "AI Opportunity Portfolio Report",
    existingImplementation:
      "Generator recipe “AI Opportunity Portfolio Report” with portfolio picker and visible-portfolio RLS list.",
    missingImplementation: ["Multi-portfolio comparison report"],
  },
  {
    id: "ai-investment",
    slug: "ai-investment",
    label: "AI Investment Report",
    summary: "Investment thesis across ranked opportunities, funding and sequencing.",
    audience: "CFO / investment committee, portfolio owners",
    capability: "report.read",
    requiredData: [
      "Portfolio funding states",
      "Ranked initiatives",
      "Approved benefits / ROI assumptions",
    ],
    liveFormats: [],
    plannedFormats: ["xlsx", "pptx"],
    status: "planned",
    existingImplementation:
      "No dedicated investment report. Closest live recipes: Portfolio Report and Quick Wins (generator-only, not a hub product).",
    missingImplementation: [
      "Investment-specific narrative and funding roll-up template",
      "Print/PDF and CSV assembly for an investment report",
      "Capital request / wave view",
    ],
  },
  {
    id: "roi-value",
    slug: "roi-value",
    label: "ROI / Value Report",
    summary: "Readiness and value next-steps with benefit provenance from Studio.",
    audience: "Value office, finance partners, use-case owners",
    capability: "report.read",
    generateCapability: "report.generate",
    requiredData: [
      "Saved use cases",
      "Scores (incl. governance readiness dimension when present)",
      "Studio benefits (`use_case_benefits`) via slug→studio lineage",
    ],
    liveFormats: ["pdf", "csv", "csv_benefits"],
    plannedFormats: ["xlsx"],
    status: "available",
    generatorType: "AI Readiness and ROI Next-Step Report",
    existingImplementation:
      "Generator recipe “AI Readiness and ROI Next-Step Report” plus on-document ValueSummary.",
    missingImplementation: [
      "ERP-verified benefit section as a first-class chapter",
      "Native Excel value register export beyond CSV",
    ],
  },
  {
    id: "governance-summary",
    slug: "governance-summary",
    label: "Governance Summary",
    summary: "Gate decisions, conditions and control posture across the workspace.",
    audience: "Governance / risk reviewers, workspace admins",
    capability: "report.read",
    requiredData: [
      "Decision gate reviews and events",
      "Open conditions / change requests",
      "Optional C3G governance preview fields",
    ],
    liveFormats: [],
    plannedFormats: ["xlsx"],
    status: "planned",
    existingImplementation:
      "Gate inbox UI (`/reviews`) and per–use-case governance preview exist; no aggregated governance report document.",
    missingImplementation: [
      "Cross-use-case gate status roll-up report",
      "Export of decision events with SoD metadata",
      "Print/PDF and CSV assembly for governance summary",
    ],
  },
  {
    id: "use-case-business-case",
    slug: "use-case-business-case",
    label: "Use Case Business Case",
    summary: "Per–use-case executive detail for a selected set of saved use cases.",
    audience: "Use-case owners, sponsors, reviewers",
    capability: "report.read",
    generateCapability: "report.generate",
    requiredData: [
      "Saved use cases with repository content",
      "Optional scores, notes, priorities",
      "Optional benefits via Studio lineage",
    ],
    liveFormats: ["pdf", "csv", "csv_benefits"],
    plannedFormats: ["docx", "pptx"],
    status: "available",
    generatorType: "AI Use Case Summary Report",
    existingImplementation:
      "Generator recipe “AI Use Case Summary Report” (use-case-led document layout).",
    missingImplementation: ["Word business-case template", "Single-use-case deep link from Studio"],
  },
  {
    id: "export-center",
    slug: "export-center",
    label: "Export Center",
    summary: "Role-aware exports of workspace report data (print/PDF and CSV).",
    audience: "Any workspace member permitted by the export matrix",
    capability: "report.read",
    requiredData: ["Same inputs as the report you export from"],
    liveFormats: ["pdf", "csv", "csv_benefits"],
    plannedFormats: ["xlsx", "pptx"],
    status: "available",
    existingImplementation:
      "`canExportReport` matrix + `downloadUseCaseCsv` / `downloadBenefitsCsv` / `printReport` with server re-check.",
    missingImplementation: [
      "Standalone bulk export jobs",
      "Excel workbook and PowerPoint adapters",
      "Scheduled / emailed exports",
    ],
  },
];

export function getReportHubItem(slug: string): ReportHubItem | undefined {
  return REPORTS_HUB_ITEMS.find((item) => item.slug === slug);
}

export function availableReportHubItems(
  has: (capability: NavCapability) => boolean,
): ReportHubItem[] {
  return REPORTS_HUB_ITEMS.filter((item) => has(item.capability));
}

/** Paths for nav integrity (hub + each slug). */
export function collectReportsHubTargets(): string[] {
  return ["/reports", ...REPORTS_HUB_ITEMS.map((item) => `/reports/${item.slug}`)];
}
