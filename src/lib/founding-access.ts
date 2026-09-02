/**
 * Founding Access commercial terms and edition definitions.
 *
 * Single source of truth for what each edition includes and what "subject to
 * fair-use limits" actually means. Fair-use numbers are read from the same
 * pure policy module the server enforces (`src/lib/ai/fair-use.ts`) so the
 * public page can never advertise a limit the product does not apply.
 */
import { limitsForEdition } from "@/lib/ai/fair-use";

export const FOUNDING_ACCESS_END = "31 December 2026";
export const LAUNCH_DATE = "2 October 2026";
/** Machine-readable launch moment (09:00 UTC on the launch date). */
export const LAUNCH_TIMESTAMP_UTC = "2026-10-02T09:00:00Z";

export type EditionKey = "lite" | "pro" | "enterprise";

export interface EditionDefinition {
  key: EditionKey;
  name: string;
  positioning: string;
  price: string;
  priceNote: string;
  audience: string;
  /** Capabilities that are live today for this edition. */
  includes: string[];
  /** Designed into the architecture but not live in this edition today. */
  notLive?: string[];
  cta: { label: string; to: string };
}

export const EDITIONS: EditionDefinition[] = [
  {
    key: "lite",
    name: "UseCasesX Lite",
    positioning: "Discover",
    price: "Free",
    priceNote: "No account required to browse.",
    audience: "Anyone researching where AI can credibly be applied.",
    includes: [
      "Browse and search the public AI use case repository",
      "Filter by industry, business function, AI capability, value, complexity and risk",
      "Read full use case detail pages with provenance and quality status",
      "Download a Lite PDF for an individual use case",
      "Public collections curated by theme and sector",
    ],
    cta: { label: "Explore the repository", to: "/repository" },
  },
  {
    key: "pro",
    name: "Pro Founding Access",
    positioning: "Design · Prioritize · Manage",
    price: "Complimentary",
    priceNote: `Through ${FOUNDING_ACCESS_END}, subject to the fair-use limits below.`,
    audience: "Practitioners and teams turning opportunities into an investable portfolio.",
    includes: [
      "Capture opportunities and design use cases in AI Use Case Studio™",
      "Score feasibility, data readiness and value with saved results per use case",
      "Prioritize into PortfolioX™ and sequence a delivery roadmap",
      "Track baseline, target and expected benefits per use case",
      "Generate and export a branded deliverables package",
      "Lightweight collaboration: workspace invitations, comments and assignments",
    ],
    cta: { label: "Join Founding Access", to: "/pricing" },
  },
  {
    key: "enterprise",
    name: "Enterprise Design Partner",
    positioning: "Scale · Govern",
    price: "Engagement-based",
    priceNote: "Sold through a paid Enterprise Design Partner engagement.",
    audience: "Organizations standardising AI portfolio governance across entities.",
    includes: [
      "Everything in Pro across multiple workspaces",
      "Advisory-led discovery and value design workshops",
      "Structured handoffs into the wider SovereignX AI Suite",
      "Append-only audit events for governance-relevant actions",
    ],
    notLive: [
      "Group-of-companies portfolio roll-up",
      "SSO and directory-based provisioning",
      "Automated ERP benefit verification",
      "Deployment outside the managed cloud",
    ],
    cta: { label: "Discuss a design partnership", to: "/enterprise" },
  },
];

export interface FairUseRow {
  edition: string;
  perUserPerDay: number;
  perWorkspacePerDay: number;
}

/** Published fair-use limits for AI assistance, per rolling 24 hours. */
export function fairUseTable(): FairUseRow[] {
  return [
    { edition: "Lite", ...limitsForEdition("lite") },
    { edition: "Pro Founding Access", ...limitsForEdition("pro") },
    { edition: "Enterprise", ...limitsForEdition("enterprise") },
  ];
}

/** Plain-language Founding Access terms shown wherever the offer is made. */
export const FOUNDING_ACCESS_TERMS: string[] = [
  `Pro Founding Access is complimentary through ${FOUNDING_ACCESS_END}. No card is required and no charge is applied during that period.`,
  "AI assistance is metered per user and per workspace over a rolling 24-hour window. When a limit is reached, AI generation pauses until the window resets; everything you have already created stays available.",
  "Non-AI work — capturing opportunities, scoring, portfolios, roadmaps and exports — is not metered by these limits.",
  "Founding Access is intended for evaluation and real working use by your own organisation, not for resale or automated bulk extraction of the repository.",
  `Pricing after ${FOUNDING_ACCESS_END} has not been set. We will give Founding Access workspaces written notice before any paid plan applies, and your data remains exportable.`,
  "Limits may be adjusted if usage threatens platform stability. Any change is published on this page.",
];

/** Verifiable statements about the product. No customer or certification claims. */
export const TRUST_FACTS: { title: string; body: string }[] = [
  {
    title: "Every published use case carries provenance",
    body: "Records are published only after passing a quality gate that requires a provenance label and a quality status. Both are shown on the use case page and can be filtered in the repository.",
  },
  {
    title: "Workspace-isolated data",
    body: "Every tenant row is owned by a workspace and protected by row-level security in the database, not only in the interface.",
  },
  {
    title: "Append-only audit events",
    body: "Governance-relevant actions — publishing, exporting, handoffs, membership changes — are written to an append-only audit trail.",
  },
  {
    title: "Demonstration data is labelled and excluded",
    body: "Demonstration scenarios live in labelled template workspaces, are copied into your workspace with a visible “(Sample)” suffix and template lineage, and are excluded from product metrics.",
  },
  {
    title: "No AI provider secrets in the browser",
    body: "AI requests are executed server-side. Provider credentials are never present in client code or public configuration.",
  },
  {
    title: "Your content is exportable",
    body: "Portfolios, roadmaps, scorecards and deliverables can be exported as PDF or CSV at any time from your workspace.",
  },
];
