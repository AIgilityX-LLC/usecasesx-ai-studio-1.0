/**
 * Operator responsibility matrix for deployment profiles.
 *
 * Self-hosted Supabase (or equivalent Postgres/Auth/Storage stack) is supported
 * as *one* backend option for customer-controlled profiles. When the customer
 * (or their operator) self-hosts, they own provisioning, hardening, patching,
 * DB maintenance, HA, scalability, backups, DR and monitoring — matching
 * upstream self-hosting guidance. That is why self-host is an option inside
 * the Sovereignty Architecture, not the architecture itself.
 */

import type { DeploymentProfileId } from "./profiles";

export const OPERATOR_CONCERNS = [
  "provisioning",
  "hardening",
  "patching",
  "database_maintenance",
  "high_availability",
  "scalability",
  "backups",
  "disaster_recovery",
  "monitoring",
] as const;

export type OperatorConcern = (typeof OPERATOR_CONCERNS)[number];

export type ResponsibilityOwner = "aigilityx" | "customer" | "shared";

export type BackendOptionId =
  | "lovable_cloud_managed"
  | "dedicated_managed_supabase"
  | "self_hosted_supabase"
  | "customer_postgres_ports";

export type BackendOption = {
  id: BackendOptionId;
  label: string;
  /** Profiles where this backend is a realistic choice. */
  profiles: readonly DeploymentProfileId[];
  /**
   * Who owns each ops concern when this backend is selected.
   * `shared` = AIgilityX ships the app pack; customer runs the plane.
   */
  responsibilities: Record<OperatorConcern, ResponsibilityOwner>;
  notes: string;
};

/**
 * Backend catalogue. Sovereignty is expressed by ports/adapters + profiles;
 * self-hosted Supabase is one row — never the only path.
 */
export const BACKEND_OPTIONS: Record<BackendOptionId, BackendOption> = {
  lovable_cloud_managed: {
    id: "lovable_cloud_managed",
    label: "AIgilityX-managed cloud (default SaaS)",
    profiles: ["cloud_saas"],
    responsibilities: {
      provisioning: "aigilityx",
      hardening: "aigilityx",
      patching: "aigilityx",
      database_maintenance: "aigilityx",
      high_availability: "aigilityx",
      scalability: "aigilityx",
      backups: "aigilityx",
      disaster_recovery: "aigilityx",
      monitoring: "aigilityx",
    },
    notes: "Default for Cloud SaaS. Logical multi-tenant isolation.",
  },
  dedicated_managed_supabase: {
    id: "dedicated_managed_supabase",
    label: "Dedicated managed database / project",
    profiles: ["dedicated_cloud", "sovereign_cloud_vpc"],
    responsibilities: {
      provisioning: "shared",
      hardening: "shared",
      patching: "shared",
      database_maintenance: "shared",
      high_availability: "shared",
      scalability: "shared",
      backups: "shared",
      disaster_recovery: "shared",
      monitoring: "shared",
    },
    notes: "Dedicated environment; ops split defined in the Enterprise Design Partner contract.",
  },
  self_hosted_supabase: {
    id: "self_hosted_supabase",
    label: "Self-hosted Supabase (customer/operator)",
    profiles: ["sovereign_cloud_vpc", "sovereign_private"],
    responsibilities: {
      provisioning: "customer",
      hardening: "customer",
      patching: "customer",
      database_maintenance: "customer",
      high_availability: "customer",
      scalability: "customer",
      backups: "customer",
      disaster_recovery: "customer",
      monitoring: "customer",
    },
    notes:
      "Supported option for control/isolation — not the sole sovereignty architecture. Operator owns the full self-host ops surface.",
  },
  customer_postgres_ports: {
    id: "customer_postgres_ports",
    label: "Customer Postgres (+ auth/storage/AI) via ports & adapters",
    profiles: ["sovereign_cloud_vpc", "sovereign_private"],
    responsibilities: {
      provisioning: "customer",
      hardening: "customer",
      patching: "customer",
      database_maintenance: "customer",
      high_availability: "customer",
      scalability: "customer",
      backups: "customer",
      disaster_recovery: "customer",
      monitoring: "customer",
    },
    notes:
      "Preferred long-term sovereign path: Phase 6 ports/adapters without requiring Supabase brand/runtime.",
  },
};

export function backendsForProfile(profileId: DeploymentProfileId): BackendOption[] {
  return Object.values(BACKEND_OPTIONS).filter((b) => b.profiles.includes(profileId));
}

export function customerOwnsFullOps(backendId: BackendOptionId): boolean {
  const r = BACKEND_OPTIONS[backendId].responsibilities;
  return OPERATOR_CONCERNS.every((c) => r[c] === "customer");
}

/** Product rule — keep this string stable for docs/tests. */
export const SELF_HOST_IS_OPTION_NOT_ARCHITECTURE =
  "Self-hosted Supabase is one deployment backend option for customer-controlled profiles. UseCasesX Sovereignty Architecture™ and ports/adapters define sovereignty; self-host ops responsibility sits with the customer/operator.";
