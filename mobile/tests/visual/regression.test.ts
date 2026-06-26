/**
 * Visual Regression Tests
 * Issue #336: Capture baselines and detect UI regressions automatically.
 *
 * In CI this would drive a real screenshot comparison tool (e.g. Detox +
 * jest-image-snapshot or Storybook / Chromatic).  Here we provide a
 * deterministic Jest-friendly implementation that:
 *   1. Captures a "screenshot" as a JSON snapshot of component props/styles.
 *   2. Compares it against a stored baseline.
 *   3. Fails with a diff when the rendered output changes unexpectedly.
 */

import { SCREENS, captureScreenshot, compareToBaseline, Screenshot } from './visualTestUtils';

describe('Visual Regression Tests', () => {
  it('covers at least the required key screens', () => {
    expect(SCREENS.length).toBeGreaterThanOrEqual(5);
  });

  describe.each(SCREENS)('$name', ({ name, render }) => {
    let screenshot: Screenshot;

    beforeAll(() => {
      screenshot = captureScreenshot(name, render());
    });

    it('matches stored baseline (or creates one)', () => {
      const { matched, diff } = compareToBaseline(name, screenshot);
      if (!matched) {
        console.warn(`[visual] Regression detected in ${name}:`);
        diff.forEach(d => console.warn(`  ${d}`));
      }
      expect(matched).toBe(true);
    });

    it('snapshot is stable across two captures', () => {
      const s1 = captureScreenshot(name, render());
      const s2 = captureScreenshot(name, render());
      expect(s1.hash).toBe(s2.hash);
    });
  });
});
