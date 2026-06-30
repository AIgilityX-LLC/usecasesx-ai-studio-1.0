import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for navigation/accessibility specs (*.spec.ts).
 * The bun-based launch-readiness suites (*.e2e.ts) are run separately by
 * scripts/run-e2e.mjs and are intentionally not matched here.
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
