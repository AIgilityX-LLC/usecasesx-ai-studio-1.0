/**
 * Authz query caching policy.
 *
 * Regression cover for the provisioning race: a freshly created Pro user whose
 * workspace/membership rows land after first render must not be frozen in a
 * lite/viewer subject by the 60s staleTime.
 */
import { describe, expect, it } from "vitest";
import {
  AUTHZ_PROVISIONING_POLL_MS,
  AUTHZ_RESOLVED_STALE_MS,
  authzQueryPolicy,
  isAuthzSubjectResolved,
} from "@/lib/authz/query-policy";

describe("authzQueryPolicy", () => {
  it("treats a missing subject as unresolved and never caches it", () => {
    const policy = authzQueryPolicy(null);
    expect(policy.resolved).toBe(false);
    expect(policy.staleTime).toBe(0);
    expect(policy.refetchInterval).toBe(AUTHZ_PROVISIONING_POLL_MS);
  });

  it("keeps polling while the workspace exists but membership has not landed", () => {
    const policy = authzQueryPolicy({ workspaceId: "ws-1", workspaceRole: null, edition: "pro" });
    expect(policy.resolved).toBe(false);
    // staleTime 0 is the load-bearing assertion: with a non-zero value the
    // entitlement UI would keep rendering the half-provisioned subject.
    expect(policy.staleTime).toBe(0);
    expect(policy.refetchInterval).toBe(AUTHZ_PROVISIONING_POLL_MS);
  });

  it("keeps polling while a role exists but tenancy has not landed", () => {
    const policy = authzQueryPolicy({ workspaceId: null, workspaceRole: "owner" });
    expect(policy.resolved).toBe(false);
    expect(policy.refetchInterval).toBe(AUTHZ_PROVISIONING_POLL_MS);
  });

  it("caches only once tenancy and role are both provisioned", () => {
    const policy = authzQueryPolicy({
      workspaceId: "ws-1",
      workspaceRole: "owner",
      edition: "pro",
    });
    expect(policy.resolved).toBe(true);
    expect(policy.staleTime).toBe(AUTHZ_RESOLVED_STALE_MS);
    expect(policy.refetchInterval).toBe(false);
  });

  it("resolves a provisioning sequence deterministically", () => {
    const sequence = [
      null,
      { workspaceId: null, workspaceRole: null },
      { workspaceId: "ws-1", workspaceRole: null },
      { workspaceId: "ws-1", workspaceRole: "owner" },
    ];
    const resolvedFlags = sequence.map(isAuthzSubjectResolved);
    expect(resolvedFlags).toEqual([false, false, false, true]);
    // Every pre-final step must schedule another read, otherwise the UI stalls.
    expect(
      sequence.slice(0, -1).every((s) => authzQueryPolicy(s).refetchInterval !== false),
    ).toBe(true);
  });
});
