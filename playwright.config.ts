import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for navigation/accessibility specs (*.spec.ts).
 * The bun-based launch-readiness suites (*.e2e.ts) are run separately by
 * scripts/run-e2e.mjs and are intentionally not matched here.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const isCI = !!process.env.CI;
// When E2E_BASE_URL points at an already-running/remote target we must not
// try to boot a local dev server for it.
const shouldStartServer = !process.env.E2E_BASE_URL || process.env.E2E_START_SERVER === "1";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts$/,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ["github"],
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ]
    : [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    // Sandboxes and CI images sometimes only ship one usable Chromium build.
    // E2E_CHROMIUM_PATH lets the runner point at it instead of failing to launch.
    ...(process.env.E2E_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } }
      : {}),
    // CI diagnostics: keep traces, screenshots and videos for anything that fails.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: shouldStartServer
    ? {
        command: "bun run dev --port 8080 --host 127.0.0.1",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
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
