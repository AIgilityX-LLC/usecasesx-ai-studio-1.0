import { describe, expect, test } from "bun:test";
import {
  APPLICATION_MODULE_IDS,
  MODULE_CATALOGUE,
  applicationModules,
  modulesInLayer,
  ownerForPath,
} from "@/lib/modules/catalogue";
import {
  applicationServiceLabels,
  assertCatalogueHealthy,
  isAllowedModuleDependency,
  packagingDecision,
  validateCatalogueLayers,
  validateNoUiLeak,
} from "@/lib/modules/boundaries";
import {
  ARCHITECTURE_LAYERS,
  LAYER_LABEL,
  canDependOn,
  isUpwardDependency,
} from "@/lib/modules/layers";
import { BFF_LAYER } from "@/lib/modules/bff";

describe("packaging decision", () => {
  test("rejects microservices; affirms modular monolith", () => {
    const d = packagingDecision();
    expect(d.microservices).toBe(false);
    expect(d.modularMonolith).toBe(true);
    expect(d.rationale.toLowerCase()).toContain("modular monolith");
  });
});

describe("layers", () => {
  test("orders UI → BFF → application → domain_policy → adapters", () => {
    expect([...ARCHITECTURE_LAYERS]).toEqual([
      "web_ui",
      "api_bff",
      "application",
      "domain_policy",
      "adapters",
    ]);
    expect(LAYER_LABEL.application).toContain("Application");
    expect(canDependOn("application", "domain_policy")).toBe(true);
    expect(canDependOn("adapters", "application")).toBe(false);
    expect(isUpwardDependency("adapters", "web_ui")).toBe(true);
  });

  test("BFF is TanStack server fns, not a separate process", () => {
    expect(BFF_LAYER.runtime).toBe("tanstack_start_server_fns");
    expect(BFF_LAYER.rules.length).toBeGreaterThan(0);
  });
});

describe("application service catalogue", () => {
  test("includes the thirteen architecture-diagram services", () => {
    expect(APPLICATION_MODULE_IDS).toHaveLength(13);
    expect(applicationServiceLabels()).toEqual([
      "Identity & Tenant",
      "Discovery Studio",
      "Use Case Management",
      "Scoring Engine",
      "Portfolio Management",
      "Value Management",
      "KPI / Benefit Tracking",
      "Workflow & Approvals",
      "Collaboration",
      "AI Matching",
      "Reporting",
      "Integrations",
      "Audit",
    ]);
  });

  test("every application module owns at least one path and entrypoint", () => {
    for (const mod of applicationModules()) {
      expect(mod.owns.length).toBeGreaterThan(0);
      expect(mod.entrypoints.length).toBeGreaterThan(0);
      expect(mod.layer).toBe("application");
    }
  });

  test("shared kernel and adapters are present", () => {
    expect(modulesInLayer("domain_policy").map((m) => m.id)).toContain("domain_kernel");
    expect(modulesInLayer("domain_policy").map((m) => m.id)).toContain("policy_rules");
    expect(modulesInLayer("adapters").map((m) => m.id)).toEqual(
      expect.arrayContaining(["data_adapters", "ai_adapters", "storage_adapters"]),
    );
  });

  test("ownerForPath resolves known files to owning modules", () => {
    expect(ownerForPath("src/lib/scoring/model.ts")?.id).toBe("scoring_engine");
    expect(ownerForPath("src/lib/domain/errors.ts")?.id).toBe("domain_kernel");
    expect(ownerForPath("src/lib/gates/gates.functions.ts")?.id).toBe("workflow_approvals");
    expect(ownerForPath("src/routes/api/public/usecasex/foo.ts")?.id).toBe("integrations");
  });
});

describe("boundary integrity", () => {
  test("catalogue has no layer or UI-leak violations", () => {
    expect(validateCatalogueLayers()).toEqual([]);
    expect(validateNoUiLeak()).toEqual([]);
    expect(() => assertCatalogueHealthy()).not.toThrow();
  });

  test("declared dependsOn edges are allowed; upward edges are not", () => {
    expect(isAllowedModuleDependency("scoring_engine", "identity_tenant")).toBe(true);
    expect(isAllowedModuleDependency("scoring_engine", "scoring_engine")).toBe(true);
    // adapters must not climb into application via catalogue
    expect(isAllowedModuleDependency("data_adapters", "reporting")).toBe(false);
  });

  test("every dependsOn target exists in the catalogue", () => {
    for (const mod of Object.values(MODULE_CATALOGUE)) {
      for (const dep of mod.dependsOn) {
        expect(MODULE_CATALOGUE[dep]).toBeDefined();
      }
    }
  });
});
