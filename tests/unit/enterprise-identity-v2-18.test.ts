/**
 * V2-18 — Enterprise identity, localization, sovereignty unit tests.
 */

import { describe, expect, it } from "bun:test";

import {
  emailDomain,
  domainAllowed,
  mayJitProvision,
  SCIM_STATUS,
  ssoConfigInputSchema,
} from "@/lib/enterprise/sso";
import {
  assertAiRouteAllowed,
  routeKeyForAlias,
  DATA_REGIONS,
  tenantPolicyInputSchema,
} from "@/lib/enterprise/tenant-policy";
import {
  isGrantActive,
  SUPPORT_ACCESS_MAX_HOURS,
  IMPERSONATION_PROHIBITED,
} from "@/lib/enterprise/support-access";
import { journeyStrings, localeDirection, isUiLocale } from "@/lib/i18n/locale";
import {
  REPORT_LANGUAGES,
  reportLanguageDirection,
  reportStrings,
  missingTranslations,
} from "@/lib/i18n/report-language";

describe("V2-18 SSO domain / JIT", () => {
  it("parses email domains", () => {
    expect(emailDomain("Ada@Example.GOV")).toBe("example.gov");
    expect(emailDomain("bad")).toBeNull();
  });

  it("enforces allow-list for JIT", () => {
    expect(
      mayJitProvision({
        enabled: true,
        jitEnabled: true,
        allowedDomains: ["example.gov"],
        email: "a@example.gov",
      }).ok,
    ).toBe(true);
    expect(
      mayJitProvision({
        enabled: true,
        jitEnabled: true,
        allowedDomains: ["example.gov"],
        email: "a@other.com",
      }),
    ).toEqual({ ok: false, reason: "domain_not_allowlisted" });
    expect(
      mayJitProvision({
        enabled: false,
        jitEnabled: true,
        allowedDomains: ["example.gov"],
        email: "a@example.gov",
      }).ok,
    ).toBe(false);
  });

  it("rejects empty domain lists in config schema", () => {
    expect(() =>
      ssoConfigInputSchema.parse({
        protocol: "oidc",
        enabled: true,
        allowedDomains: [],
      }),
    ).toThrow();
  });

  it("does not claim SCIM support", () => {
    expect(SCIM_STATUS.supported).toBe(false);
    expect(domainAllowed("a.com", ["a.com", "b.com"])).toBe(true);
  });
});

describe("V2-18 tenant AI route policy", () => {
  it("maps aliases to route keys", () => {
    expect(routeKeyForAlias(null)).toBe("default");
    expect(routeKeyForAlias("openai")).toBe("openai");
  });

  it("denies routes outside the allow-list", () => {
    expect(assertAiRouteAllowed(["default"], null).allowed).toBe(true);
    expect(assertAiRouteAllowed(["default"], "openai").allowed).toBe(false);
    expect(assertAiRouteAllowed(["openai", "gemini"], "openai").allowed).toBe(true);
  });

  it("accepts declared data regions", () => {
    expect(DATA_REGIONS).toContain("airgap_reserved");
    const parsed = tenantPolicyInputSchema.parse({
      dataRegion: "me",
      allowedAiProviderRoutes: ["default"],
      preferredLocale: "ar",
    });
    expect(parsed.preferredLocale).toBe("ar");
  });
});

describe("V2-18 support access", () => {
  it("expires and revokes correctly", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(
      isGrantActive(
        {
          startsAt: "2026-09-24T10:00:00Z",
          endsAt: "2026-09-24T14:00:00Z",
          revokedAt: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isGrantActive(
        {
          startsAt: "2026-09-24T10:00:00Z",
          endsAt: "2026-09-24T11:00:00Z",
          revokedAt: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isGrantActive(
        {
          startsAt: "2026-09-24T10:00:00Z",
          endsAt: "2026-09-24T14:00:00Z",
          revokedAt: "2026-09-24T11:00:00Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("caps grant window and prohibits impersonation", () => {
    expect(SUPPORT_ACCESS_MAX_HOURS).toBe(72);
    expect(IMPERSONATION_PROHIBITED.toLowerCase()).toContain("impersonation");
  });
});

describe("V2-18 i18n English + Arabic RTL", () => {
  it("marks Arabic as RTL for UI and reports", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
    expect(reportLanguageDirection("ar")).toBe("rtl");
    expect(isUiLocale("ar")).toBe(true);
  });

  it("covers Arabic report chrome for every canvas section", () => {
    expect(REPORT_LANGUAGES).toContain("ar");
    expect(missingTranslations("ar")).toEqual([]);
    expect(reportStrings("ar").canvasTitle.length).toBeGreaterThan(0);
    expect(journeyStrings("ar").signIn.length).toBeGreaterThan(0);
  });
});
