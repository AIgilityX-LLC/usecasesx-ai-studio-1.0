/**
 * Phase 8 — UseCasesX Sovereignty Architecture™ unit tests.
 */

import { describe, expect, test } from "bun:test";
import {
  GRADUAL_EVOLUTION_RULE,
  SOVEREIGNTY_DIMENSION_IDS,
  SovereigntyService,
  ZERO_TRUST_MAPPINGS,
  ZERO_TRUST_PILLARS,
  assessSovereigntyPosture,
  canAdvanceMaturity,
  meetsMaturity,
  nextMaturityStep,
  type SovereigntySignals,
} from "@/lib/sovereignty";

const baseSignals = (): SovereigntySignals => ({
  dataRegionDeclared: false,
  dataRegionPrivateOrAirgap: false,
  aiProviderAllowlistEnforced: false,
  customerAiProviderConfigured: false,
  customerIdpEnabled: false,
  workspaceKeysEnabled: false,
  engineKeyEncryptionConfigured: false,
  supportAccessControlsEnforced: false,
  auditExportAvailable: false,
  exitExportAvailable: false,
});

describe("catalogue", () => {
  test("publishes exactly eight dimensions in product order", () => {
    expect(SOVEREIGNTY_DIMENSION_IDS).toEqual([
      "data",
      "infrastructure",
      "identity",
      "cryptographic",
      "ai",
      "operational",
      "audit",
      "exit",
    ]);
    expect(SovereigntyService.listDimensions()).toHaveLength(8);
    expect(SovereigntyService.getDimension("ai").requiredCapabilities.length).toBeGreaterThan(0);
  });

  test("maps all Zero Trust pillars", () => {
    expect(ZERO_TRUST_PILLARS).toHaveLength(4);
    expect(ZERO_TRUST_MAPPINGS.map((m) => m.pillar).sort()).toEqual([...ZERO_TRUST_PILLARS].sort());
    expect(GRADUAL_EVOLUTION_RULE.toLowerCase()).toContain("one maturity");
  });
});

describe("maturity ladder", () => {
  test("enforces gradual evolution", () => {
    expect(nextMaturityStep("declared")).toBe("enforced");
    expect(canAdvanceMaturity("declared", "enforced")).toEqual({ ok: true });
    expect(canAdvanceMaturity("declared", "customer_controlled").ok).toBe(false);
    expect(canAdvanceMaturity("customer_controlled", "sovereign").ok).toBe(false);
    expect(meetsMaturity("enforced", "declared")).toBe(true);
    expect(meetsMaturity("declared", "enforced")).toBe(false);
  });
});

describe("posture assessment", () => {
  test("blocks sovereign public claims without attestation", () => {
    const posture = assessSovereigntyPosture(baseSignals());
    expect(posture.claimsBlocked).toContain("sovereign_maturity_requires_attested_exit_criteria");
    expect(SovereigntyService.publicClaimAllowed(posture).allowed).toBe(false);
    for (const id of SOVEREIGNTY_DIMENSION_IDS) {
      expect(posture.dimensions[id].level).not.toBe("sovereign");
    }
  });

  test("raises identity and AI when customer controls are on", () => {
    const posture = SovereigntyService.assess({
      ...baseSignals(),
      dataRegionDeclared: true,
      auditExportAvailable: true,
      aiProviderAllowlistEnforced: true,
      customerAiProviderConfigured: true,
      customerIdpEnabled: true,
      engineKeyEncryptionConfigured: true,
      workspaceKeysEnabled: true,
      supportAccessControlsEnforced: true,
      exitExportAvailable: true,
    });
    expect(posture.dimensions.identity.level).toBe("customer_controlled");
    expect(posture.dimensions.ai.level).toBe("customer_controlled");
    expect(posture.dimensions.cryptographic.level).toBe("customer_controlled");
    expect(posture.dimensions.data.level).toBe("enforced");
  });

  test("attested exit criteria can unlock sovereign maturity", () => {
    const posture = SovereigntyService.assess({
      ...baseSignals(),
      dataRegionDeclared: true,
      dataRegionPrivateOrAirgap: true,
      aiProviderAllowlistEnforced: true,
      customerAiProviderConfigured: true,
      customerIdpEnabled: true,
      workspaceKeysEnabled: true,
      engineKeyEncryptionConfigured: true,
      supportAccessControlsEnforced: true,
      auditExportAvailable: true,
      exitExportAvailable: true,
      sovereignExitCriteriaAttested: true,
    });
    expect(posture.dimensions.ai.level).toBe("sovereign");
    expect(SovereigntyService.publicClaimAllowed(posture).allowed).toBe(true);
  });

  test("compares enterprise plan targets", () => {
    const posture = SovereigntyService.assess({
      ...baseSignals(),
      dataRegionDeclared: true,
      auditExportAvailable: true,
      aiProviderAllowlistEnforced: true,
      customerIdpEnabled: true,
      supportAccessControlsEnforced: true,
      exitExportAvailable: true,
      engineKeyEncryptionConfigured: true,
    });
    const gaps = SovereigntyService.gapsForTier(posture, "enterprise");
    expect(gaps.find((g) => g.dimension === "identity")?.met).toBe(true);
    expect(gaps.find((g) => g.dimension === "ai")?.met).toBe(false);
  });

  test("flags private/airgap declaration without operational pack", () => {
    const posture = assessSovereigntyPosture({
      ...baseSignals(),
      dataRegionDeclared: true,
      dataRegionPrivateOrAirgap: true,
    });
    expect(posture.claimsBlocked).toContain("do_not_claim_airgap_or_private_cloud_support");
    expect(posture.dimensions.infrastructure.gaps).toContain("regional_private_pack_not_deployed");
  });
});
