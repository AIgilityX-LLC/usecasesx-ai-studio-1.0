/**
 * Controlled rollout: enterprise_navigation_v2 stays OFF unless env is exactly "true".
 */
import { describe, expect, test } from "bun:test";
import { PUBLIC_LAUNCH_FEATURES } from "@/lib/feature-flags";

describe("enterprise_navigation_v2 flag", () => {
  test("is true only when env is exactly the string true", () => {
    // Bun/Vite may load a local .env; assert the predicate, not a hard-coded default.
    const raw = import.meta.env.VITE_ENTERPRISE_NAVIGATION_V2_ENABLED;
    expect(PUBLIC_LAUNCH_FEATURES.enterpriseNavigationV2).toBe(raw === "true");
  });
});
