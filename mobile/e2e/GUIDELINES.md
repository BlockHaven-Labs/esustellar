# E2E Test Writing Guidelines

EsuStellar uses [Detox](https://wix.github.io/Detox/) for end-to-end testing.
This document covers conventions, patterns, and gotchas specific to this project.

---

## Table of contents

1. [Project structure](#1-project-structure)
2. [Running tests locally](#2-running-tests-locally)
3. [Test IDs — the golden rule](#3-test-ids--the-golden-rule)
4. [Test file conventions](#4-test-file-conventions)
5. [The helpers module](#5-the-helpers-module)
6. [Writing resilient tests](#6-writing-resilient-tests)
7. [Handling blockchain / network operations](#7-handling-blockchain--network-operations)
8. [Flaky test strategy](#8-flaky-test-strategy)
9. [CI integration](#9-ci-integration)
10. [Adding a new E2E test](#10-adding-a-new-e2e-test)
11. [Debugging failures](#11-debugging-failures)

---

## 1. Project structure

```
mobile/
├── e2e/
│   ├── helpers.ts           # Shared utilities — waitFor, tap, auth helpers
│   ├── jest.config.ts       # Jest + Detox config (retry, reporters, timeout)
│   ├── jest.config.js       # Legacy JS config (keep for back-compat)
│   ├── auth.test.ts         # Wallet connect & session persistence
│   ├── group-creation.test.ts # 4-step group creation wizard
│   ├── contribution.test.ts # Make contribution flow
│   ├── payout.test.ts       # Payout schedule & request payout
│   ├── smoke.test.ts        # App launch smoke test
│   ├── onboarding.test.js   # Onboarding slides
│   └── GUIDELINES.md        # This file
└── .detoxrc.js              # Detox device / app / config definitions
```

---

## 2. Running tests locally

```bash
# Build the iOS simulator binary first (one-time per code change)
cd mobile
npm run e2e:build:ios

# Run all E2E tests
npm run e2e

# Run a specific suite
npx detox test --configuration ios.sim.debug --testNamePattern "auth"

# Run on Android
npm run e2e:build:android
npx detox test --configuration android.emu.debug
```

Set `DETOX_RETRIES=0` locally if you want tests to fail immediately rather than
retrying:

```bash
DETOX_RETRIES=0 npm run e2e
```

---

## 3. Test IDs — the golden rule

> **Every interactive or verifiable element must have a `testID` prop.**

Detox uses `testID` (iOS `accessibilityIdentifier`, Android `contentDescription`)
to find elements. Text-based selectors (`by.text(...)`) are fragile because UI
copy changes break them. Use them only for dynamic content that you cannot
control (e.g. native alert buttons, third-party modals).

### Naming convention

```
<screen>-<element>[-<context>]
```

| ✅ Good                          | ❌ Bad                     |
|----------------------------------|---------------------------|
| `make-contribution-button`       | `btn1`                    |
| `create-group-name-input`        | `nameInput`               |
| `payout-status-badge-0`          | `statusBadge`             |
| `group-list-item-0`              | `item`                    |
| `wallet-connect-screen`          | `screen`                  |

### Index suffixes

For dynamic lists, append a zero-based index:

```tsx
// In the component:
<View testID={`payout-schedule-item-${index}`}>
  <Text testID={`payout-round-label-${index}`}>Round {round}</Text>
  <Text testID={`payout-status-badge-${index}`}>{status}</Text>
</View>
```

---

## 4. Test file conventions

- One file per user journey, named `<journey>.test.ts`.
- Use `describe` blocks to group related assertions within a journey.
- Use `beforeAll` for expensive setup (app launch, authentication).
- Use `beforeEach` to return to a known navigation state.
- Use `afterAll` to terminate the app.

```ts
// Pattern for each test file
beforeAll(async () => {
  await launchFresh();        // clears all state
  await completeOnboarding(); // authenticate with test wallet
});

afterAll(async () => {
  await device.terminateApp();
});

beforeEach(async () => {
  // Return to root screen so tests are independent
  try { await device.pressBack(); await device.pressBack(); } catch {}
  await waitForElement('home-screen');
});
```

---

## 5. The helpers module

Import from `./helpers` instead of reimplementing boilerplate.

| Helper | Purpose |
|--------|---------|
| `launchFresh()` | Kill + relaunch app, wipe all state |
| `reloadApp()` | JS bundle reload (keeps native state) |
| `completeOnboarding()` | Skip onboarding and authenticate |
| `addTestWallet()` | Fill in the Add Wallet form with test credentials |
| `waitForElement(id, timeout?)` | Wait + assert visible |
| `safeTap(id, timeout?)` | Wait then tap |
| `typeIntoField(id, text)` | Wait, tap, type |
| `clearAndType(id, text)` | Clear existing text then type |
| `assertVisible(id)` | Thin wrapper around detoxExpect |
| `assertNotVisible(id)` | Inverse assertion |
| `assertText(id, text)` | Assert element has specific text |
| `sleep(ms)` | Last resort delay — prefer `waitFor` |
| `TEST_WALLET_ADDRESS` | Shared testnet public key for all auth tests |
| `NETWORK_TIMEOUT` | 30 000 ms — use for blockchain operations |
| `UI_TIMEOUT` | 10 000 ms — use for standard UI waits |
| `SHORT_TIMEOUT` | 5 000 ms — use for elements that should be instant |

---

## 6. Writing resilient tests

### Always use `waitFor`, never `sleep`

```ts
// ✅ Correct
await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10_000);

// ❌ Fragile — arbitrary sleep ignores actual readiness
await sleep(3000);
await assertVisible('home-screen');
```

### Make blockchain assertions non-brittle

On-chain calls can fail due to testnet outages, insufficient funding, or timing.
Structure assertions to accept a graceful error state:

```ts
let succeeded = false;
try {
  await waitFor(element(by.id('success-screen'))).toBeVisible().withTimeout(30_000);
  succeeded = true;
} catch {
  // Accept graceful error (e.g. testnet unavailable)
  try {
    await waitFor(element(by.text('OK'))).toBeVisible().withTimeout(5_000);
    await element(by.text('OK')).tap();
  } catch { /* no alert either */ }
}

if (succeeded) {
  await assertVisible('success-details');
}
```

### Keep tests independent

Each test must be able to run in isolation. Do not rely on state set up by a
previous test within the same file — use `beforeEach` to navigate to a known
starting point.

---

## 7. Handling blockchain / network operations

- Use `NETWORK_TIMEOUT` (30 s) for `waitFor` calls that follow a transaction.
- Test wallet address: `TEST_WALLET_ADDRESS` — a funded testnet account.
- Never hardcode private keys in test files.
- If a transaction-heavy test becomes consistently flaky, consider mocking the
  contract call at the JS layer via a launch argument and handling it in the
  app's contract context:

```ts
await device.launchApp({
  launchArgs: { mockContractCalls: 'true' },
});
```

Then in the app:

```ts
if (process.env.EXPO_PUBLIC_E2E_MOCK_CONTRACTS === 'true') {
  return mockSuccessResponse();
}
```

---

## 8. Flaky test strategy

Detox tests can be flaky due to simulator timing issues. The project handles
this at three levels:

### Level 1 — `waitFor` timeouts
Always use `waitFor` with an explicit timeout instead of assuming elements are
immediately visible.

### Level 2 — Jest retry (`retryTimes`)
`e2e/jest.config.ts` sets `retryTimes: parseInt(process.env.DETOX_RETRIES ?? '2')`.
A test that fails due to a transient simulator glitch will be retried up to 2
times before being marked as failed. Set `DETOX_RETRIES=0` locally to disable.

### Level 3 — Detox `forceExit`
The `--forceExit` flag in CI prevents a zombie jest process from blocking the
runner if a test hangs.

### When retries aren't enough
If a test flakes more than 20 % of the time across CI runs:

1. Check whether the element's `testID` is set correctly.
2. Add a `sleep(300)` **after** the user action if Detox is racing the animation.
3. If the root cause is the network, restructure the assertion to be non-brittle
   (see section 6).
4. As a last resort, mark the test `xit` and open a tracking issue.

---

## 9. CI integration

The E2E workflow lives at `.github/workflows/e2e.yml`.

| Event | Suites run | Required to merge? |
|-------|-----------|-------------------|
| PR → `main` / `develop` (mobile files changed) | All 4 suites on iOS | ✅ Yes |
| Push to `main` | All 4 suites on iOS + Android | ✅ Yes |
| Manual dispatch | Configurable | — |

### Branch protection setup

Add `E2E Status Gate` as a required status check on the `main` branch in
GitHub Settings → Branches → Branch protection rules.

### Secrets required

| Secret | Description |
|--------|-------------|
| `TESTNET_SAVINGS_CONTRACT_ID` | Deployed savings contract address on Stellar testnet |
| `TESTNET_REGISTRY_CONTRACT_ID` | Deployed registry contract address on Stellar testnet |

---

## 10. Adding a new E2E test

1. **Identify the journey** — pick a user-facing flow that is not yet covered.
2. **Add `testID` props** to every element you need to interact with or assert.
3. **Create or update a test file** in `mobile/e2e/`.
4. **Import helpers** from `./helpers` — avoid duplicating boilerplate.
5. **Follow the file structure** in section 4.
6. **Test locally** with `npm run e2e` (or scoped with `--testNamePattern`).
7. **Open a PR** — the CI workflow will run automatically.

### Minimal new test template

```ts
import { device } from 'detox';
import {
  launchFresh,
  waitForElement,
  safeTap,
  assertVisible,
  completeOnboarding,
  UI_TIMEOUT,
} from './helpers';

beforeAll(async () => {
  await launchFresh();
  await completeOnboarding();
});

afterAll(async () => {
  await device.terminateApp();
});

describe('My new flow', () => {
  it('does something useful', async () => {
    await safeTap('my-action-button');
    await waitForElement('result-screen', UI_TIMEOUT);
    await assertVisible('result-screen');
  });
});
```

---

## 11. Debugging failures

### View artifacts from CI

After a failed CI run, download the artifact zip from the Actions UI:

```
e2e-artifacts-ios-<suite>-<run-number>.zip
```

It contains:
- **Screenshots** of the screen at the moment of failure
- **Device logs** from the simulator / emulator

### Run with verbose logging locally

```bash
DETOX_LOGLEVEL=trace npx detox test --configuration ios.sim.debug
```

### Inspect the simulator live

```bash
# Open Simulator app while a test is running
open -a Simulator
```

### Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Element not found: by.id("foo")` | Missing `testID` prop | Add `testID="foo"` to the component |
| Test hangs for 2 minutes then fails | App crashed on launch | Check Metro bundler is running; check crash logs |
| `Could not find simulator` | Xcode / device mismatch | Run `xcrun simctl list devices` to verify the device name |
| All tests fail immediately | Binary not built | Run `npm run e2e:build:ios` first |
| Intermittent `not visible` errors | Animation race | Add `waitFor(...).withTimeout(...)` after interactions |
