// ─────────────────────────────────────────────────────────────────────────────
// Module system types
// Supports micro-frontend / modular bundle strategy for independent deployment
// ─────────────────────────────────────────────────────────────────────────────

/** Semantic version string, e.g. "1.2.3" */
export type SemVer = `${number}.${number}.${number}`;

/** All first-party feature module IDs */
export type ModuleId =
  | 'core'
  | 'auth'
  | 'wallet'
  | 'groups'
  | 'contributions'
  | 'notifications'
  | 'security'
  | 'settings'
  | 'analytics'
  | 'onboarding';

export type ModuleStatus = 'idle' | 'activating' | 'active' | 'deactivating' | 'error';

export interface ModuleMetadata {
  /** Unique module identifier */
  id: ModuleId | string;
  /** Human-readable name */
  name: string;
  /** Semantic version — used for independent update tracking */
  version: SemVer;
  /** Module IDs this module requires to be active first */
  dependencies: string[];
  /**
   * Optional checksum (SHA-256 hex) of the module bundle.
   * Populated at build time and verified at runtime.
   */
  checksum?: string;
  /**
   * OTA bundle URL for this specific module.
   * When set, the module loader can hot-update this module independently.
   */
  bundleUrl?: string;
}

export interface AppModule extends ModuleMetadata {
  /** Called when the module is being activated (async supported) */
  activate: () => void | Promise<void>;
  /** Called when the module is being deactivated (async supported) */
  deactivate: () => void | Promise<void>;
  /**
   * Optional health-check. Returns true if the module is healthy.
   * Used by the deployment verifier.
   */
  healthCheck?: () => boolean | Promise<boolean>;
}

export interface ModuleRegistration {
  module: AppModule;
  status: ModuleStatus;
  activatedAt?: number;
  error?: string;
}

export interface ModuleUpdateManifest {
  /** Version of the manifest format itself */
  manifestVersion: number;
  /** When this manifest was published (ISO-8601) */
  publishedAt: string;
  modules: Array<{
    id: string;
    version: SemVer;
    bundleUrl: string;
    checksum: string;
    minAppVersion: SemVer;
    changelog?: string;
  }>;
}
