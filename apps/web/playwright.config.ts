import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for the EsuStellar web app.
 *
 * Tests live in apps/web/e2e/.
 * Run locally: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",

  /* Maximum time one test can run (ms). */
  timeout: 30_000,

  /* Fail fast in CI; run all tests locally. */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "html",

  use: {
    baseURL: "http://localhost:3000",
    /* Capture trace on first retry for easier debugging in CI. */
    trace: "on-first-retry",
    /* Screenshot on failure. */
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Start the Next.js dev server before tests. */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
