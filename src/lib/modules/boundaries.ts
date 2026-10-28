/**
 * Boundary rules for the modular monolith.
 *
 * Pure helpers — safe for unit tests and future CI import scanners.
 * They do not move code; they encode what “strict domain boundaries” means.
 */

import {
  MODULE_CATALOGUE,
  type ApplicationModuleId,
  type ModuleDescriptor,
  type ModuleId,
} from "./catalogue";
import { canDependOn, isUpwardDependency, type ArchitectureLayer } from "./layers";

export type BoundaryViolation = {
  from: ModuleId;
  to: ModuleId;
  reason: string;
};

/** Declared dependency edges must respect layer ranking. */
export function validateCatalogueLayers(
  catalogue: Record<ModuleId, ModuleDescriptor> = MODULE_CATALOGUE,
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  for (const mod of Object.values(catalogue)) {
    for (const depId of mod.dependsOn) {
      const dep = catalogue[depId];
      if (!dep) {
        violations.push({
          from: mod.id,
          to: depId,
          reason: `Unknown dependency module: ${depId}`,
        });
        continue;
      }
      if (isUpwardDependency(mod.layer, dep.layer)) {
        violations.push({
          from: mod.id,
          to: dep.id,
          reason: `Upward dependency ${mod.layer} → ${dep.layer} is forbidden`,
        });
      }
      if (!canDependOn(mod.layer, dep.layer) && mod.layer !== dep.layer) {
        violations.push({
          from: mod.id,
          to: dep.id,
          reason: `Layer ${mod.layer} may not depend on ${dep.layer}`,
        });
      }
    }
  }
  return violations;
}

/** Application modules must not declare a dependency on web_ui or api_bff layers. */
export function validateNoUiLeak(
  catalogue: Record<ModuleId, ModuleDescriptor> = MODULE_CATALOGUE,
): BoundaryViolation[] {
  const forbidden: ArchitectureLayer[] = ["web_ui", "api_bff"];
  const violations: BoundaryViolation[] = [];
  for (const mod of Object.values(catalogue)) {
    if (mod.layer === "web_ui" || mod.layer === "api_bff") continue;
    for (const depId of mod.dependsOn) {
      const dep = catalogue[depId];
      if (dep && forbidden.includes(dep.layer)) {
        violations.push({
          from: mod.id,
          to: dep.id,
          reason: "Lower layers must not depend on Web UI or BFF modules",
        });
      }
    }
  }
  return violations;
}

/**
 * Whether `caller` is allowed to import from `callee` per the catalogue graph.
 * Same-module is always allowed. Undeclared cross-module edges are soft-denied
 * (return false) so new edges must be added intentionally.
 */
export function isAllowedModuleDependency(caller: ModuleId, callee: ModuleId): boolean {
  if (caller === callee) return true;
  const from = MODULE_CATALOGUE[caller];
  const to = MODULE_CATALOGUE[callee];
  if (!from || !to) return false;
  if (isUpwardDependency(from.layer, to.layer)) return false;
  return from.dependsOn.includes(callee);
}

export type PackagingDecision = {
  microservices: false;
  modularMonolith: true;
  rationale: string;
};

/** Explicit product decision — keep this assertable in tests. */
export function packagingDecision(): PackagingDecision {
  return {
    microservices: false,
    modularMonolith: true,
    rationale:
      "Prefer a modular monolith with strict domain boundaries. Microservices add operational complexity before the product needs independent deployability, separate data stores, or team-scale isolation.",
  };
}

/** Stable ordered list of application service labels (architecture diagram). */
export function applicationServiceLabels(): string[] {
  const order: ApplicationModuleId[] = [
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
  ];
  return order.map((id) => MODULE_CATALOGUE[id].label);
}

export function assertCatalogueHealthy(): void {
  const layerIssues = validateCatalogueLayers();
  const uiIssues = validateNoUiLeak();
  const all = [...layerIssues, ...uiIssues];
  if (all.length > 0) {
    const detail = all.map((v) => `${v.from} → ${v.to}: ${v.reason}`).join("; ");
    throw new Error(`Module catalogue boundary violations: ${detail}`);
  }
}
