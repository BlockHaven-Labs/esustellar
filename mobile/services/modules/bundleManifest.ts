// ─────────────────────────────────────────────────────────────────────────────
// Bundle Manifest — maps each feature module to its JS bundle entry point
//
// In Expo (Metro bundler), true code-splitting at the module level is achieved
// via:
//   1. `expo-router` file-based route groups  → Expo's built-in lazy loading
//   2. `React.lazy` + dynamic `import()`       → component-level splitting
//   3. This manifest                           → tracks per-module metadata
//
// Each entry here mirrors one Expo Router route group and one AppModule ID.
// At build time (see scripts/generate-bundle-manifest.js) the `checksum` and
// `bundleUrl` fields are populated automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { ModuleId, SemVer } from './moduleTypes';

export interface BundleEntry {
  /** Matches AppModule.id */
  moduleId: ModuleId | string;
  /** Expo Router group or screen path (relative to app/) */
  routeGroup: string;
  /** Semantic version — incremented on each independent deployment */
  version: SemVer;
  /**
   * Whether this bundle MUST be present for the app to start.
   * Non-critical modules can be deferred to after first paint.
   */
  critical: boolean;
  /** SHA-256 of the bundled JS (filled at build time) */
  checksum: string;
  /** OTA download URL (filled at build/release time) */
  bundleUrl: string;
  /** Minimum app binary version that supports this bundle */
  minAppVersion: SemVer;
}

/**
 * Static bundle manifest.
 *
 * `checksum` and `bundleUrl` are intentionally empty strings here;
 * the build script (scripts/generate-bundle-manifest.js) replaces them
 * at CI time so the runtime always has fresh values.
 */
export const BUNDLE_MANIFEST: BundleEntry[] = [
  {
    moduleId: 'core',
    routeGroup: 'app/_layout',
    version: '1.0.0',
    critical: true,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'auth',
    routeGroup: 'app/wallet',
    version: '1.0.0',
    critical: true,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'onboarding',
    routeGroup: 'app/onboarding',
    version: '1.0.0',
    critical: false,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'wallet',
    routeGroup: 'app/wallet',
    version: '1.0.0',
    critical: true,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'groups',
    routeGroup: 'app/(tabs)/groups',
    version: '1.0.0',
    critical: false,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'contributions',
    routeGroup: 'app/contributions',
    version: '1.0.0',
    critical: false,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'notifications',
    routeGroup: 'app/notifications',
    version: '1.0.0',
    critical: false,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'security',
    routeGroup: 'app/security',
    version: '1.0.0',
    critical: true,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'settings',
    routeGroup: 'app/settings',
    version: '1.0.0',
    critical: false,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
  {
    moduleId: 'analytics',
    routeGroup: 'services/analytics',
    version: '1.0.0',
    critical: false,
    checksum: '',
    bundleUrl: '',
    minAppVersion: '1.0.0',
  },
];

/** Lookup a bundle entry by module ID */
export function getBundleEntry(moduleId: string): BundleEntry | undefined {
  return BUNDLE_MANIFEST.find((e) => e.moduleId === moduleId);
}

/** Get all critical bundles (required at app startup) */
export function getCriticalBundles(): BundleEntry[] {
  return BUNDLE_MANIFEST.filter((e) => e.critical);
}

/** Get all non-critical bundles (can be lazy-loaded) */
export function getLazyBundles(): BundleEntry[] {
  return BUNDLE_MANIFEST.filter((e) => !e.critical);
}
