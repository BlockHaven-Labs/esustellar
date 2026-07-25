/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.ts',
    },
    jest: {
      setupTimeout: 120_000,
    },
  },

  // ── App binary definitions ──────────────────────────────────────────────────

  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Debug-iphonesimulator/esustellar.app',
      build:
        'xcodebuild -workspace ios/esustellar.xcworkspace -scheme esustellar -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build | xcbeautify',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath:
        'ios/build/Build/Products/Release-iphonesimulator/esustellar.app',
      build:
        'xcodebuild -workspace ios/esustellar.xcworkspace -scheme esustellar -configuration Release -sdk iphonesimulator -derivedDataPath ios/build | xcbeautify',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },

  // ── Device definitions ──────────────────────────────────────────────────────

  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    'simulator.ci': {
      type: 'ios.simulator',
      device: {
        // Explicit OS pinned for reproducible CI builds
        type: 'iPhone 15',
        os: 'iOS 17.5',
      },
    },
    'simulator.tablet': {
      type: 'ios.simulator',
      device: { type: 'iPad Pro (12.9-inch) (6th generation)' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
    },
    'emulator.ci': {
      type: 'android.emulator',
      device: { avdName: 'Pixel_6_API_34' },
      // Use headless mode in CI to avoid needing a display
      headless: true,
      gpuMode: 'swiftshader_indirect',
    },
    'emulator.tablet': {
      type: 'android.emulator',
      device: { avdName: 'Pixel_Tablet_API_34' },
    },
  },

  // ── Build / run configurations ──────────────────────────────────────────────

  configurations: {
    // ── Local development ─────────────────────────────────────────────────────
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'ios.tablet.debug': {
      device: 'simulator.tablet',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    'android.tablet.debug': {
      device: 'emulator.tablet',
      app: 'android.debug',
    },

    // ── CI configurations ─────────────────────────────────────────────────────
    // These configurations use the pinned OS / headless mode flags above.
    'ios.sim.ci': {
      device: 'simulator.ci',
      app: 'ios.release',
      // Detox artifacts go to a predictable path for upload in CI
      artifacts: {
        rootDir: '.artifacts/ci',
        plugins: {
          log: { enabled: true, keepOnlyFailedTestsArtifacts: true },
          screenshot: { mode: 'failing' },
          video: { enabled: false },
        },
      },
    },
    'android.emu.ci': {
      device: 'emulator.ci',
      app: 'android.release',
      artifacts: {
        rootDir: '.artifacts/ci',
        plugins: {
          log: { enabled: true, keepOnlyFailedTestsArtifacts: true },
          screenshot: { mode: 'failing' },
          video: { enabled: false },
        },
      },
    },
  },
};
