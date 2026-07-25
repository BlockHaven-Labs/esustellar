// e2e/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  rootDir: '..',

  // Match all E2E test files written in TypeScript
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],

  // 2 minutes per test — blockchain operations can be slow on testnet
  testTimeout: 120_000,

  // Detox requires serial execution
  maxWorkers: 1,

  // Detox lifecycle hooks
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'detox/runners/jest/reporter',
    // JUnit XML for CI — consumed by GitHub Actions test summary and Codecov
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/e2e/reports',
        outputName: 'junit.xml',
        suiteName: 'EsuStellar E2E',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' > ',
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,

  // ── Flaky test mitigation ──────────────────────────────────────────────────
  // Retry flaky tests up to 2 extra times before marking them as failed.
  // Set DETOX_RETRIES=0 locally if you want failures on first attempt.
  retryTimes: parseInt(process.env.DETOX_RETRIES ?? '2', 10),

  // TypeScript support (via ts-jest or babel-jest already configured in project)
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        configFile: './babel.config.js',
      },
    ],
  },
};

export default config;