import { describe, expect, test } from "bun:test";
import {
  claimsSynchronization,
  emptyGovernanceFacts,
  FRAMEWORK_THEMES,
  GOVERNANCE_DISCLAIMER,
  mapFactsToThemes,
} from "@/lib/governance/model";
import {
  buildCyberXPackage,
  CYBERX_HANDOFF_CONTRACT_VERSION,
  integrityHashOf,
  resolveCyberXDelivery,
} from "@/lib/governance/package";

describe("governance facts → theme mapping", () => {
  test("empty facts yield mostly not_determined", () => {
    const mapped = mapFactsToThemes(emptyGovernanceFacts());
    expect(mapped.length).toBe(FRAMEWORK_THEMES.length);
    expect(mapped.filter((m) => m.applicability === "not_determined").length).toBeGreaterThan(10);
  });

  test("confirmed high-impact and purpose mark themes applicable", () => {
    const mapped = mapFactsToThemes(
      emptyGovernanceFacts({
        intendedPurpose: "Citizen benefits triage assistant",
        providerDeployerPosture: "deployer",
        geography: "EU",
        highImpactDecisions: "yes",
        prohibitedUseIndicators: "no",
        dataCategories: ["personal_data"],
      }),
    );
    const byId = Object.fromEntries(mapped.map((m) => [m.id, m]));
    expect(byId["euaia.purpose"]?.applicability).toBe("applicable");
    expect(byId["euaia.geography"]?.applicability).toBe("applicable");
    expect(byId["euaia.high_impact"]?.applicability).toBe("applicable");
    expect(byId["euaia.prohibited"]?.applicability).toBe("not_applicable");
    expect(byId["owasp.data_exposure"]?.applicability).toBe("applicable");
  });

  test("disclaimer is conspicuous and non-certifying", () => {
    expect(GOVERNANCE_DISCLAIMER.toLowerCase()).toContain("not legal advice");
    expect(GOVERNANCE_DISCLAIMER.toLowerCase()).toContain("certification");
  });
});

describe("CyberX signed-context package", () => {
  test("package includes contract version, disclaimer and integrity hash", () => {
    const pkg = buildCyberXPackage({
      organizationId: null,
      workspaceId: "11111111-1111-1111-1111-111111111111",
      useCase: { id: "22222222-2222-2222-2222-222222222222", title: "Test" },
      facts: emptyGovernanceFacts({ intendedPurpose: "Demo" }),
      consentConfirmed: true,
      deliveryStatus: "package_ready",
    });
    expect(pkg.contractVersion).toBe(CYBERX_HANDOFF_CONTRACT_VERSION);
    expect(pkg.disclaimer).toBe(GOVERNANCE_DISCLAIMER);
    expect(pkg.consent.confirmed).toBe(true);
    expect(pkg.integrityHash).toMatch(/^[0-9a-f]{8}$/);
    expect(pkg.facts.intendedPurpose).toBe("Demo");
  });

  test("integrity hash is stable for identical canonical body", () => {
    expect(integrityHashOf('{"a":1}')).toBe(integrityHashOf('{"a":1}'));
  });

  test("unavailable endpoint never claims synchronization", () => {
    const r = resolveCyberXDelivery(false);
    expect(r.status).toBe("package_ready");
    expect(claimsSynchronization(r.status)).toBe(false);
    expect(r.message.toLowerCase()).toContain("not");
    expect(r.message.toLowerCase()).toMatch(/synchron/);
  });
});
