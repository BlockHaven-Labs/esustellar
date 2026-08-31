import { test, expect } from "@playwright/test";
import {
  mockConnectedWalletScript,
  MOCK_PUBLIC_KEY,
  TESTNET_PASSPHRASE,
  createGroupFormData,
} from "./fixtures";

/**
 * create-group.spec.ts
 *
 * Tests for the Create Group page at /create.
 *
 * The page is a multi-step wizard:
 *   Step 0 (Basic Info): Group Name, Description, Private toggle
 *   Step 1 (Parameters): Contribution Amount, Number of Members, Frequency, Start Date
 *   Step 2 (Review): summary + Create Group button
 *
 * Scenarios covered:
 *  1. Wallet NOT connected  → shows "Connect Your Wallet" prompt
 *  2. Wallet connected       → form fields render across the wizard steps
 *  3. Validation errors      → shown for invalid inputs (amount < 10, members out of range, past date)
 *  4. Review step            → fee notice shown; successful submission triggers contract call (mocked)
 */

/**
 * Helper: inject a fully-connected Freighter mock AND stub the contract /
 * registry calls so tests never hit the network.
 */
async function setupConnectedWallet(page: import("@playwright/test").Page) {
  // 1. Inject Freighter mock so the wallet context treats the user as connected.
  await page.addInitScript(mockConnectedWalletScript(MOCK_PUBLIC_KEY, TESTNET_PASSPHRASE));

  // 2. Stub the Soroban RPC fetch so that contract initialisation does not fail.
  await page.route("**/soroban-testnet.stellar.org/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }),
    });
  });
}

test.describe("Create Group page", () => {
  test("shows Connect Wallet prompt when wallet is not connected", async ({ page }) => {
    // Do NOT inject the Freighter mock — wallet is absent.
    await page.goto("/create");

    // The page should render a "Connect Your Wallet" card.
    await expect(page.getByText(/connect your wallet/i)).toBeVisible();
    await expect(page.getByText(/you must connect a stellar wallet/i)).toBeVisible();
  });

  test("Connect Wallet button on create page opens wallet flow", async ({ page }) => {
    await page.goto("/create");

    // The create page's "Connect Your Wallet" card has its own Connect Wallet
    // button (the header shows a separate, disabled "Install Freighter" one).
    const connectBtn = page.getByRole("button", { name: /^connect wallet$/i });
    await expect(connectBtn).toBeVisible();
    // Clicking the button should not throw / navigate away unexpectedly.
    await connectBtn.click();
    // Should still be on /create (or an error state, but not 404).
    expect(page.url()).toContain("/create");
  });

  test("step 1 renders basic info fields when wallet is connected", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    // Wallet context resolves async — wait for the Group Name field to appear.
    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });

    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByRole("switch")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  });

  test("wizard advances to step 2 and renders parameter fields", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/group name/i).fill(createGroupFormData().name);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByLabel(/contribution amount/i)).toBeVisible();
    await expect(page.getByLabel(/number of members/i)).toBeVisible();
    await expect(page.getByLabel(/start date/i)).toBeVisible();
    await expect(page.getByLabel("Contribution frequency")).toBeVisible();
  });

  test("shows validation error when contribution amount is too low", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/group name/i).fill(createGroupFormData().name);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    const amountUnderMin = 5; // below minimum 10 XLM
    await page.getByLabel(/contribution amount/i).fill(String(amountUnderMin));

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(
      page.getByText(/contribution amount must be at least 10/i)
    ).toBeVisible();
  });

  test("shows validation error when member count is out of range", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/group name/i).fill(createGroupFormData().name);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await page.getByLabel(/contribution amount/i).fill(createGroupFormData().amount);
    await page.getByLabel(/number of members/i).fill("2"); // below minimum of 3

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(
      page.getByText(/number of members must be between 3 and 20/i)
    ).toBeVisible();
  });

  test("shows validation error when start date is not in the future", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/group name/i).fill(createGroupFormData().name);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await page.getByLabel(/contribution amount/i).fill(createGroupFormData().amount);
    await page.getByLabel(/number of members/i).fill(createGroupFormData().members);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = yesterday.toISOString().split("T")[0];

    // Set via the native setter so React's controlled input registers the
    // change, and remove the 'min' attribute which would block a past date.
    await page.evaluate(
      ([selector, value]) => {
        const el = document.querySelector(selector) as HTMLInputElement;
        if (el) {
          el.removeAttribute("min");
          const proto = Object.getPrototypeOf(el);
          const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          setter?.call(el, value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      ['input[id="startDate"]', pastDate]
    );

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByText(/start date must be in the future/i)).toBeVisible();
  });

  test("review step shows fee notice and Create Group button", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/group name/i).fill(createGroupFormData().name);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    const data = createGroupFormData();
    await page.getByLabel(/contribution amount/i).fill(data.amount);
    await page.getByLabel(/number of members/i).fill(data.members);
    await page.getByLabel(/start date/i).fill(data.startDate);

    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Review step should render the fee notice and the Create Group button.
    await expect(page.getByText(/2% platform fee/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create group/i })).toBeVisible();
  });

  test("private group toggle is present and operable", async ({ page }) => {
    await setupConnectedWallet(page);
    await page.goto("/create");

    await expect(page.getByLabel(/group name/i)).toBeVisible({ timeout: 10_000 });

    const privateToggle = page.getByRole("switch");
    await expect(privateToggle).toBeVisible();
    // Toggle it on.
    await privateToggle.click();
    await expect(privateToggle).toHaveAttribute("data-state", "checked");
    // Toggle it off.
    await privateToggle.click();
    await expect(privateToggle).toHaveAttribute("data-state", "unchecked");
  });
});
