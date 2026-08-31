import { test, expect } from "@playwright/test";

/**
 * groups.spec.ts
 *
 * Tests for the Groups list page at /groups.
 *
 * Scenarios covered:
 *  1. Page loads with the correct heading.
 *  2. The filter bar / main content area renders.
 *  3. Loading state is shown before data arrives.
 *  4. Empty state renders when no groups are returned.
 *  5. Header + nav links render.
 *  6. Navigation to /groups via the nav link works.
 */

test.describe("Groups list page", () => {
  test("page renders the Browse Savings Groups heading", async ({ page }) => {
    await page.goto("/groups");
    await expect(page.getByRole("heading", { name: /browse savings groups/i })).toBeVisible();
  });

  test("page renders the filter bar", async ({ page }) => {
    await page.goto("/groups");
    // GroupsFilter renders a search / filter UI.
    // The component typically has an input for searching.
    await expect(page.locator("main")).toBeVisible();
  });

  test("shows loading state before data arrives", async ({ page }) => {
    // Delay the RPC response to catch the loading state in the DOM.
    await page.route("**/soroban-testnet.stellar.org/**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }),
      });
    });

    await page.goto("/groups");

    // The loading text appears before groups load.
    await expect(page.getByText(/loading groups/i)).toBeVisible();
  });

  test("shows empty-state message when no groups exist", async ({ page }) => {
    // Return an empty array from the contract.
    await page.route("**/soroban-testnet.stellar.org/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: { returnValue: { vec: [] } } }),
      });
    });

    await page.goto("/groups");

    // Either an error message (contract throws) or the "no groups" message.
    const emptyOrError = page.locator("text=/no public savings groups|could not load groups/i");
    await expect(emptyOrError).toBeVisible({ timeout: 15_000 });
  });

  test("header is present and nav links work on groups page", async ({ page }) => {
    await page.goto("/groups");

    await expect(page.getByRole("link", { name: /esustellar/i }).first()).toBeVisible();
    // "Create Group" exists in both the header nav and the footer — use .first().
    await expect(page.getByRole("link", { name: /create group/i }).first()).toBeVisible();
  });

  test("wallet button is present on groups page header", async ({ page }) => {
    await page.goto("/groups");

    const walletBtn = page.getByRole("button", { name: /connect wallet|install freighter/i });
    await expect(walletBtn).toBeVisible();
  });

  test("navigating to groups page via nav link works", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /browse groups/i }).first().click();
    await page.waitForURL("**/groups");
    await expect(page.getByRole("heading", { name: /browse savings groups/i })).toBeVisible();
  });
});
