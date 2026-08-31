import { test, expect } from "@playwright/test";
import { freighterMockScript, MOCK_PUBLIC_KEY, TESTNET_PASSPHRASE } from "./fixtures";

/**
 * wallet-connect.spec.ts
 *
 * Verifies that the WalletButton component is visible in the header, shows
 * the correct label states, and responds correctly when Freighter is mocked.
 *
 * These tests do NOT require a real Freighter extension or a live Stellar
 * network; the wallet is simulated via page.addInitScript().
 */

test.describe("Wallet connection", () => {
  test("Connect Wallet button is visible in the header on the homepage", async ({ page }) => {
    await page.goto("/");

    // The header renders a WalletButton — with no extension installed it
    // defaults to "Install Freighter", otherwise "Connect Wallet". Locate it
    // by either label text.
    const walletButton = page
      .getByRole("banner")
      .getByRole("button", { name: /connect wallet|install freighter/i });
    await expect(walletButton).toBeVisible();
  });

  test("Install Freighter button shown when extension is absent", async ({ page }) => {
    // Explicitly make sure Freighter is NOT present.
    await page.addInitScript(() => {
      // Ensure no freighter hints exist.
      delete (window as unknown as Record<string, unknown>).freighter;
      delete (window as unknown as Record<string, unknown>).freighterApi;
    });

    await page.goto("/");

    // After the React hydration + retries the button should say "Install Freighter"
    // because hasFreighterHint() returns false and pingFreighter() times out.
    // We wait a reasonable time for the async detection to complete.
    const btn = page.getByRole("button", { name: /install freighter/i });
    // The app retries up to 3 times × ~400 ms — give it 5 s.
    await expect(btn).toBeVisible({ timeout: 8_000 });
    await expect(btn).toBeDisabled();
  });

  test("Connect Wallet button is clickable when Freighter mock is injected", async ({ page }) => {
    // Inject the Freighter mock so the app thinks the extension is installed.
    await page.addInitScript(freighterMockScript(MOCK_PUBLIC_KEY, TESTNET_PASSPHRASE));

    await page.goto("/");

    // Button should be enabled (not disabled).
    const walletButton = page.getByRole("button", { name: /connect wallet/i });
    await expect(walletButton).toBeVisible();
    await expect(walletButton).not.toBeDisabled();
  });

  test("Wallet button is present in mobile menu", async ({ page }) => {
    // Narrow viewport to trigger the mobile hamburger menu. At this size the
    // desktop header CTA (hidden md:flex) is not rendered, so the only wallet
    // button is the one inside the mobile sheet.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Open the mobile menu sheet.
    const menuButton = page.getByRole("button", { name: /toggle menu/i });
    await menuButton.click();

    const sheetWalletBtn = page
      .getByRole("button", { name: /connect wallet|install freighter/i })
      .first();
    await expect(sheetWalletBtn).toBeVisible({ timeout: 5_000 });
  });

  test("Navigation links are visible on the homepage", async ({ page }) => {
    await page.goto("/");

    // "Browse Groups" appears in the header nav, hero, and footer — use the
    // first (header) occurrence to avoid a strict-mode conflict.
    await expect(page.getByRole("link", { name: /browse groups/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /create group/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
  });
});
