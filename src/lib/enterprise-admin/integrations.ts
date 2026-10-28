/**
 * Integration contracts for Enterprise Administration Center.
 *
 * UI must call real server functions / these interfaces — never invent
 * authorization decisions in components. Placeholder sections render a
 * labelled stub until a concrete server module implements the contract.
 */

/** TODO: list / invite / deactivate organization members (server-enforced). */
export type EnterpriseAdminUsersApi = {
  listMembers(organizationId: string): Promise<unknown>;
  inviteMember(input: unknown): Promise<unknown>;
  deactivateMember(memberId: string): Promise<unknown>;
};

/** TODO: security groups CRUD. */
export type EnterpriseAdminGroupsApi = {
  listGroups(organizationId: string): Promise<unknown>;
  saveGroup(input: unknown): Promise<unknown>;
};

/** TODO: custom role packs beyond launch roles (Enterprise). */
export type EnterpriseAdminRolesApi = {
  listRoleAssignments(organizationId: string): Promise<unknown>;
};

/** TODO: organization workspace inventory beyond active context. */
export type EnterpriseAdminWorkspacesApi = {
  listWorkspaces(organizationId: string): Promise<unknown>;
};

/** TODO: org-wide security posture board. */
export type EnterpriseAdminSecurityApi = {
  getSecurityPosture(organizationId: string): Promise<unknown>;
};

/** TODO: persist retention pack from SovereigntyControlPlane.retention. */
export type EnterpriseAdminRetentionApi = {
  getRetentionPolicy(organizationId: string): Promise<unknown>;
  saveRetentionPolicy(input: unknown): Promise<unknown>;
};

/** TODO: connector registry beyond suite handoffs. */
export type EnterpriseAdminIntegrationsApi = {
  listConnectors(organizationId: string): Promise<unknown>;
};

/** TODO: org-scoped audit query API (today: link to existing audit surfaces). */
export type EnterpriseAdminAuditApi = {
  queryAuditEvents(input: unknown): Promise<unknown>;
};

/** TODO: commercial subscription management beyond entitlement read. */
export type EnterpriseAdminSubscriptionApi = {
  getSubscription(organizationId: string): Promise<unknown>;
};

/** TODO: one-click tenant export package (exit sovereignty). */
export type EnterpriseAdminExportApi = {
  requestFullExport(organizationId: string): Promise<unknown>;
};

/** TODO: richer org profile fields beyond units/taxonomy. */
export type EnterpriseAdminOrganizationApi = {
  getOrganizationProfile(organizationId: string): Promise<unknown>;
  updateOrganizationProfile(input: unknown): Promise<unknown>;
};

/**
 * Registry of unimplemented contracts — for docs and placeholder UI only.
 * Do not treat presence here as authorization.
 */
export const ENTERPRISE_ADMIN_TODO_APIS = [
  "EnterpriseAdminUsersApi",
  "EnterpriseAdminGroupsApi",
  "EnterpriseAdminRolesApi",
  "EnterpriseAdminWorkspacesApi",
  "EnterpriseAdminSecurityApi",
  "EnterpriseAdminRetentionApi",
  "EnterpriseAdminIntegrationsApi",
  "EnterpriseAdminAuditApi",
  "EnterpriseAdminSubscriptionApi",
  "EnterpriseAdminExportApi",
  "EnterpriseAdminOrganizationApi",
] as const;
