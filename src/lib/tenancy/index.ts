/**
 * Enterprise multi-tenancy plane — central exports.
 *
 * Prefer these modules over ad-hoc tenant filters in UI components:
 * - TenantContext (hook / server resolve)
 * - AuthorizationService
 * - PolicyService
 * - EntitlementService
 */

export * from "./models";
export * from "./hierarchy";
export * from "./tenant-context";
export * from "./authorization-service";
export * from "./policy-service";
export * from "./entitlement-service";
export * from "./scope";
