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

    // The header renders a WalletButton — locate it by its default label text.
    const walletButton = page.getByRole("button", { name: /connect wallet/i });
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
    // Narrow viewport to trigger the mobile hamburger menu.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Open the mobile menu sheet.
    const menuButton = page.getByRole("button", { name: /toggle menu/i });
    await menuButton.click();

    // The mobile nav sheet should contain a wallet button.
    const sheetWalletBtn = page.locator("[data-radix-popper-content-wrapper] button, [data-state='open'] button").filter({ hasText: /connect wallet|install freighter/i }).first();
    // Fallback: any button with wallet text that's visible.
    const walletBtnFallback = page.getByRole("button", { name: /connect wallet|install freighter/i }).nth(1);
    await expect(walletBtnFallback).toBeVisible({ timeout: 5_000 });
  });

  test("Navigation links are visible on the homepage", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /browse groups/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create group/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
  });
});
