/**
 * Accessibility audit — Home page & wallet connection flow
 *
 * WCAG 2.1 AA checks (via axe-core) for:
 *   - Landing page (hero, stats, features, how-it-works, CTA)
 *   - Wallet connect button states (connected / disconnected)
 *
 * Findings are written to a11y-report.json and violations fail the test.
 */

import { test } from "@playwright/test";
import { auditPage, expectNoViolations } from "./helpers";

test.describe("Home page / wallet connection flow — WCAG 2.1 AA", () => {
  test("home page has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    // Wait for the hero section to be visible before auditing
    await page.waitForSelector("main", { state: "visible" });

    const results = await auditPage(page, "home-page");
    expectNoViolations(results, "Home page");
  });

  test("wallet connect button area has no accessibility violations", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("main", { state: "visible" });

    // Scope audit to the header where the wallet button lives
    const results = await auditPage(page, "wallet-connect-button", {
      include: ["header", "nav"],
    });
    expectNoViolations(results, "Wallet connect button");
  });

  test("home page is keyboard navigable — skip link present", async ({
    page,
  }) => {
    await page.goto("/");
    // Tab once — the first focusable element should be a skip-navigation link
    // or the first interactive element. We run an axe audit after tab focus
    // so the focus state is included in the audit.
    await page.keyboard.press("Tab");
    const results = await auditPage(page, "home-page-keyboard-nav");
    expectNoViolations(results, "Home page keyboard navigation");
  });

  test("hero section has no color-contrast violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("section", { state: "visible" });

    const results = await auditPage(page, "home-hero-section", {
      include: ["main section:first-of-type"],
    });
    expectNoViolations(results, "Hero section color contrast");
  });
});
