/**
 * UseCasesX Sovereignty Architecture™ — eight product dimensions.
 *
 * Each dimension is a named product capability with required controls and
 * bindings to existing modules. This is not an infrastructure brochure:
 * posture is assessed from declared/enforced signals (see posture.ts).
 */

export const SOVEREIGNTY_DIMENSION_IDS = [
  "data",
  "infrastructure",
  "identity",
  "cryptographic",
  "ai",
  "operational",
  "audit",
  "exit",
] as const;

export type SovereigntyDimensionId = (typeof SOVEREIGNTY_DIMENSION_IDS)[number];

export type SovereigntyCapability = {
  id: string;
  label: string;
  /** Product surface that implements or declares this control today. */
  binding: string;
};

export type SovereigntyDimension = {
  id: SovereigntyDimensionId;
  label: string;
  /** One-line product promise. */
  promise: string;
  requiredCapabilities: readonly SovereigntyCapability[];
  /** Explicit non-claim until exit criteria are met. */
  nonClaim?: string;
};

/**
 * Canonical catalogue — order matches the product table
 * (Data → … → Exit). Do not reorder without updating docs/tests.
 */
export const SOVEREIGNTY_DIMENSIONS: Record<SovereigntyDimensionId, SovereigntyDimension> = {
  data: {
    id: "data",
    label: "Data sovereignty",
    promise: "Residency, classification, and retention under tenant policy.",
    requiredCapabilities: [
      {
        id: "residency",
        label: "Declared data residency region",
        binding: "src/lib/enterprise/tenant-policy.ts (dataRegion)",
      },
      {
        id: "classification",
        label: "Confidentiality / classification markings on exports & evidence",
        binding: "src/lib/roadmap/export-envelope.ts · src/lib/evidence/model.ts",
      },
      {
        id: "retention",
        label: "Retention labels and evidence cleanup contracts",
        binding: "evidence.retention_label · src/lib/value/evidence-cleanup.server.ts",
      },
    ],
  },
  infrastructure: {
    id: "infrastructure",
    label: "Infrastructure sovereignty",
    promise: "Customer or regional deployment without forking the product.",
    requiredCapabilities: [
      {
        id: "regional_deployment",
        label: "Region / private / air-gap reserved deployment posture",
        binding: "DATA_REGIONS + docs/v2/sovereignty-abstractions.md",
      },
      {
        id: "provider_ports",
        label: "Swappable infrastructure adapters (DB, storage, email)",
        binding: "src/lib/ports/ (Phase 6) when merged; storage/email seams today",
      },
    ],
    nonClaim:
      "airgap_reserved and private regions are declared preferences until a private pack is built and tested.",
  },
  identity: {
    id: "identity",
    label: "Identity sovereignty",
    promise: "Customer IdP as the source of truth for workforce access.",
    requiredCapabilities: [
      {
        id: "customer_idp",
        label: "OIDC/SAML SSO with domain allow-list + JIT",
        binding: "src/lib/enterprise/sso.ts",
      },
      {
        id: "continuous_authz",
        label: "Workspace membership + RLS as continuous authorization",
        binding: "auth middleware · RLS · scoped permissions",
      },
    ],
    nonClaim: "SCIM lifecycle is deferred (see SCIM_STATUS).",
  },
  cryptographic: {
    id: "cryptographic",
    label: "Cryptographic sovereignty",
    promise: "Customer-controlled keys for sensitive material where offered.",
    requiredCapabilities: [
      {
        id: "envelope_encryption",
        label: "Server-side envelope encryption for stored provider keys",
        binding: "src/lib/ai/engine-crypto.server.ts",
      },
      {
        id: "customer_keys",
        label: "Workspace-owned AI provider keys (optional)",
        binding: "src/lib/ai/engines.server.ts (allow_workspace_keys)",
      },
    ],
    nonClaim:
      "Full customer-managed KMS / BYOK for database and storage remains roadmap — do not claim platform-wide CMK.",
  },
  ai: {
    id: "ai",
    label: "AI sovereignty",
    promise: "Configurable model and provider under tenant allow-lists.",
    requiredCapabilities: [
      {
        id: "provider_allowlist",
        label: "Tenant AI provider route allow-list",
        binding: "assertAiRouteAllowed · allowedAiProviderRoutes",
      },
      {
        id: "provider_neutral_gateway",
        label: "Provider-neutral AI service boundary",
        binding: "src/lib/ai/* · ports/ai when Phase 6 is present",
      },
      {
        id: "local_route",
        label: "Reserved local / sovereign model route key",
        binding: "AI_PROVIDER_ROUTES includes local (not live offline)",
      },
    ],
    nonClaim: "`local` / air-gapped model routes are not a live offline inference claim.",
  },
  operational: {
    id: "operational",
    label: "Operational sovereignty",
    promise: "Privileged access is explicit, time-bound, and non-impersonating.",
    requiredCapabilities: [
      {
        id: "support_grants",
        label: "Time-bound support access grants",
        binding: "src/lib/enterprise/support-access.ts",
      },
      {
        id: "no_impersonation",
        label: "Operators act under their own identity only",
        binding: "IMPERSONATION_PROHIBITED",
      },
      {
        id: "role_separation",
        label: "Workspace roles separate from platform ops roles",
        binding: "user_roles · has_role() · platform-admin separation",
      },
    ],
  },
  audit: {
    id: "audit",
    label: "Audit sovereignty",
    promise: "Customer-owned evidence trails and exportable audit logs.",
    requiredCapabilities: [
      {
        id: "append_only_audit",
        label: "Append-only audit_events",
        binding: "src/lib/telemetry/recorder.ts",
      },
      {
        id: "export_receipts",
        label: "Export envelopes and admin audit export",
        binding: "roadmap-export · submissions.audit · reports hub",
      },
      {
        id: "security_events",
        label: "Security control event vocabulary",
        binding: "src/lib/ops/control-plane/events.ts",
      },
    ],
  },
  exit: {
    id: "exit",
    label: "Exit sovereignty",
    promise: "Export, migration, and portability without proprietary lock-in.",
    requiredCapabilities: [
      {
        id: "workspace_export",
        label: "Portfolio / roadmap / deliverable / report exports",
        binding: "export surfaces across Studio, PortfolioX, reports hub",
      },
      {
        id: "csv_contracts",
        label: "Documented CSV / package export contracts",
        binding: "docs/architecture/csv-export-contract.md",
      },
      {
        id: "adapter_portability",
        label: "Named provider swap points for migration",
        binding: "docs/v2/sovereignty-abstractions.md · src/lib/ports/",
      },
    ],
  },
};

export function sovereigntyDimensionList(): SovereigntyDimension[] {
  return SOVEREIGNTY_DIMENSION_IDS.map((id) => SOVEREIGNTY_DIMENSIONS[id]);
}

export function isSovereigntyDimensionId(value: string): value is SovereigntyDimensionId {
  return (SOVEREIGNTY_DIMENSION_IDS as readonly string[]).includes(value);
}
