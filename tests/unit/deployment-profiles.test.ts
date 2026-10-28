/**
 * Phase 9 — Four UseCasesX deployment profiles unit tests.
 */

import { describe, expect, test } from "bun:test";
import {
  BACKEND_OPTIONS,
  DEPLOYMENT_PROFILE_IDS,
  DeploymentProfileService,
  OPERATOR_CONCERNS,
  SELF_HOST_IS_OPTION_NOT_ARCHITECTURE,
  customerOwnsFullOps,
} from "@/lib/deployment";
import { SovereigntyService } from "@/lib/sovereignty";

describe("catalogue", () => {
  test("publishes exactly four profiles in product order", () => {
    expect(DEPLOYMENT_PROFILE_IDS).toEqual([
      "cloud_saas",
      "dedicated_cloud",
      "sovereign_cloud_vpc",
      "sovereign_private",
    ]);
    const list = DeploymentProfileService.list();
    expect(list).toHaveLength(4);
    expect(list[0]!.productName).toBe("UseCasesX Cloud SaaS");
    expect(list[1]!.productName).toBe("UseCasesX Dedicated Cloud");
    expect(list[2]!.productName).toBe("UseCasesX Sovereign Cloud / Customer VPC");
    expect(list[3]!.productName).toBe("UseCasesX Sovereign Private");
  });

  test("maps highlights customers care about", () => {
    expect(DeploymentProfileService.get("cloud_saas").isolation).toBe("logical_multi_tenant");
    expect(DeploymentProfileService.get("dedicated_cloud").highlights).toContain(
      "Enterprise SSO",
    );
    expect(DeploymentProfileService.get("sovereign_cloud_vpc").highlights).toContain(
      "Customer KMS",
    );
    expect(DeploymentProfileService.get("sovereign_private").highlights).toContain(
      "Optional disconnected operation",
    );
  });
});

describe("self-host is option not architecture", () => {
  test("documents the product rule", () => {
    expect(SELF_HOST_IS_OPTION_NOT_ARCHITECTURE.toLowerCase()).toContain("one deployment");
    expect(DeploymentProfileService.selfHostIsOptionNotArchitecture).toBe(
      SELF_HOST_IS_OPTION_NOT_ARCHITECTURE,
    );
  });

  test("self-hosted supabase is optional/common — never the only backend", () => {
    expect(DeploymentProfileService.get("cloud_saas").selfHostedSupabase).toBe("not_applicable");
    expect(DeploymentProfileService.get("dedicated_cloud").selfHostedSupabase).toBe("optional");
    expect(DeploymentProfileService.get("sovereign_cloud_vpc").selfHostedSupabase).toBe(
      "common_option",
    );
    expect(DeploymentProfileService.get("sovereign_private").selfHostedSupabase).toBe(
      "common_option",
    );

    const sovereignBackends = DeploymentProfileService.backendsFor("sovereign_private").map(
      (b) => b.id,
    );
    expect(sovereignBackends).toContain("self_hosted_supabase");
    expect(sovereignBackends).toContain("customer_postgres_ports");
    expect(sovereignBackends.length).toBeGreaterThan(1);
  });

  test("customer owns full ops when self-hosting", () => {
    expect(customerOwnsFullOps("self_hosted_supabase")).toBe(true);
    expect(customerOwnsFullOps("customer_postgres_ports")).toBe(true);
    expect(customerOwnsFullOps("lovable_cloud_managed")).toBe(false);
    for (const concern of OPERATOR_CONCERNS) {
      expect(BACKEND_OPTIONS.self_hosted_supabase.responsibilities[concern]).toBe("customer");
    }
  });
});

describe("fit recommendation", () => {
  test("recommends SaaS for light requirements", () => {
    const rec = DeploymentProfileService.recommend({});
    expect(rec.profileId).toBe("cloud_saas");
  });

  test("recommends dedicated for dedicated + SSO", () => {
    const rec = DeploymentProfileService.recommend({
      dedicatedEnvironment: true,
      enterpriseSso: true,
    });
    expect(rec.profileId).toBe("dedicated_cloud");
  });

  test("recommends sovereign VPC for regulated + customer VPC/KMS", () => {
    const rec = DeploymentProfileService.recommend({
      regulatedSector: true,
      customerVpc: true,
      customerKeyAndIam: true,
      enterpriseSso: true,
    });
    expect(rec.profileId).toBe("sovereign_cloud_vpc");
  });

  test("forces sovereign private for on-prem / disconnected", () => {
    const rec = DeploymentProfileService.recommend({
      onPremOrDisconnected: true,
      regulatedSector: true,
    });
    expect(rec.profileId).toBe("sovereign_private");
    const fits = DeploymentProfileService.scoreFit({ onPremOrDisconnected: true });
    expect(
      fits.find((f) => f.profileId === "cloud_saas")?.blockers,
    ).toContain("on_prem_or_disconnected_requires_sovereign_private");
  });
});

describe("claim gates + sovereignty readiness", () => {
  test("blocks live sovereign profile claims without attestation", () => {
    expect(
      DeploymentProfileService.mayClaimProfileLive("sovereign_private", {
        contractuallySelected: true,
        sovereigntyAttestedForProfile: false,
      }).allowed,
    ).toBe(false);
    expect(
      DeploymentProfileService.mayClaimProfileLive("cloud_saas", {
        contractuallySelected: true,
        sovereigntyAttestedForProfile: false,
      }).allowed,
    ).toBe(true);
  });

  test("readiness gaps use Phase 8 posture targets", () => {
    const posture = SovereigntyService.assess({
      dataRegionDeclared: true,
      dataRegionPrivateOrAirgap: false,
      aiProviderAllowlistEnforced: true,
      customerAiProviderConfigured: false,
      customerIdpEnabled: false,
      workspaceKeysEnabled: false,
      engineKeyEncryptionConfigured: true,
      supportAccessControlsEnforced: true,
      auditExportAvailable: true,
      exitExportAvailable: true,
    });
    const gaps = DeploymentProfileService.readinessGaps("dedicated_cloud", posture);
    expect(gaps.find((g) => g.dimension === "identity")?.met).toBe(false);
    expect(gaps.find((g) => g.dimension === "cryptographic")?.met).toBe(true);
    expect(gaps.find((g) => g.dimension === "exit")?.target).toBe("customer_controlled");
  });
});
