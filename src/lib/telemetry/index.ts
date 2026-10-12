/**
 * Client-safe telemetry barrel.
 *
 * `recorder.server.ts` is intentionally NOT re-exported here — server-only
 * code must import it directly from inside a handler.
 */
export * from "./events";
export {
  recordAuditEvent,
  recordAuditEventDetailed,
  type AuditEventReceipt,
  recordProductEvent,
  logAppError,
  setTelemetryTenant,
  getTelemetryTenant,
} from "./recorder";
export {
  moduleFromPath,
  moduleFromSectionId,
  planFromTier,
  roleCategoryFromWorkspaceRole,
  sanitizeNavProperties,
  trackCommandPaletteOpened,
  trackModuleOpened,
  trackNavEvent,
  trackNavSearchUsed,
  trackNavigationClicked,
  trackSidebarToggle,
  trackWorkspaceSwitched,
  workspaceTypeFromPlan,
  type NavAnalyticsBase,
  type NavEventProperties,
  type NavPlan,
  type NavRoleCategory,
  type NavWorkspaceType,
} from "./navigation-analytics";
