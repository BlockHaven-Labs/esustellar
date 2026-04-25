describe('Onboarding flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows the welcome screen on launch', async () => {
    await expect(element(by.id('onboarding-screen-1'))).toBeVisible();
  });

  it('advances to screen 2 after tapping Next', async () => {
    await element(by.id('onboarding-next')).tap();
    await expect(element(by.id('onboarding-screen-2'))).toBeVisible();
  });

  it('advances to screen 3 after tapping Next again', async () => {
    await element(by.id('onboarding-next')).tap();
    await element(by.id('onboarding-next')).tap();
    await expect(element(by.id('onboarding-screen-3'))).toBeVisible();
  });

  it('bypasses onboarding when Skip is tapped from screen 1', async () => {
    await element(by.id('onboarding-skip')).tap();
    await expect(element(by.id('onboarding-screen-1'))).not.toBeVisible();
  });
});
