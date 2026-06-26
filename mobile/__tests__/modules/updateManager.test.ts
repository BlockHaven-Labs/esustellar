// ─────────────────────────────────────────────────────────────────────────────
// UpdateManager unit tests
// ─────────────────────────────────────────────────────────────────────────────

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock moduleManager
jest.mock('../../services/modules/moduleManager', () => ({
  moduleManager: {
    isModuleActive: jest.fn().mockReturnValue(false),
    deactivateModule: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
jest.mock('../../services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('abc123'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

import { UpdateManager } from '../../services/modules/updateManager';
import type { ModuleUpdateManifest } from '../../services/modules/moduleTypes';

// Expose the class for testing (updateManager singleton is tested indirectly)
// We re-implement a light version here using the class constructor directly.

describe('UpdateManager', () => {
  let manager: InstanceType<typeof UpdateManager>;

  const mockManifest: ModuleUpdateManifest = {
    manifestVersion: 1,
    publishedAt: '2026-06-26T00:00:00Z',
    modules: [
      {
        id: 'groups',
        version: '1.1.0',
        bundleUrl: 'https://cdn.example.com/groups.bundle.js',
        checksum: 'abc123',
        minAppVersion: '1.0.0',
      },
      {
        id: 'core',
        version: '1.0.0', // Same version — no update
        bundleUrl: 'https://cdn.example.com/core.bundle.js',
        checksum: 'def456',
        minAppVersion: '1.0.0',
      },
    ],
  };

  beforeEach(() => {
    // @ts-ignore — instantiate for unit testing
    manager = new UpdateManager();
    jest.clearAllMocks();
  });

  describe('checkForUpdates', () => {
    it('identifies modules with newer remote versions', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockManifest),
      }) as jest.Mock;

      const updates = await manager.checkForUpdates('https://cdn.example.com/manifest.json');

      // 'groups' should have an update (1.0.0 → 1.1.0)
      const groupsUpdate = updates.find((u) => u.moduleId === 'groups');
      expect(groupsUpdate).toBeDefined();
      expect(groupsUpdate?.toVersion).toBe('1.1.0');
    });

    it('does not flag a module with the same version', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockManifest),
      }) as jest.Mock;

      const updates = await manager.checkForUpdates('https://cdn.example.com/manifest.json');
      const coreUpdate = updates.find((u) => u.moduleId === 'core');
      expect(coreUpdate).toBeUndefined();
    });

    it('returns empty array when manifest fetch fails and no cache exists', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(null);

      const updates = await manager.checkForUpdates('https://cdn.example.com/manifest.json');
      expect(updates).toEqual([]);
    });
  });

  describe('applyUpdate', () => {
    it('returns false when bundle download fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const result = await manager.applyUpdate({
        moduleId: 'groups',
        fromVersion: '1.0.0',
        toVersion: '1.1.0',
        bundleUrl: 'https://cdn.example.com/groups.bundle.js',
        checksum: 'abc123',
        critical: false,
      });

      expect(result).toBe(false);
    });

    it('returns true when update succeeds', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('(function(){/* bundle */})()'),
      });

      const result = await manager.applyUpdate({
        moduleId: 'groups',
        fromVersion: '1.0.0',
        toVersion: '1.1.0',
        bundleUrl: 'https://cdn.example.com/groups.bundle.js',
        checksum: 'abc123', // matches mock digest
        critical: false,
      });

      expect(result).toBe(true);
    });
  });

  describe('hasPendingUpdates', () => {
    it('returns false before any check', () => {
      expect(manager.hasPendingUpdates()).toBe(false);
    });

    it('returns true after finding updates', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockManifest),
      }) as jest.Mock;

      await manager.checkForUpdates('https://cdn.example.com/manifest.json');
      expect(manager.hasPendingUpdates()).toBe(true);
    });
  });
});

// Export the class for the import above
export { UpdateManager } from '../../services/modules/updateManager';
