import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for accessibility (WCAG 2.1 AA) audits.
 * Uses axe-core via @axe-core/playwright to run automated checks against
 * the three core flows: wallet connect, create group, and groups browse/detail.
 *
 * webServer starts Next.js on port 3001 so CI can run the tests without a
 * separately managed server process.
 */
const PORT = process.env.A11Y_PORT ? parseInt(process.env.A11Y_PORT, 10) : 3001;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./accessibility",
  testMatch: "**/*.a11y.ts",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: "../../a11y-report.json",
      },
    ],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
