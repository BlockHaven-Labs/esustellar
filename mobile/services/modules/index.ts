// Public API surface for the module system

export type { AppModule, ModuleMetadata, ModuleStatus, ModuleUpdateManifest, SemVer } from './moduleTypes';
export { moduleManager, ModuleManager } from './moduleManager';
export { ALL_MODULES } from './moduleRegistry';
export { BUNDLE_MANIFEST, getBundleEntry, getCriticalBundles, getLazyBundles } from './bundleManifest';
export { updateManager } from './updateManager';
export type { PendingUpdate } from './updateManager';
export { deploymentVerifier } from './deploymentVerifier';
export type { VerificationResult, VerificationCheck } from './deploymentVerifier';
export { bootstrapModules, teardownModules } from './bootstrap';
