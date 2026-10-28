/**
 * Enterprise Administration Center — section catalogue (client-safe).
 * Authorization is never decided here; routes gate via capability + server fns.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  UsersRound,
  Shield,
  KeyRound,
  Network,
  AppWindow,
  Lock,
  Globe2,
  Bot,
  ScrollText,
  Plug,
  ClipboardList,
  BarChart3,
  CreditCard,
  ToggleLeft,
  Download,
  LifeBuoy,
} from "lucide-react";

export const ENTERPRISE_ADMIN_SECTION_IDS = [
  "overview",
  "organization",
  "users",
  "groups",
  "roles-permissions",
  "authentication-sso",
  "business-units",
  "workspaces",
  "security",
  "data-residency",
  "ai-provider-policy",
  "privacy-retention",
  "integrations",
  "audit-logs",
  "usage",
  "subscription",
  "feature-entitlements",
  "data-export",
  "support-access",
] as const;

export type EnterpriseAdminSectionId = (typeof ENTERPRISE_ADMIN_SECTION_IDS)[number];

export type SectionIntegration =
  | "live"
  | "partial"
  | "placeholder";

export type EnterpriseAdminSection = {
  id: EnterpriseAdminSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** How this section is wired today. */
  integration: SectionIntegration;
  /** Existing product route to deep-link when helpful. */
  relatedTo?: string;
  /** Interface / server module expected for full integration. */
  todoInterface?: string;
};

export const ENTERPRISE_ADMIN_SECTIONS: Record<
  EnterpriseAdminSectionId,
  EnterpriseAdminSection
> = {
  overview: {
    id: "overview",
    label: "Overview",
    description: "Organization posture, open actions, and administration shortcuts.",
    icon: LayoutDashboard,
    integration: "live",
  },
  organization: {
    id: "organization",
    label: "Organization",
    description: "Legal entity profile, structure, and taxonomy ownership.",
    icon: Building2,
    integration: "partial",
    relatedTo: "/account/organization",
    todoInterface: "EnterpriseAdminOrganizationApi",
  },
  users: {
    id: "users",
    label: "Users",
    description: "Invite, deactivate, and review organization members.",
    icon: Users,
    integration: "placeholder",
    todoInterface: "EnterpriseAdminUsersApi",
  },
  groups: {
    id: "groups",
    label: "Groups",
    description: "Team and security groups for scoped access.",
    icon: UsersRound,
    integration: "placeholder",
    todoInterface: "EnterpriseAdminGroupsApi",
  },
  "roles-permissions": {
    id: "roles-permissions",
    label: "Roles & Permissions",
    description: "Workspace roles and capability matrix (read-only view of product roles).",
    icon: Shield,
    integration: "partial",
    todoInterface: "EnterpriseAdminRolesApi",
  },
  "authentication-sso": {
    id: "authentication-sso",
    label: "Authentication & SSO",
    description: "Customer IdP, domain allow-list, and JIT provisioning.",
    icon: KeyRound,
    integration: "live",
    relatedTo: "/account/organization",
  },
  "business-units": {
    id: "business-units",
    label: "Business Units",
    description: "Organization units used for portfolio and opportunity scoping.",
    icon: Network,
    integration: "live",
    relatedTo: "/account/organization",
  },
  workspaces: {
    id: "workspaces",
    label: "Workspaces",
    description: "Workspace inventory and membership for this organization.",
    icon: AppWindow,
    integration: "placeholder",
    todoInterface: "EnterpriseAdminWorkspacesApi",
  },
  security: {
    id: "security",
    label: "Security",
    description: "Security baseline links, break-glass posture, and control summaries.",
    icon: Lock,
    integration: "partial",
    relatedTo: "/account/security",
    todoInterface: "EnterpriseAdminSecurityApi",
  },
  "data-residency": {
    id: "data-residency",
    label: "Data & Residency",
    description: "Declared residency region and cross-border preferences.",
    icon: Globe2,
    integration: "live",
  },
  "ai-provider-policy": {
    id: "ai-provider-policy",
    label: "AI Provider Policy",
    description: "Permitted and prohibited AI providers for this tenant.",
    icon: Bot,
    integration: "live",
  },
  "privacy-retention": {
    id: "privacy-retention",
    label: "Privacy & Retention",
    description: "Retention and deletion preferences (sovereignty retention policy).",
    icon: ScrollText,
    integration: "placeholder",
    todoInterface: "EnterpriseAdminRetentionApi",
  },
  integrations: {
    id: "integrations",
    label: "Integrations",
    description: "Suite handoffs and external connectors.",
    icon: Plug,
    integration: "partial",
    relatedTo: "/handoffs",
    todoInterface: "EnterpriseAdminIntegrationsApi",
  },
  "audit-logs": {
    id: "audit-logs",
    label: "Audit Logs",
    description: "Governance-relevant events for this organization.",
    icon: ClipboardList,
    integration: "partial",
    relatedTo: "/admin-audit",
    todoInterface: "EnterpriseAdminAuditApi",
  },
  usage: {
    id: "usage",
    label: "Usage",
    description: "Export and AI activity for workspace administrators.",
    icon: BarChart3,
    integration: "partial",
    relatedTo: "/admin-observability",
  },
  subscription: {
    id: "subscription",
    label: "Subscription",
    description: "Plan, seats, and Founding Access / Enterprise engagement status.",
    icon: CreditCard,
    integration: "partial",
    relatedTo: "/entitlement",
    todoInterface: "EnterpriseAdminSubscriptionApi",
  },
  "feature-entitlements": {
    id: "feature-entitlements",
    label: "Feature Entitlements",
    description: "Entitlement flags resolved for this workspace (read-only).",
    icon: ToggleLeft,
    integration: "partial",
    relatedTo: "/entitlement",
  },
  "data-export": {
    id: "data-export",
    label: "Data Export",
    description: "Exit sovereignty — portfolio, roadmap, and package exports.",
    icon: Download,
    integration: "partial",
    relatedTo: "/reports",
    todoInterface: "EnterpriseAdminExportApi",
  },
  "support-access": {
    id: "support-access",
    label: "Support Access",
    description: "Time-bound operator grants without impersonation.",
    icon: LifeBuoy,
    integration: "live",
  },
};

export const ENTERPRISE_ADMIN_NAV = ENTERPRISE_ADMIN_SECTION_IDS.map(
  (id) => ENTERPRISE_ADMIN_SECTIONS[id],
);

export function isEnterpriseAdminSectionId(value: string): value is EnterpriseAdminSectionId {
  return (ENTERPRISE_ADMIN_SECTION_IDS as readonly string[]).includes(value);
}

export const ENTERPRISE_ADMIN_BASE = "/enterprise-admin" as const;
