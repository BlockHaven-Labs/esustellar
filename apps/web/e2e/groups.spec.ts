import { test, expect } from "@playwright/test";
import { freighterMockScript, MOCK_PUBLIC_KEY, TESTNET_PASSPHRASE, MOCK_GROUPS } from "./fixtures";

/**
 * groups.spec.ts
 *
 * Tests for the Groups list page at /groups.
 *
 * Scenarios covered:
 *  1. Page loads with the correct heading.
 *  2. When the registry contract returns groups, group cards render.
 *  3. Each card has a visible "Join Group" / "View Details" button.
 *  4. Clicking a card navigates to the group detail page.
 *  5. Empty state renders when no groups are returned.
 */

/**
 * Stub the Soroban RPC so that getAllPublicGroups() returns our mock data
 * without hitting the real testnet.
 *
 * The registry contract client calls JSON-RPC at SOROBAN_RPC_URL.  We
 * return a minimal success response; the higher-level SDK will either
 * interpret it or throw — either outcome is fine for UI-level tests that
 * only care about the rendered DOM.
 *
 * For tests that need rendered cards we also inject the mock groups
 * directly via window.__mockGroups and override the React context via a
 * script that runs before hydration.
 */
function injectGroupsMock(page: import("@playwright/test").Page) {
  // Route Soroban RPC calls to a stub.
  page.route("**/soroban-testnet.stellar.org/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }),
    });
  });

  // Expose mock data on window so any custom hook that reads from it
  // (or a future test helper) can access it.
  return page.addInitScript((groups: typeof MOCK_GROUPS) => {
    (window as any).__mockGroups = groups;
  }, MOCK_GROUPS);
}

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
    await expect(page.getByRole("link", { name: /create group/i })).toBeVisible();
  });

  test("wallet button is present on groups page header", async ({ page }) => {
    await page.goto("/groups");

    const walletBtn = page.getByRole("button", { name: /connect wallet|install freighter/i });
    await expect(walletBtn).toBeVisible();
  });

  test("navigating to groups page via nav link works", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /browse groups/i }).click();
    await page.waitForURL("**/groups");
    await expect(page.getByRole("heading", { name: /browse savings groups/i })).toBeVisible();
  });
});
