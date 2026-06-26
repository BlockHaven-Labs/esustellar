// ─────────────────────────────────────────────────────────────────────────────
// DeploymentVerifier — validates that a deployment is healthy post-update
//
// Called after applying updates (or at app startup) to confirm:
//   1. All critical modules are active
//   2. All active modules pass their health checks
//   3. No conflicting module versions are present
//   4. Dependency constraints are satisfied
// ─────────────────────────────────────────────────────────────────────────────

import { moduleManager } from './moduleManager';
import { BUNDLE_MANIFEST } from './bundleManifest';
import { ALL_MODULES } from './moduleRegistry';
import { SemVer } from './moduleTypes';
import { logger } from '../logger';

const TAG = 'DeploymentVerifier';

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  summary: string;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  details?: string;
}

// ── Individual checks ─────────────────────────────────────────────────────────

function checkCriticalModulesActive(): VerificationCheck {
  const criticalIds = BUNDLE_MANIFEST.filter((e) => e.critical).map((e) => e.moduleId);
  const inactive = criticalIds.filter((id) => !moduleManager.isModuleActive(id));

  return {
    name: 'Critical modules active',
    passed: inactive.length === 0,
    details:
      inactive.length > 0
        ? `Inactive critical modules: ${inactive.join(', ')}`
        : 'All critical modules are active',
  };
}

async function checkModuleHealthChecks(): Promise<VerificationCheck> {
  const results = await moduleManager.runHealthChecks();
  const failed = Object.entries(results)
    .filter(([, ok]) => !ok)
    .map(([id]) => id);

  return {
    name: 'Module health checks',
    passed: failed.length === 0,
    details:
      failed.length > 0
        ? `Failing health checks: ${failed.join(', ')}`
        : 'All health checks passed',
  };
}

function checkDependencySatisfied(): VerificationCheck {
  const violations: string[] = [];

  for (const module of moduleManager.getActiveModules()) {
    for (const depId of module.dependencies) {
      if (!moduleManager.isModuleActive(depId)) {
        violations.push(`"${module.id}" requires "${depId}" (not active)`);
      }
    }
  }

  return {
    name: 'Dependency satisfaction',
    passed: violations.length === 0,
    details:
      violations.length > 0
        ? `Unsatisfied dependencies: ${violations.join('; ')}`
        : 'All dependencies satisfied',
  };
}

function checkNoVersionConflicts(): VerificationCheck {
  // Each registered module should appear at most once.
  // A conflict would occur if two registrations with the same id exist
  // (the manager already prevents this, but we verify defensively).
  const ids = moduleManager.getRegisteredModules().map((m) => m.id);
  const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);

  return {
    name: 'No version conflicts',
    passed: duplicates.length === 0,
    details:
      duplicates.length > 0
        ? `Duplicate module IDs: ${[...new Set(duplicates)].join(', ')}`
        : 'No conflicts detected',
  };
}

function checkBundleManifestIntegrity(): VerificationCheck {
  // Every registered AppModule should have a corresponding bundle entry
  const manifestIds = new Set(BUNDLE_MANIFEST.map((e) => e.moduleId));
  const untracked = ALL_MODULES.map((m) => m.id).filter((id) => !manifestIds.has(id));

  return {
    name: 'Bundle manifest integrity',
    passed: untracked.length === 0,
    details:
      untracked.length > 0
        ? `Modules not in bundle manifest: ${untracked.join(', ')}`
        : 'All modules have bundle entries',
  };
}

// ── Main verifier ─────────────────────────────────────────────────────────────

export const deploymentVerifier = {
  /**
   * Run all verification checks.
   * Returns a structured report. Does NOT throw — callers decide how to handle failures.
   */
  async verify(): Promise<VerificationResult> {
    logger.info(TAG, 'Starting deployment verification');

    const checks: VerificationCheck[] = await Promise.all([
      Promise.resolve(checkCriticalModulesActive()),
      checkModuleHealthChecks(),
      Promise.resolve(checkDependencySatisfied()),
      Promise.resolve(checkNoVersionConflicts()),
      Promise.resolve(checkBundleManifestIntegrity()),
    ]);

    const passed = checks.every((c) => c.passed);
    const failedChecks = checks.filter((c) => !c.passed);

    const summary = passed
      ? `All ${checks.length} deployment checks passed`
      : `${failedChecks.length}/${checks.length} checks failed: ${failedChecks.map((c) => c.name).join(', ')}`;

    logger.info(TAG, summary);

    return { passed, checks, summary };
  },

  /**
   * Quick pass/fail — use for startup gate.
   */
  async isHealthy(): Promise<boolean> {
    const result = await this.verify();
    return result.passed;
  },
};
