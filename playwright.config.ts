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
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Allow overriding with a preinstalled Chromium when Playwright's
        // bundled browser is unavailable (e.g. sandbox/CI image).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
    // Print/paper-fit checks are the only specs worth paying for in three
    // engines: page breaking and text metrics differ per engine, everything
    // else in this suite is engine-independent.
    {
      name: "firefox-print",
      testMatch: /report-print-layout\.spec\.ts$/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-print",
      testMatch: /report-print-layout\.spec\.ts$/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});

