/**
 * Controlled rollout: enterprise_navigation_v2 stays OFF unless env is exactly "true".
 */
import { describe, expect, test } from "bun:test";
import { PUBLIC_LAUNCH_FEATURES } from "@/lib/feature-flags";

describe("enterprise_navigation_v2 flag", () => {
  test("defaults to classic chrome when env is unset", () => {
    // Vite injects env at build time; unit tests see unset -> false.
    expect(PUBLIC_LAUNCH_FEATURES.enterpriseNavigationV2).toBe(false);
  });
});
