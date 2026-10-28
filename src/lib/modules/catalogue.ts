/**
 * Application-service catalogue for the UseCasesX modular monolith.
 *
 * This is the selective restructuring SoT: each domain names the paths it owns
 * today. We do **not** mass-move files or split deployables. New code should
 * land under the owning paths (or an agreed subfolder) and call other domains
 * only through documented entry points.
 */

import type { ArchitectureLayer } from "./layers";

export const APPLICATION_MODULE_IDS = [
  "identity_tenant",
  "discovery_studio",
  "use_case_management",
  "scoring_engine",
  "portfolio_management",
  "value_management",
  "kpi_benefit_tracking",
  "workflow_approvals",
  "collaboration",
  "ai_matching",
  "reporting",
  "integrations",
  "audit",
] as const;

export type ApplicationModuleId = (typeof APPLICATION_MODULE_IDS)[number];

/** Shared kernel modules that are not "product features" but policy/adapters. */
export const SHARED_MODULE_IDS = [
  "domain_kernel",
  "policy_rules",
  "data_adapters",
  "ai_adapters",
  "storage_adapters",
] as const;

export type SharedModuleId = (typeof SHARED_MODULE_IDS)[number];

export type ModuleId = ApplicationModuleId | SharedModuleId;

export type ModuleDescriptor = {
  id: ModuleId;
  label: string;
  layer: ArchitectureLayer;
  summary: string;
  /** Paths this module owns (globs / prefixes relative to repo root). */
  owns: readonly string[];
  /** Preferred public entry points other modules may import. */
  entrypoints: readonly string[];
  /** Module ids this one may call (application ↔ application = explicit). */
  dependsOn: readonly ModuleId[];
  /**
   * Status of the boundary today.
   * - established: clear folder / package seam
   * - partial: logic exists but still mixed with peers
   * - planned: named for structure; extraction deferred
   */
  maturity: "established" | "partial" | "planned";
};

export const MODULE_CATALOGUE: Record<ModuleId, ModuleDescriptor> = {
  identity_tenant: {
    id: "identity_tenant",
    label: "Identity & Tenant",
    layer: "application",
    summary:
      "Auth subject, organization/workspace membership, entitlements, tenant policy. Tenant context is membership-derived — never client tenant_id.",
    owns: [
      "src/lib/authz/",
      "src/lib/authz.server.ts",
      "src/lib/authz.functions.ts",
      "src/lib/entitlements.ts",
      "src/lib/workspace.functions.ts",
      "src/lib/workspace-selection.ts",
      "src/lib/organization.server.ts",
      "src/lib/organization.functions.ts",
      "src/lib/enterprise/",
      "src/hooks/useWorkspaceContext.ts",
      "src/hooks/useEntitlement.ts",
      // Phase 4 tenancy plane (when merged): src/lib/tenancy/, useTenantContext
    ],
    entrypoints: [
      "src/lib/authz/index.ts",
      "src/lib/workspace.functions.ts",
      "src/lib/entitlements.ts",
      "src/hooks/useWorkspaceContext.ts",
    ],
    dependsOn: ["policy_rules", "domain_kernel", "data_adapters"],
    maturity: "partial",
  },

  discovery_studio: {
    id: "discovery_studio",
    label: "Discovery Studio",
    layer: "application",
    summary:
      "Public repository browse/search, opportunity capture, Studio wizard surfaces, Opportunity Map.",
    owns: [
      "src/lib/usecasex.services.ts",
      "src/lib/usecasex.store.ts",
      "src/lib/use-cases.search.ts",
      "src/lib/use-cases.functions.ts",
      "src/lib/studio-wizard.ts",
      "src/lib/studio-wizard.functions.ts",
      "src/lib/domain/studio.repository.ts",
      "src/lib/domain/studio-lineage.repository.ts",
      "src/lib/opportunities.ts",
    ],
    entrypoints: [
      "src/lib/usecasex.services.ts",
      "src/lib/studio-wizard.functions.ts",
      "src/lib/domain/studio.repository.ts",
    ],
    dependsOn: ["identity_tenant", "use_case_management", "ai_matching", "domain_kernel"],
    maturity: "partial",
  },

  use_case_management: {
    id: "use_case_management",
    label: "Use Case Management",
    layer: "application",
    summary: "Tenant-owned use case lifecycle, boards, drafts, deliverables composition.",
    owns: [
      "src/lib/boards.ts",
      "src/lib/boards.functions.ts",
      "src/lib/drafts.ts",
      "src/lib/deliverables.ts",
      "src/lib/deliverables.data.ts",
      "src/lib/deliverables.export.ts",
      "src/lib/deliverables.compose.ts",
      "src/lib/domain/saved-use-cases.repository.ts",
      "src/lib/lifecycle/",
    ],
    entrypoints: [
      "src/lib/boards.functions.ts",
      "src/lib/domain/saved-use-cases.repository.ts",
      "src/lib/lifecycle/index.ts",
    ],
    dependsOn: ["identity_tenant", "domain_kernel", "policy_rules"],
    maturity: "partial",
  },

  scoring_engine: {
    id: "scoring_engine",
    label: "Scoring Engine",
    layer: "application",
    summary: "Feasibility / value / readiness scoring models and persisted scores.",
    owns: ["src/lib/scoring/", "src/lib/scoring.server.ts", "src/lib/scoring.functions.ts"],
    entrypoints: ["src/lib/scoring.functions.ts", "src/lib/scoring/model.ts"],
    dependsOn: ["identity_tenant", "use_case_management", "domain_kernel"],
    maturity: "established",
  },

  portfolio_management: {
    id: "portfolio_management",
    label: "Portfolio Management",
    layer: "application",
    summary: "Portfolios, items, shares, dependencies, prioritization into PortfolioX.",
    owns: [
      "src/lib/portfolio/",
      "src/lib/portfolio-model.ts",
      "src/lib/domain/portfolios.repository.ts",
      "src/lib/domain/portfolio-shares.repository.ts",
      "src/lib/domain/portfolio-audit.repository.ts",
    ],
    entrypoints: ["src/lib/portfolio/index.ts", "src/lib/domain/portfolios.repository.ts"],
    dependsOn: ["identity_tenant", "use_case_management", "scoring_engine", "domain_kernel"],
    maturity: "established",
  },

  value_management: {
    id: "value_management",
    label: "Value Management",
    layer: "application",
    summary: "Value hypotheses, contracts, ERP reconciliation hooks, value themes.",
    owns: ["src/lib/value/"],
    entrypoints: ["src/lib/value/"],
    dependsOn: ["identity_tenant", "use_case_management", "kpi_benefit_tracking", "domain_kernel"],
    maturity: "partial",
  },

  kpi_benefit_tracking: {
    id: "kpi_benefit_tracking",
    label: "KPI / Benefit Tracking",
    layer: "application",
    summary: "Benefits, evidence, baselines/targets, realization history.",
    owns: [
      "src/lib/domain/benefits.repository.ts",
      "src/lib/domain/benefit-evidence.repository.ts",
      "src/lib/domain/benefit-evidence-history.repository.ts",
      "src/lib/evidence/",
    ],
    entrypoints: [
      "src/lib/domain/benefits.repository.ts",
      "src/lib/domain/benefit-evidence.repository.ts",
    ],
    dependsOn: ["identity_tenant", "use_case_management", "domain_kernel"],
    maturity: "partial",
  },

  workflow_approvals: {
    id: "workflow_approvals",
    label: "Workflow & Approvals",
    layer: "application",
    summary: "Stage gates, reviews, decisions, segregation of duties.",
    owns: ["src/lib/gates/", "src/lib/governance/", "src/lib/handoffs/"],
    entrypoints: ["src/lib/gates/index.ts"],
    dependsOn: ["identity_tenant", "use_case_management", "policy_rules", "audit", "domain_kernel"],
    maturity: "partial",
  },

  collaboration: {
    id: "collaboration",
    label: "Collaboration",
    layer: "application",
    summary: "Comments, assignments, workshops, collab sessions.",
    owns: [
      "src/lib/collab.ts",
      "src/lib/collab.functions.ts",
      "src/lib/collab.server.ts",
      "src/lib/workshops/",
      "src/lib/workshops.server.ts",
      "src/lib/workshops.collab.server.ts",
    ],
    entrypoints: ["src/lib/collab.functions.ts"],
    dependsOn: ["identity_tenant", "use_case_management", "domain_kernel"],
    maturity: "partial",
  },

  ai_matching: {
    id: "ai_matching",
    label: "AI Matching",
    layer: "application",
    summary:
      "AI assistance, matching, bulk assist — always via server gateway; never provider secrets in the browser.",
    owns: ["src/lib/ai/", "src/lib/ai.functions.ts", "src/lib/fair-use.functions.ts"],
    entrypoints: ["src/lib/ai.functions.ts"],
    dependsOn: ["identity_tenant", "ai_adapters", "policy_rules", "domain_kernel"],
    maturity: "established",
  },

  reporting: {
    id: "reporting",
    label: "Reporting",
    layer: "application",
    summary: "Generated reports, exports, report access control.",
    owns: [
      "src/lib/reports/",
      "src/lib/roadmap/",
      "src/lib/roadmap-export.ts",
      "src/lib/domain/export-preferences.repository.ts",
    ],
    entrypoints: ["src/lib/reports/report-access.ts", "src/lib/reports/report-export.functions.ts"],
    dependsOn: ["identity_tenant", "use_case_management", "portfolio_management", "domain_kernel"],
    maturity: "partial",
  },

  integrations: {
    id: "integrations",
    label: "Integrations",
    layer: "application",
    summary:
      "Public HTTP/webhooks, suite handoffs, third-party connectors — signature-verified at the edge.",
    owns: [
      "src/routes/api/public/",
      "src/lib/api/",
      "src/lib/leads/",
      "src/lib/leadCapture.ts",
      "src/lib/cron-auth.server.ts",
    ],
    entrypoints: ["src/routes/api/public/", "src/lib/api/"],
    dependsOn: ["identity_tenant", "data_adapters", "policy_rules", "audit"],
    maturity: "partial",
  },

  audit: {
    id: "audit",
    label: "Audit",
    layer: "application",
    summary: "Append-only audit events and product/activation telemetry with tenant scope.",
    owns: [
      "src/lib/telemetry/",
      "src/lib/telemetry.functions.ts",
      "src/lib/observability/",
      "src/lib/observability.functions.ts",
      "src/lib/lifecycle/audit.ts",
      "src/lib/analytics/",
      "src/lib/module-analytics.ts",
    ],
    entrypoints: ["src/lib/telemetry/index.ts", "src/lib/lifecycle/audit.ts"],
    dependsOn: ["identity_tenant", "domain_kernel", "data_adapters"],
    maturity: "partial",
  },

  domain_kernel: {
    id: "domain_kernel",
    label: "Domain Kernel",
    layer: "domain_policy",
    summary: "Shared DomainError, ownership helpers, validation, pagination.",
    owns: [
      "src/lib/domain/errors.ts",
      "src/lib/domain/ownership.ts",
      "src/lib/domain/validation.ts",
      "src/lib/domain/pagination.ts",
      "src/lib/domain/index.ts",
    ],
    entrypoints: ["src/lib/domain/index.ts"],
    dependsOn: [],
    maturity: "established",
  },

  policy_rules: {
    id: "policy_rules",
    label: "Policy / Rules",
    layer: "domain_policy",
    summary: "Edition/role/scoped-permission evaluation, lifecycle transitions, fair-use policy.",
    owns: [
      "src/lib/authz/permission-service.ts",
      "src/lib/authz/scoped-permissions.ts",
      "src/lib/authz/editions.ts",
      "src/lib/authz/catalogue.ts",
      "src/lib/authz/roles.ts",
      "src/lib/lifecycle/",
      "src/lib/ai/fair-use.ts",
      "src/lib/enterprise/tenant-policy.ts",
    ],
    entrypoints: [
      "src/lib/authz/permission-service.ts",
      "src/lib/authz/scoped-permissions.ts",
      "src/lib/lifecycle/index.ts",
    ],
    dependsOn: ["domain_kernel"],
    maturity: "established",
  },

  data_adapters: {
    id: "data_adapters",
    label: "Data Adapters",
    layer: "adapters",
    summary: "Supabase clients, generated types, auth middleware — never edit generated files.",
    owns: [
      "src/integrations/supabase/",
      "supabase/",
      "src/lib/config.server.ts",
    ],
    entrypoints: [
      "src/integrations/supabase/client.ts",
      "src/integrations/supabase/auth-middleware.ts",
    ],
    dependsOn: [],
    maturity: "established",
  },

  ai_adapters: {
    id: "ai_adapters",
    label: "AI Adapters",
    layer: "adapters",
    summary: "Provider-neutral AI gateway and model routing (server-only).",
    owns: ["src/lib/ai/gateway.server.ts", "src/lib/ai/service.server.ts", "src/lib/ai/models.ts"],
    entrypoints: ["src/lib/ai/gateway.server.ts"],
    dependsOn: ["data_adapters"],
    maturity: "established",
  },

  storage_adapters: {
    id: "storage_adapters",
    label: "Storage Adapters",
    layer: "adapters",
    summary: "Object storage buckets, access policy, canvas blobs.",
    owns: ["src/lib/storage/"],
    entrypoints: ["src/lib/storage/buckets.ts", "src/lib/storage/storage-access.server.ts"],
    // Pure policy helpers under src/lib/storage/ stay with this adapter; do not
    // depend upward into the domain_policy layer.
    dependsOn: ["data_adapters"],
    maturity: "established",
  },
};

export function moduleOf(id: ModuleId): ModuleDescriptor {
  return MODULE_CATALOGUE[id];
}

export function applicationModules(): ModuleDescriptor[] {
  return APPLICATION_MODULE_IDS.map((id) => MODULE_CATALOGUE[id]);
}

export function modulesInLayer(layer: ArchitectureLayer): ModuleDescriptor[] {
  return Object.values(MODULE_CATALOGUE).filter((m) => m.layer === layer);
}

/** Owner module for a repo-relative path, if any catalogue `owns` prefix matches. */
export function ownerForPath(repoPath: string): ModuleDescriptor | null {
  const normalized = repoPath.replace(/\\/g, "/");
  let best: ModuleDescriptor | null = null;
  let bestLen = -1;
  for (const mod of Object.values(MODULE_CATALOGUE)) {
    for (const owned of mod.owns) {
      const prefix = owned.replace(/\\/g, "/");
      if (normalized === prefix || normalized.startsWith(prefix.replace(/\/?$/, "/")) || normalized.startsWith(prefix)) {
        if (prefix.length > bestLen) {
          best = mod;
          bestLen = prefix.length;
        }
      }
    }
  }
  return best;
}
