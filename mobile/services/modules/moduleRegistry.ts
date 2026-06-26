// ─────────────────────────────────────────────────────────────────────────────
// Feature Module Definitions
//
// Each top-level feature area is declared as a standalone AppModule.
// Modules map 1-to-1 with Expo Router route groups so the bundle splitter
// can co-locate JS, assets, and types per feature.
//
// Dependency graph (simplified):
//
//   core ──► auth ──► wallet ──► groups ──► contributions
//                 └──► security
//                 └──► notifications
//   core ──► onboarding
//   core ──► settings
//   core ──► analytics
// ─────────────────────────────────────────────────────────────────────────────

import { AppModule } from './moduleTypes';
import { logger } from '../logger';

const TAG = 'ModuleRegistry';

// ── Helpers ──────────────────────────────────────────────────────────────────

function noop(): void {}

function makeModule(
  partial: Omit<AppModule, 'activate' | 'deactivate'> &
    Partial<Pick<AppModule, 'activate' | 'deactivate' | 'healthCheck'>>,
): AppModule {
  return {
    activate: async () => {
      logger.info(TAG, `Activating module: ${partial.id}`);
    },
    deactivate: async () => {
      logger.info(TAG, `Deactivating module: ${partial.id}`);
    },
    ...partial,
  };
}

// ── Module definitions ────────────────────────────────────────────────────────

/**
 * CORE — always loaded.
 * Provides: theme, i18n, networking primitives, error boundary.
 */
export const coreModule: AppModule = makeModule({
  id: 'core',
  name: 'Core',
  version: '1.0.0',
  dependencies: [],
  healthCheck: () => true,
});

/**
 * AUTH — wallet connection & session management.
 * Route group: /wallet/connect, /onboarding
 */
export const authModule: AppModule = makeModule({
  id: 'auth',
  name: 'Authentication',
  version: '1.0.0',
  dependencies: ['core'],
});

/**
 * WALLET — multi-wallet management, hardware wallet, recovery.
 * Route group: /wallet/*
 */
export const walletModule: AppModule = makeModule({
  id: 'wallet',
  name: 'Wallet',
  version: '1.0.0',
  dependencies: ['auth'],
});

/**
 * GROUPS — ROSCA group creation, browsing, joining.
 * Route group: /groups/*, /(tabs)/groups
 */
export const groupsModule: AppModule = makeModule({
  id: 'groups',
  name: 'Savings Groups',
  version: '1.0.0',
  dependencies: ['wallet'],
});

/**
 * CONTRIBUTIONS — payment flows, offline signing, transaction queue.
 * Route group: /contributions/*
 */
export const contributionsModule: AppModule = makeModule({
  id: 'contributions',
  name: 'Contributions',
  version: '1.0.0',
  dependencies: ['groups'],
});

/**
 * NOTIFICATIONS — push & in-app notifications.
 * Route group: /notifications
 */
export const notificationsModule: AppModule = makeModule({
  id: 'notifications',
  name: 'Notifications',
  version: '1.0.0',
  dependencies: ['auth'],
});

/**
 * SECURITY — biometrics, PIN, app lock, fraud detection.
 * Route group: /security/*
 */
export const securityModule: AppModule = makeModule({
  id: 'security',
  name: 'Security',
  version: '1.0.0',
  dependencies: ['auth'],
});

/**
 * SETTINGS — language, theme, profile, preferences.
 * Route group: /settings/*
 */
export const settingsModule: AppModule = makeModule({
  id: 'settings',
  name: 'Settings',
  version: '1.0.0',
  dependencies: ['core'],
});

/**
 * ANALYTICS — usage tracking, performance monitoring.
 * No routes — background service only.
 */
export const analyticsModule: AppModule = makeModule({
  id: 'analytics',
  name: 'Analytics',
  version: '1.0.0',
  dependencies: ['core'],
});

/**
 * ONBOARDING — first-run experience.
 * Route group: /onboarding/*
 */
export const onboardingModule: AppModule = makeModule({
  id: 'onboarding',
  name: 'Onboarding',
  version: '1.0.0',
  dependencies: ['core'],
});

// ── Ordered list of all feature modules ──────────────────────────────────────

/**
 * All modules in safe boot order (dependencies before dependents).
 * Pass this array to `bootstrapModules()` at app startup.
 */
export const ALL_MODULES: AppModule[] = [
  coreModule,
  analyticsModule,
  authModule,
  securityModule,
  walletModule,
  notificationsModule,
  onboardingModule,
  groupsModule,
  contributionsModule,
  settingsModule,
];
