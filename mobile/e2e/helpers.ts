/**
 * E2E test helpers for EsuStellar
 *
 * Centralises common waits, assertions, and wallet setup so test files stay
 * focused on user journeys rather than Detox boilerplate.
 */

import { device, element, by, waitFor, expect as detoxExpect } from 'detox';

// ─── Constants ────────────────────────────────────────────────────────────────

/** A funded Stellar testnet public key used across tests. Never use a real key. */
export const TEST_WALLET_ADDRESS =
  'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV4ULKIJTGR';

export const TEST_WALLET_LABEL = 'E2E Test Wallet';

/** How long (ms) to wait for blockchain/network operations. */
export const NETWORK_TIMEOUT = 30_000;

/** Standard UI timeout. */
export const UI_TIMEOUT = 10_000;

/** Short timeout for elements that should already be visible. */
export const SHORT_TIMEOUT = 5_000;

// ─── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Wait for an element (by testID) and assert it is visible.
 */
export async function waitForElement(
  testId: string,
  timeout = UI_TIMEOUT,
): Promise<void> {
  await waitFor(element(by.id(testId)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap an element safely: wait for it to be visible before tapping.
 */
export async function safeTap(testId: string, timeout = UI_TIMEOUT): Promise<void> {
  await waitForElement(testId, timeout);
  await element(by.id(testId)).tap();
}

/**
 * Type text into a field, waiting for it to appear first.
 */
export async function typeIntoField(
  testId: string,
  text: string,
  timeout = UI_TIMEOUT,
): Promise<void> {
  await waitForElement(testId, timeout);
  await element(by.id(testId)).tap();
  await element(by.id(testId)).typeText(text);
}

/**
 * Clear a text field then type new text.
 */
export async function clearAndType(
  testId: string,
  text: string,
  timeout = UI_TIMEOUT,
): Promise<void> {
  await waitForElement(testId, timeout);
  await element(by.id(testId)).clearText();
  await element(by.id(testId)).typeText(text);
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

/**
 * Launch fresh — clears all persisted state so each suite starts clean.
 */
export async function launchFresh(): Promise<void> {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: { notifications: 'YES' },
  });
}

/**
 * Reload JS bundle without re-launching the native process.
 * Faster than launchFresh but keeps native module state.
 */
export async function reloadApp(): Promise<void> {
  await device.reloadReactNative();
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Complete the wallet-add flow with the shared test wallet address.
 * Assumes the app navigates to /wallet/add or that addWallet is accessible.
 */
export async function addTestWallet(): Promise<void> {
  await waitForElement('wallet-label-input');
  await element(by.id('wallet-label-input')).typeText(TEST_WALLET_LABEL);
  await element(by.id('wallet-publickey-input')).typeText(TEST_WALLET_ADDRESS);
  // Dismiss keyboard before tapping button to avoid obstructions
  await element(by.id('wallet-publickey-input')).tapReturnKey();
  await safeTap('add-wallet-button');
}

/**
 * Skip onboarding if the screen is present. No-op if already past it.
 */
export async function skipOnboardingIfPresent(): Promise<void> {
  try {
    await waitFor(element(by.id('onboarding-skip')))
      .toBeVisible()
      .withTimeout(3_000);
    await element(by.id('onboarding-skip')).tap();
  } catch {
    // Onboarding not shown — already past it
  }
}

/**
 * Complete minimal onboarding to reach the home screen.
 * Navigates through all slides then adds the test wallet.
 */
export async function completeOnboarding(): Promise<void> {
  await skipOnboardingIfPresent();
  // If wallet connection screen is shown
  try {
    await waitFor(element(by.id('wallet-connect-screen')))
      .toBeVisible()
      .withTimeout(3_000);
    await safeTap('add-wallet-manually-button');
    await addTestWallet();
  } catch {
    // Already authenticated
  }
}

// ─── Assertion shortcuts ──────────────────────────────────────────────────────

export async function assertVisible(testId: string): Promise<void> {
  await detoxExpect(element(by.id(testId))).toBeVisible();
}

export async function assertNotVisible(testId: string): Promise<void> {
  await detoxExpect(element(by.id(testId))).not.toBeVisible();
}

export async function assertText(testId: string, text: string): Promise<void> {
  await detoxExpect(element(by.id(testId))).toHaveText(text);
}

// ─── Wait utilities ───────────────────────────────────────────────────────────

/** Pause for ms milliseconds. Use sparingly — prefer waitFor over sleep. */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll until predicate resolves truthy or timeout is reached.
 * Useful for async contract state that takes multiple seconds.
 */
export async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = NETWORK_TIMEOUT,
  intervalMs = 1_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await sleep(intervalMs);
  }
  throw new Error(`waitUntil timed out after ${timeoutMs}ms`);
}
