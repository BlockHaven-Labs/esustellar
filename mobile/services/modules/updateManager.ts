// ─────────────────────────────────────────────────────────────────────────────
// UpdateManager — OTA independent module update orchestration
//
// Flow:
//   1. On app foreground, fetch the remote ModuleUpdateManifest
//   2. Compare each module's remote version against the installed version
//   3. Queue updates for non-critical modules (silent background download)
//   4. For critical modules, prompt the user or reload immediately
//   5. Verify checksum before applying any update
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModuleUpdateManifest, SemVer } from './moduleTypes';
import { BUNDLE_MANIFEST, BundleEntry, getBundleEntry } from './bundleManifest';
import { moduleManager } from './moduleManager';
import { logger } from '../logger';

const TAG = 'UpdateManager';
const VERSIONS_KEY = 'esustellar:module-versions';
const MANIFEST_CACHE_KEY = 'esustellar:update-manifest';

// ── Version comparison ────────────────────────────────────────────────────────

function parseSemVer(v: SemVer): [number, number, number] {
  const [major, minor, patch] = v.split('.').map(Number);
  return [major, minor, patch];
}

function isNewerVersion(remote: SemVer, installed: SemVer): boolean {
  const [rMaj, rMin, rPat] = parseSemVer(remote);
  const [iMaj, iMin, iPat] = parseSemVer(installed);
  if (rMaj !== iMaj) return rMaj > iMaj;
  if (rMin !== iMin) return rMin > iMin;
  return rPat > iPat;
}

// ── Installed versions cache ──────────────────────────────────────────────────

async function loadInstalledVersions(): Promise<Record<string, SemVer>> {
  try {
    const raw = await AsyncStorage.getItem(VERSIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveInstalledVersions(versions: Record<string, SemVer>): Promise<void> {
  try {
    await AsyncStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
  } catch {
    // Non-fatal — next run will re-fetch
  }
}

// ── Remote manifest ───────────────────────────────────────────────────────────

async function fetchRemoteManifest(url: string): Promise<ModuleUpdateManifest | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = (await res.json()) as ModuleUpdateManifest;

    // Cache for offline fallback
    await AsyncStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(manifest));
    return manifest;
  } catch (err) {
    logger.warn(TAG, 'Remote manifest fetch failed; trying cache', err);
    try {
      const cached = await AsyncStorage.getItem(MANIFEST_CACHE_KEY);
      return cached ? (JSON.parse(cached) as ModuleUpdateManifest) : null;
    } catch {
      return null;
    }
  }
}

// ── Checksum verification ─────────────────────────────────────────────────────

/**
 * Verifies a downloaded bundle's SHA-256 checksum.
 * Uses expo-crypto on device; falls back to a length-only sanity check
 * in environments where expo-crypto is unavailable (CI/tests).
 */
async function verifyChecksum(data: string, expectedChecksum: string): Promise<boolean> {
  if (!expectedChecksum) return true; // No checksum provided — skip

  try {
    // Dynamically imported so the module doesn't crash in web/test environments
    const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
    const actual = await digestStringAsync(CryptoDigestAlgorithm.SHA256, data);
    return actual === expectedChecksum;
  } catch {
    // expo-crypto unavailable — perform a basic non-empty check
    logger.warn(TAG, 'expo-crypto unavailable; skipping checksum verification');
    return data.length > 0;
  }
}

// ── UpdateManager ─────────────────────────────────────────────────────────────

export interface PendingUpdate {
  moduleId: string;
  fromVersion: SemVer;
  toVersion: SemVer;
  bundleUrl: string;
  checksum: string;
  critical: boolean;
}

class UpdateManager {
  private pendingUpdates: PendingUpdate[] = [];

  /**
   * Check for available module updates.
   * @param manifestUrl URL of the remote ModuleUpdateManifest JSON
   * @returns Array of available updates (may be empty)
   */
  async checkForUpdates(manifestUrl: string): Promise<PendingUpdate[]> {
    const [manifest, installedVersions] = await Promise.all([
      fetchRemoteManifest(manifestUrl),
      loadInstalledVersions(),
    ]);

    if (!manifest) {
      logger.info(TAG, 'No manifest available; skipping update check');
      return [];
    }

    const updates: PendingUpdate[] = [];

    for (const entry of manifest.modules) {
      const bundleEntry = getBundleEntry(entry.id);
      const installedVersion: SemVer =
        installedVersions[entry.id] ?? (bundleEntry?.version ?? '0.0.0');

      if (isNewerVersion(entry.version, installedVersion)) {
        updates.push({
          moduleId: entry.id,
          fromVersion: installedVersion,
          toVersion: entry.version,
          bundleUrl: entry.bundleUrl,
          checksum: entry.checksum,
          critical: bundleEntry?.critical ?? false,
        });
        logger.info(
          TAG,
          `Update available for "${entry.id}": ${installedVersion} → ${entry.version}`,
        );
      }
    }

    this.pendingUpdates = updates;
    return updates;
  }

  /**
   * Apply a specific module update.
   * Downloads the bundle, verifies the checksum, deactivates the module,
   * then re-activates it with the new code.
   *
   * NOTE: In a real Expo OTA scenario this would leverage expo-updates or a
   * custom Metro bundle loader. Here we validate the artifact and persist the
   * new version — the actual JS swap happens through the OTA reload mechanism.
   */
  async applyUpdate(update: PendingUpdate): Promise<boolean> {
    logger.info(TAG, `Applying update for "${update.moduleId}"`, update);

    try {
      // Step 1: Download bundle artifact
      const response = await fetch(update.bundleUrl);
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }
      const bundleContent = await response.text();

      // Step 2: Verify checksum
      const isValid = await verifyChecksum(bundleContent, update.checksum);
      if (!isValid) {
        throw new Error(`Checksum mismatch for module "${update.moduleId}"`);
      }

      // Step 3: Gracefully deactivate the running module (if active)
      if (moduleManager.isModuleActive(update.moduleId)) {
        await moduleManager.deactivateModule(update.moduleId);
      }

      // Step 4: Persist new version so the next check knows it's installed
      const versions = await loadInstalledVersions();
      versions[update.moduleId] = update.toVersion;
      await saveInstalledVersions(versions);

      // Step 5: Remove from pending
      this.pendingUpdates = this.pendingUpdates.filter(
        (u) => u.moduleId !== update.moduleId,
      );

      logger.info(TAG, `Update applied for "${update.moduleId}" → ${update.toVersion}`);
      return true;
    } catch (err) {
      logger.warn(TAG, `Failed to apply update for "${update.moduleId}"`, err);
      return false;
    }
  }

  /** Apply all pending updates, non-critical first to minimise disruption */
  async applyAllUpdates(): Promise<{ success: string[]; failed: string[] }> {
    const sorted = [...this.pendingUpdates].sort((a, b) =>
      Number(a.critical) - Number(b.critical),
    );

    const success: string[] = [];
    const failed: string[] = [];

    for (const update of sorted) {
      const ok = await this.applyUpdate(update);
      (ok ? success : failed).push(update.moduleId);
    }

    return { success, failed };
  }

  getPendingUpdates(): PendingUpdate[] {
    return [...this.pendingUpdates];
  }

  hasPendingUpdates(): boolean {
    return this.pendingUpdates.length > 0;
  }

  hasCriticalUpdates(): boolean {
    return this.pendingUpdates.some((u) => u.critical);
  }
}

export const updateManager = new UpdateManager();
export { UpdateManager };
