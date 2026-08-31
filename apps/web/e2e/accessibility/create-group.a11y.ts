/**
 * Accessibility audit — Create group flow
 *
 * WCAG 2.1 AA checks (via axe-core) for:
 *   - /create page initial state
 *   - Form fields (labels, inputs, selects, switches)
 *   - Validation error states
 *
 * Findings are written to a11y-report.json and violations fail the test.
 */

import { test } from "@playwright/test";
import { auditPage, expectNoViolations, mockConnectedWallet } from "./helpers";

test.describe("Create group flow — WCAG 2.1 AA", () => {
  test("create page has no accessibility violations", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/create");
    await page.waitForSelector("main, form, [data-testid='create-group-form']", {
      state: "visible",
    });

    const results = await auditPage(page, "create-group-page");
    expectNoViolations(results, "Create group page");
  });

  test("create group form fields have proper labels", async ({ page }) => {
    await mockConnectedWallet(page);
    await page.goto("/create");
    await page.waitForSelector("form, [role='form']", {
      state: "visible",
      timeout: 15_000,
    });

    // Scope audit to just the form area
    const results = await auditPage(page, "create-group-form-fields", {
      include: ["form", "[role='form']", "main"],
    });
    expectNoViolations(results, "Create group form fields");
  });

  test("create group form shows accessible validation errors", async ({
    page,
  }) => {
    await mockConnectedWallet(page);
    await page.goto("/create");
    // Wait for page to load
    await page.waitForSelector("main", { state: "visible" });

    // Attempt to submit an empty form to trigger validation messages
    const submitButton = page.locator(
      "button[type='submit'], button:has-text('Create'), button:has-text('Submit')"
    );
    const hasSubmitButton = (await submitButton.count()) > 0;
    if (hasSubmitButton) {
      await submitButton.first().click();
      // Wait a moment for validation messages to render
      await page.waitForTimeout(500);
    }

    const results = await auditPage(
      page,
      "create-group-form-validation-errors"
    );
    expectNoViolations(results, "Create group form validation errors");
  });

  test("create group select and switch inputs are accessible", async ({
    page,
  }) => {
    await mockConnectedWallet(page);
    await page.goto("/create");
    await page.waitForSelector("main", { state: "visible" });

    // Check for Radix UI Select and Switch accessibility
    const results = await auditPage(
      page,
      "create-group-select-switch-inputs",
      {
        // Radix UI uses proper ARIA roles; exclude third-party embeds if any
        exclude: ["iframe"],
      }
    );
    expectNoViolations(results, "Create group select/switch inputs");
  });
});
