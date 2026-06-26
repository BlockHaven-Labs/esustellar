/**
 * E2E — Auth flow
 *
 * Covers:
 *  1. Fresh launch lands on onboarding / wallet-connect
 *  2. Add wallet manually (label + Stellar public key)
 *  3. Home screen is reachable after wallet setup
 *  4. Wallet switcher opens and closes
 *  5. Invalid public key shows an error
 *  6. App restores wallet session after background / relaunch
 */

import { device, element, by, waitFor, expect as detoxExpect } from 'detox';
import {
  launchFresh,
  reloadApp,
  waitForElement,
  safeTap,
  typeIntoField,
  clearAndType,
  assertVisible,
  assertNotVisible,
  UI_TIMEOUT,
  SHORT_TIMEOUT,
  TEST_WALLET_ADDRESS,
  TEST_WALLET_LABEL,
} from './helpers';

// ─── Suite setup ──────────────────────────────────────────────────────────────

beforeAll(async () => {
  await launchFresh();
});

afterAll(async () => {
  await device.terminateApp();
});

// ─── Test cases ───────────────────────────────────────────────────────────────

describe('Auth — wallet connect', () => {
  /**
   * A clean install should always start on the onboarding screen
   * or the wallet-connect screen, never on the home screen.
   */
  it('shows onboarding or wallet-connect screen on fresh launch', async () => {
    // One of these two entry-points must be visible
    let landedOnOnboarding = false;
    let landedOnWalletConnect = false;

    try {
      await waitFor(element(by.id('onboarding-screen-1')))
        .toBeVisible()
        .withTimeout(UI_TIMEOUT);
      landedOnOnboarding = true;
    } catch {
      // expected if onboarding was skipped in a previous run
    }

    if (!landedOnOnboarding) {
      await waitFor(element(by.id('wallet-connect-screen')))
        .toBeVisible()
        .withTimeout(UI_TIMEOUT);
      landedOnWalletConnect = true;
    }

    expect(landedOnOnboarding || landedOnWalletConnect).toBe(true);
  });

  /**
   * Skip onboarding and land on wallet-connect.
   */
  it('skips onboarding and shows wallet-connect screen', async () => {
    // Navigate past onboarding if present
    try {
      await element(by.id('onboarding-skip')).tap();
    } catch {
      // Already past onboarding
    }

    await waitForElement('wallet-connect-screen', UI_TIMEOUT);
    await assertVisible('wallet-connect-screen');
  });

  /**
   * Tapping "Add wallet manually" opens the Add Wallet screen.
   */
  it('opens Add Wallet screen from wallet-connect', async () => {
    await safeTap('add-wallet-manually-button');
    await waitForElement('add-wallet-screen', UI_TIMEOUT);
    await assertVisible('add-wallet-screen');
  });

  /**
   * Submitting an invalid public key should show a validation error.
   * The button should remain disabled / error should appear.
   */
  it('shows validation error for invalid public key', async () => {
    await waitForElement('wallet-label-input');
    await element(by.id('wallet-label-input')).typeText('Bad Wallet');
    await element(by.id('wallet-publickey-input')).typeText('not-a-real-key');
    await element(by.id('wallet-publickey-input')).tapReturnKey();

    // Either the button is disabled or an error message is shown
    try {
      await detoxExpect(element(by.id('add-wallet-button'))).toBeDisabled();
    } catch {
      await waitForElement('wallet-error-message', SHORT_TIMEOUT);
      await assertVisible('wallet-error-message');
    }
  });

  /**
   * Submitting a valid Stellar public key and label navigates to Home.
   */
  it('adds a wallet with a valid public key and lands on Home', async () => {
    await clearAndType('wallet-label-input', TEST_WALLET_LABEL);
    await clearAndType('wallet-publickey-input', TEST_WALLET_ADDRESS);
    await element(by.id('wallet-publickey-input')).tapReturnKey();

    await waitFor(element(by.id('add-wallet-button')))
      .not.toBeDisabled()
      .withTimeout(SHORT_TIMEOUT);

    await element(by.id('add-wallet-button')).tap();

    // Should land on Home screen (tab layout)
    await waitForElement('home-screen', UI_TIMEOUT);
    await assertVisible('home-screen');
  });
});

describe('Auth — session persistence', () => {
  /**
   * Reloading the JS bundle (simulates a background->foreground transition)
   * should keep the user authenticated without re-entering their key.
   */
  it('persists wallet session after JS reload', async () => {
    await reloadApp();
    await waitForElement('home-screen', UI_TIMEOUT);
    await assertVisible('home-screen');
  });

  /**
   * After a full native relaunch the wallet session is restored from
   * secure storage and the user lands directly on Home.
   */
  it('restores wallet session after full app relaunch', async () => {
    await device.launchApp({ newInstance: true });
    await waitForElement('home-screen', UI_TIMEOUT);
    await assertVisible('home-screen');
  });
});

describe('Auth — wallet switcher', () => {
  /**
   * Tapping the account info area opens the Wallet Switcher modal.
   */
  it('opens wallet switcher modal', async () => {
    await safeTap('wallet-switcher-trigger');
    await waitForElement('wallet-switcher-modal', SHORT_TIMEOUT);
    await assertVisible('wallet-switcher-modal');
  });

  /**
   * Closing the modal removes it from the screen.
   */
  it('closes wallet switcher modal', async () => {
    await safeTap('wallet-switcher-close');
    await waitFor(element(by.id('wallet-switcher-modal')))
      .not.toBeVisible()
      .withTimeout(SHORT_TIMEOUT);
    await assertNotVisible('wallet-switcher-modal');
  });

  /**
   * The Add Wallet option inside the switcher navigates to Add Wallet screen.
   */
  it('navigates to Add Wallet from wallet switcher', async () => {
    await safeTap('wallet-switcher-trigger');
    await waitForElement('wallet-switcher-modal', SHORT_TIMEOUT);
    await safeTap('wallet-switcher-add-wallet');
    await waitForElement('add-wallet-screen', UI_TIMEOUT);
    await assertVisible('add-wallet-screen');

    // Navigate back
    await device.pressBack();
  });
});
