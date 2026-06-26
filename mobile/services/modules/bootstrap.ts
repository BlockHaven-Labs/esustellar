// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap — app startup sequence for the modular bundle system
//
// Called once from app/_layout.tsx during app initialization.
// Registers all feature modules, activates critical ones, then defers
// non-critical activation until after first paint.
// ─────────────────────────────────────────────────────────────────────────────

import { moduleManager } from './moduleManager';
import { ALL_MODULES, coreModule } from './moduleRegistry';
import { getCriticalBundles } from './bundleManifest';
import { deploymentVerifier } from './deploymentVerifier';
import { logger } from '../logger';
import { runAfterInteractions } from '../performance/interactionManager';

const TAG = 'Bootstrap';

export interface BootstrapResult {
  success: boolean;
  error?: string;
}

/**
 * Register and activate all feature modules.
 *
 * Strategy:
 *   - Register ALL modules upfront (lightweight — no side effects)
 *   - Activate CRITICAL modules synchronously before first render
 *   - Defer non-critical activations until after interactions settle
 */
export async function bootstrapModules(): Promise<BootstrapResult> {
  try {
    // Step 1: Register all known modules
    for (const module of ALL_MODULES) {
      try {
        moduleManager.registerModule(module);
      } catch (err) {
        // Skip already-registered (can happen during hot reload in dev)
        if (!(err instanceof Error && err.message.includes('already registered'))) {
          throw err;
        }
      }
    }

    // Step 2: Activate critical modules now (blocks first render if they fail)
    const criticalIds = getCriticalBundles().map((e) => e.moduleId);
    logger.info(TAG, `Activating ${criticalIds.length} critical modules`, criticalIds);

    for (const id of criticalIds) {
      if (moduleManager.getModule(id)) {
        await moduleManager.activateModule(id);
      }
    }

    // Step 3: Defer non-critical module activation
    const allIds = ALL_MODULES.map((m) => m.id);
    const lazyIds = allIds.filter((id) => !criticalIds.includes(id));

    runAfterInteractions(() => {
      void (async () => {
        logger.info(TAG, `Activating ${lazyIds.length} lazy modules`, lazyIds);
        for (const id of lazyIds) {
          try {
            await moduleManager.activateModule(id);
          } catch (err) {
            logger.warn(TAG, `Lazy module "${id}" failed to activate`, err);
          }
        }
      })();
    }, 'lazy-module-activation');

    // Step 4: Verify the deployment is healthy
    const { passed, summary } = await deploymentVerifier.verify();
    if (!passed) {
      logger.warn(TAG, `Deployment verification issues: ${summary}`);
      // Non-fatal — log and continue
    }

    logger.info(TAG, 'Module bootstrap complete');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(TAG, `Bootstrap failed: ${message}`, err);
    return { success: false, error: message };
  }
}

/**
 * Tear down all modules cleanly (e.g. during logout or app reset).
 */
export async function teardownModules(): Promise<void> {
  logger.info(TAG, 'Tearing down all modules');
  await moduleManager.deactivateAll();
}
