/**
 * Sovereignty Control Plane — policy model + evaluation unit tests.
 */

import { describe, expect, test } from "bun:test";
import {
  SovereigntyControlPlane,
  defaultSovereigntyPolicy,
  regulatedBaselinePack,
  type SovereigntyPolicy,
} from "@/lib/sovereignty";

describe("policy model", () => {
  test("default policy covers all domain slices", () => {
    const p = defaultSovereigntyPolicy("org-1");
    expect(p.version).toBe(1);
    expect(p.data.permittedRegions.length).toBeGreaterThan(0);
    expect(p.ai.customerDataMayBeUsedExternally).toBe(false);
    expect(p.administrators.breakGlass.impersonationAllowed).toBe(false);
    expect(p.encryption.byokCapability).toBe(false);
    expect(p.exit.portabilityFormats).toContain("csv");
  });

  test("regulated pack tightens tokens without citing statutes", () => {
    const p = regulatedBaselinePack("org-2");
    expect(p.policyPackId).toBe("regulated_baseline_v1");
    expect(p.identity.customerSsoRequired).toBe(true);
    expect(p.data.crossBorder).toBe("permit_list_only");
    expect(p.ai.promptsMayLeaveDeploymentRegion).toBe(false);
  });
});

describe("data residency evaluation", () => {
  test("denies prohibited and unbound regions", () => {
    const policy = regulatedBaselinePack("org");
    expect(
      SovereigntyControlPlane.evaluateDataPlacement(policy.data, { region: "eu" }).effect,
    ).toBe("allow");
    expect(
      SovereigntyControlPlane.evaluateDataPlacement(policy.data, { region: "us" }).reason,
    ).toBe("region_not_permitted");
  });

  test("enforces cross-border permit list and classification binding", () => {
    const policy = regulatedBaselinePack("org");
    const cross = SovereigntyControlPlane.evaluateDataPlacement(policy.data, {
      region: "eu",
      transferTo: "us",
      classification: "confidential",
    });
    expect(cross.effect).toBe("deny");

    const bound = SovereigntyControlPlane.evaluateDataPlacement(policy.data, {
      region: "eu",
      transferTo: "private",
      classification: "confidential",
    });
    expect(bound.reason).toBe("classification_must_stay_in_region");
  });
});

describe("AI / identity / storage / crypto", () => {
  test("AI provider and prompt egress rules", () => {
    const policy = regulatedBaselinePack("org");
    expect(
      SovereigntyControlPlane.evaluateAiInvocation(policy.ai, {
        provider: "default",
        promptLeavesRegion: true,
      }).reason,
    ).toBe("prompts_may_not_leave_deployment_region");
    expect(
      SovereigntyControlPlane.isAllowed(
        SovereigntyControlPlane.evaluateAiInvocation(policy.ai, {
          provider: "local",
          localPrivateModel: true,
          promptLeavesRegion: false,
        }),
      ),
    ).toBe(true);
  });

  test("identity SSO and local account restrictions", () => {
    const policy = regulatedBaselinePack("org");
    expect(
      SovereigntyControlPlane.evaluateIdentityAuth(policy.identity, {
        provider: "email",
        localAccount: true,
      }).effect,
    ).toBe("deny");
    expect(
      SovereigntyControlPlane.evaluateIdentityAuth(policy.identity, {
        provider: "oidc",
      }).effect,
    ).toBe("allow");
  });

  test("storage namespace and private buckets", () => {
    const policy = defaultSovereigntyPolicy("org-ns");
    expect(
      SovereigntyControlPlane.evaluateStorageWrite(policy.storage, {
        provider: "supabase_storage",
        organizationId: "org-ns",
        bucketPrivate: false,
        namespace: "org-ns/ws/",
      }).reason,
    ).toBe("public_buckets_denied");
    expect(
      SovereigntyControlPlane.evaluateStorageWrite(policy.storage, {
        provider: "supabase_storage",
        organizationId: "org-ns",
        bucketPrivate: true,
        namespace: "org-ns/ws/",
      }).effect,
    ).toBe("allow");
  });

  test("BYOK remains denied until capability flagged", () => {
    const policy = defaultSovereigntyPolicy("org");
    expect(
      SovereigntyControlPlane.evaluateEncryptionMode(policy.encryption, {
        requestedMode: "byok_reserved",
      }).reason,
    ).toBe("byok_capability_reserved_not_live");
  });
});

describe("operations / audit / exit", () => {
  test("break-glass rejects impersonation and overlong grants", () => {
    const policy = defaultSovereigntyPolicy("org");
    expect(
      SovereigntyControlPlane.evaluateAdminAccess(policy.administrators, {
        kind: "break_glass",
        durationHours: 8,
        reasonProvided: true,
        impersonationRequested: true,
      }).reason,
    ).toBe("impersonation_prohibited");
    expect(
      SovereigntyControlPlane.evaluateAdminAccess(policy.administrators, {
        kind: "break_glass",
        durationHours: 100,
        reasonProvided: true,
      }).reason,
    ).toBe("privileged_access_duration_exceeded");
  });

  test("exit export and portability formats", () => {
    const policy = defaultSovereigntyPolicy("org");
    expect(
      SovereigntyControlPlane.evaluateExit(policy.exit, {
        kind: "portability",
        format: "csv",
      }).effect,
    ).toBe("allow");
    expect(
      SovereigntyControlPlane.evaluateExit(policy.exit, {
        kind: "portability",
        format: "parquet",
      }).reason,
    ).toBe("portability_format_not_permitted");
  });
});

describe("aggregate evaluate + legacy overlay", () => {
  test("routes subjects through evaluate()", () => {
    const policy = defaultSovereigntyPolicy("org");
    const d = SovereigntyControlPlane.evaluate(policy, {
      type: "exit",
      request: { kind: "complete_export" },
    });
    expect(d.effect).toBe("allow");
  });

  test("overlayLegacy maps V2-18 region and AI routes", () => {
    const base = defaultSovereigntyPolicy("org");
    const overlaid = SovereigntyControlPlane.overlayLegacy(base, {
      dataRegion: "me",
      allowedAiProviderRoutes: ["default", "local"],
    });
    expect(overlaid.data.residencyPreference).toBe("me");
    expect(overlaid.ai.permittedProviders).toEqual(["default", "local"]);
    const decision = SovereigntyControlPlane.evaluate(overlaid as SovereigntyPolicy, {
      type: "ai_invocation",
      request: { provider: "local", localPrivateModel: true },
    });
    expect(decision.effect).toBe("allow");
  });

  test("reason codes never look like statute citations", () => {
    const policy = regulatedBaselinePack("org");
    const d = SovereigntyControlPlane.evaluateDataPlacement(policy.data, { region: "us" });
    expect(d.reason).not.toMatch(/GDPR|article|PDPL|ITAR|Schrems/i);
    expect(d.clause).not.toMatch(/GDPR|article|PDPL|ITAR|Schrems/i);
  });
});
