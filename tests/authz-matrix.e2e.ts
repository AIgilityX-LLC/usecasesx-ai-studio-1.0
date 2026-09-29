/**
 * Role × edition authorization matrix.
 * Pure test over the permission service — no network, no database.
 * Run: bun run tests/authz-matrix.e2e.ts
 */
import {
  ANONYMOUS_SUBJECT,
  DEFAULT_FOUNDING_ACCESS,
  ENTITLEMENT_CATALOGUE,
  ENTITLEMENT_KEYS,
  can,
  evaluate,
  evaluateAll,
  mergeCapabilityFlags,
  resolveEdition,
  resolveFoundingAccess,
  resolveWorkspaceRole,
  type AuthzSubject,
  type Edition,
  type EntitlementKey,
  type WorkspaceRole,
} from "../src/lib/authz";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.error(
      `✗ ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  } else {
    console.log(`✓ ${label}`);
  }
}

function subject(
  role: WorkspaceRole | null,
  edition: Edition,
  extra: Partial<AuthzSubject> = {},
): AuthzSubject {
  return {
    userId: "u-1",
    edition,
    workspaceRole: role,
    isPlatformAdmin: false,
    ...extra,
  };
}

// ── 1. Anonymous (Lite public discovery) ──────────────────────────────────
check("anon can browse repository", can(ANONYMOUS_SUBJECT, "repository.browse"), true);
check("anon cannot create a use case", can(ANONYMOUS_SUBJECT, "usecase.create"), false);
check(
  "anon denial reason is unauthenticated",
  evaluate(ANONYMOUS_SUBJECT, "usecase.create").reason,
  "unauthenticated",
);
check("anon cannot see full catalogue", can(ANONYMOUS_SUBJECT, "repository.fullCatalogue"), false);

// ── 2. Role matrix ────────────────────────────────────────────────────────
const roleExpectations: Array<[WorkspaceRole, EntitlementKey, boolean]> = [
  ["viewer", "repository.browse", true],
  ["viewer", "usecase.create", false],
  ["viewer", "usecase.edit", false],
  ["viewer", "portfolio.view", true],
  ["viewer", "portfolio.manage", false],
  ["viewer", "members.manage", false],
  ["contributor", "usecase.create", true],
  ["contributor", "usecase.edit", true],
  ["contributor", "usecase.delete", false],
  ["contributor", "members.manage", false],
  ["facilitator", "usecase.edit", true],
  ["facilitator", "portfolio.manage", true],
  ["admin", "usecase.delete", true],
  ["admin", "members.manage", true],
  ["owner", "members.manage", true],
  ["owner", "audit.viewOwn", true],
];
for (const [role, key, expected] of roleExpectations) {
  check(`${role} → ${key}`, can(subject(role, "pro"), key), expected);
}

// ── 3. Edition gating ─────────────────────────────────────────────────────
check("lite owner cannot use AI assist", can(subject("owner", "lite"), "ai.assist"), false);
check(
  "lite denial reason is edition",
  evaluate(subject("owner", "lite"), "ai.assist").reason,
  "edition",
);
check("pro contributor can use AI assist", can(subject("contributor", "pro"), "ai.assist"), true);
check(
  "lite contributor can capture a use case",
  can(subject("contributor", "lite"), "usecase.create"),
  true,
);
check("pro owner cannot bulk AI assist", can(subject("owner", "pro"), "ai.bulkAssist"), false);
check(
  "enterprise owner can bulk AI assist",
  can(subject("owner", "enterprise"), "ai.bulkAssist"),
  true,
);
check(
  "pro owner cannot run advanced reports",
  can(subject("owner", "pro"), "reports.advanced"),
  false,
);

// ── 4. Feature-flagged Enterprise capabilities are honest ─────────────────
const flaggedOff: EntitlementKey[] = [
  "stageGates.manage",
  "usecase.review",
  "usecase.decide",
  "multiEntity.manage",
  "integrations.manage",
  "sso.configure",
  "audit.full",
];
for (const key of flaggedOff) {
  const decision = evaluate(subject("owner", "enterprise"), key);
  check(`${key} blocked while unshipped`, decision.allowed, false);
  check(`${key} reason is not_available`, decision.reason, "not_available");
}
check(
  "platform admin cannot bypass an unshipped capability",
  can(subject("owner", "enterprise", { isPlatformAdmin: true }), "sso.configure"),
  false,
);
check(
  "flag ON + enterprise owner unlocks SSO",
  can(
    subject("owner", "enterprise", { flags: mergeCapabilityFlags({ sso: true }) }),
    "sso.configure",
  ),
  true,
);
check(
  "flag ON but Pro edition still blocked on edition",
  evaluate(subject("owner", "pro", { flags: mergeCapabilityFlags({ sso: true }) }), "sso.configure")
    .reason,
  "edition",
);
check(
  "facilitator-only: contributor cannot facilitate",
  can(
    subject("contributor", "pro", { flags: mergeCapabilityFlags({ workshopMode: true }) }),
    "workshop.facilitate",
  ),
  false,
);
check(
  "facilitator can facilitate when workshops ship",
  can(
    subject("facilitator", "pro", { flags: mergeCapabilityFlags({ workshopMode: true }) }),
    "workshop.facilitate",
  ),
  true,
);

// ── 5. Platform staff surfaces ────────────────────────────────────────────
check(
  "member cannot manage taxonomy",
  can(subject("owner", "enterprise"), "admin.taxonomy"),
  false,
);
check(
  "platform admin can manage taxonomy",
  can(subject(null, "lite", { isPlatformAdmin: true }), "admin.taxonomy"),
  true,
);
check(
  "signed-out platform-admin claim is worthless",
  can({ ...ANONYMOUS_SUBJECT, isPlatformAdmin: true }, "admin.users"),
  false,
);

// ── 6. Membership requirement ─────────────────────────────────────────────
check(
  "signed-in non-member has no workspace rights",
  evaluate(subject(null, "pro"), "usecase.create").reason,
  "no_membership",
);

// ── 7. Founding Access configuration ──────────────────────────────────────
const beforeExpiry = new Date("2026-08-14T00:00:00.000Z");
const afterExpiry = new Date("2027-01-02T00:00:00.000Z");
check(
  "founding member is Pro before expiry",
  resolveEdition({ foundingMember: true }, DEFAULT_FOUNDING_ACCESS, beforeExpiry),
  "pro",
);
check(
  "founding member degrades to Lite after expiry",
  resolveEdition({ foundingMember: true }, DEFAULT_FOUNDING_ACCESS, afterExpiry),
  "lite",
);
const customFounding = resolveFoundingAccess("2027-06-30T23:59:59.000Z");
check(
  "founding expiry is configurable",
  resolveEdition({ foundingMember: true }, customFounding, afterExpiry),
  "pro",
);
check(
  "invalid override falls back to the default expiry",
  resolveFoundingAccess("not-a-date").expiresAt,
  DEFAULT_FOUNDING_ACCESS.expiresAt,
);
check(
  "expired profile entitlement degrades to Lite",
  resolveEdition(
    { storedTier: "pro", expiresAt: "2026-01-01T00:00:00.000Z" },
    DEFAULT_FOUNDING_ACCESS,
    beforeExpiry,
  ),
  "lite",
);
check(
  "org entitlement can raise the edition",
  resolveEdition({ orgPlanCode: "enterprise" }, DEFAULT_FOUNDING_ACCESS, beforeExpiry),
  "enterprise",
);

// ── 8. Role normalization from stored membership strings ──────────────────
check("workspace role wins over org role", resolveWorkspaceRole("viewer", "owner"), "viewer");
check("org role is the fallback", resolveWorkspaceRole(null, "admin"), "admin");
check("unknown role strings resolve to null", resolveWorkspaceRole("wizard", null), null);

// ── 9. Catalogue integrity ────────────────────────────────────────────────
check(
  "catalogue keys are self-consistent",
  ENTITLEMENT_KEYS.every((k) => ENTITLEMENT_CATALOGUE[k].key === k),
  true,
);
check(
  "every entitlement is decidable for a viewer",
  Object.keys(evaluateAll(subject("viewer", "lite"))).length,
  ENTITLEMENT_KEYS.length,
);

if (failures > 0) {
  console.error(`\n❌ Authorization matrix failed: ${failures} assertion(s).`);
  process.exit(1);
}
console.log("\n✅ Authorization matrix passed.");
