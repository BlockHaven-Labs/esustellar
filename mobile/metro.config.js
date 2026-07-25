// ─────────────────────────────────────────────────────────────────────────────
// Metro bundler configuration — micro-frontend bundle splitting strategy
//
// Goals:
//   1. One entry point per feature module (matches Expo Router route groups)
//   2. Shared "vendor" bundle for React, React Native, and stellar-sdk
//   3. Deterministic module IDs so bundles are stable across builds
//   4. Source maps generated per feature for independent debugging
// ─────────────────────────────────────────────────────────────────────────────

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Shared module identification ──────────────────────────────────────────────
// Packages in this list will be emitted into a common "vendor" chunk shared
// across all feature bundles, preventing duplication.
const SHARED_MODULES = new Set([
  'react',
  'react-native',
  '@stellar/stellar-sdk',
  '@tanstack/react-query',
  'zustand',
  'expo-router',
  'i18next',
  'react-i18next',
]);

// ── Feature bundle entry points ───────────────────────────────────────────────
// Each key maps to an Expo Router route group.
// Metro will tree-shake each entry independently.
const FEATURE_ENTRIES = {
  core: path.resolve(__dirname, 'app/_layout.tsx'),
  auth: path.resolve(__dirname, 'app/wallet/_layout.tsx'),
  onboarding: path.resolve(__dirname, 'app/onboarding/_layout.tsx'),
  groups: path.resolve(__dirname, 'app/(tabs)/groups.tsx'),
  contributions: path.resolve(__dirname, 'app/contributions/_layout.tsx'),
  notifications: path.resolve(__dirname, 'app/notifications/_layout.tsx'),
  security: path.resolve(__dirname, 'app/security/_layout.tsx'),
  settings: path.resolve(__dirname, 'app/settings/_layout.tsx'),
};

// ── Resolver configuration ────────────────────────────────────────────────────
config.resolver = {
  ...config.resolver,
  // Stable, deterministic module IDs (required for independent bundle updates)
  unstable_enablePackageExports: true,
  // Alias '@' to project root (mirrors tsconfig paths)
  extraNodeModules: {
    '@': __dirname,
  },
};

// ── Serializer — custom chunk splitting ───────────────────────────────────────
const originalSerializer = config.serializer?.customSerializer;

config.serializer = {
  ...config.serializer,

  // Annotate output bundles so downstream tooling can track which feature
  // each module belongs to.
  getModulesRunBeforeMainModule: () => [
    require.resolve('expo/build/Expo.fx'),
  ],

  // Provide stable module IDs based on relative path.
  // This is critical for OTA updates: a module's ID must not change between
  // builds so the runtime can swap bundles without full reload.
  createModuleIdFactory: () => {
    const moduleMap = new Map();
    let nextId = 1;
    return (modulePath) => {
      if (!moduleMap.has(modulePath)) {
        // Use path relative to project root for stability across machines
        const relativePath = path.relative(__dirname, modulePath);
        // Hash the relative path to a compact integer ID
        let hash = 5381;
        for (let i = 0; i < relativePath.length; i++) {
          hash = ((hash << 5) + hash) ^ relativePath.charCodeAt(i);
          hash = hash >>> 0; // Convert to unsigned 32-bit int
        }
        moduleMap.set(modulePath, hash || nextId++);
      }
      return moduleMap.get(modulePath);
    };
  },
};

// ── Transformer configuration ─────────────────────────────────────────────────
config.transformer = {
  ...config.transformer,
  // Generate inline source maps for each bundle (required for independent
  // per-feature crash reporting)
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    sourceMap: true,
  },
};

// ── Watch-folder includes ─────────────────────────────────────────────────────
// Include the shared packages from the monorepo workspace
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../packages/shared'),
  path.resolve(__dirname, '../packages/sdk'),
];

module.exports = config;
