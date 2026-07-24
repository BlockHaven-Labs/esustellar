import { device, element, by, expect, waitFor } from 'detox';

describe('Smoke', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should launch without crashing', async () => {
    // If the app crashes on launch, this will time out and fail.
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10_000);
  });

  it('should display the home screen', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(8_000);
  });

  it('should navigate to the main tab bar', async () => {
    await waitFor(element(by.id('tab-bar')))
      .toBeVisible()
      .withTimeout(8_000);
  });

  it('should open and close a modal', async () => {
    // Tap a known action that opens a modal — adjust testID to match your UI.
    await element(by.id('open-modal-button')).tap();
    await waitFor(element(by.id('modal-container')))
      .toBeVisible()
      .withTimeout(5_000);

    await element(by.id('modal-close-button')).tap();
    await waitFor(element(by.id('modal-container')))
      .not.toBeVisible()
      .withTimeout(5_000);
  });

  it('should scroll a list without errors', async () => {
    await waitFor(element(by.id('main-list')))
      .toBeVisible()
      .withTimeout(8_000);

    await element(by.id('main-list')).scroll(300, 'down');
    await element(by.id('main-list')).scroll(300, 'up');
  });
});