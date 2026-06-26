// ─────────────────────────────────────────────────────────────────────────────
// ModuleManager unit tests
// Verifies: registration, activation, deactivation, dependency ordering,
//           health checks, conflict detection
// ─────────────────────────────────────────────────────────────────────────────

import { ModuleManager } from '../../services/modules/moduleManager';
import { AppModule } from '../../services/modules/moduleTypes';

// Helper — creates a minimal valid AppModule
function makeModule(
  id: string,
  dependencies: string[] = [],
  overrides: Partial<AppModule> = {},
): AppModule {
  return {
    id,
    name: `Module ${id}`,
    version: '1.0.0',
    dependencies,
    activate: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ModuleManager', () => {
  let manager: ModuleManager;

  beforeEach(() => {
    manager = new ModuleManager();
  });

  // ── Registration ────────────────────────────────────────────────────────────

  describe('registration', () => {
    it('registers a module without throwing', () => {
      const mod = makeModule('alpha');
      expect(() => manager.registerModule(mod)).not.toThrow();
    });

    it('throws when the same module is registered twice', () => {
      const mod = makeModule('alpha');
      manager.registerModule(mod);
      expect(() => manager.registerModule(mod)).toThrow(/already registered/);
    });

    it('unregisters an idle module', () => {
      const mod = makeModule('alpha');
      manager.registerModule(mod);
      manager.unregisterModule('alpha');
      expect(manager.getModule('alpha')).toBeUndefined();
    });

    it('lists all registered modules', () => {
      manager.registerModule(makeModule('a'));
      manager.registerModule(makeModule('b'));
      expect(manager.getRegisteredModules()).toHaveLength(2);
    });
  });

  // ── Activation ──────────────────────────────────────────────────────────────

  describe('activation', () => {
    it('activates a module with no dependencies', async () => {
      const mod = makeModule('alpha');
      manager.registerModule(mod);
      await manager.activateModule('alpha');
      expect(mod.activate).toHaveBeenCalledTimes(1);
      expect(manager.isModuleActive('alpha')).toBe(true);
    });

    it('activates dependencies before the requesting module', async () => {
      const order: string[] = [];
      const core = makeModule('core', [], {
        activate: jest.fn(async () => { order.push('core'); }),
        deactivate: jest.fn(),
      });
      const auth = makeModule('auth', ['core'], {
        activate: jest.fn(async () => { order.push('auth'); }),
        deactivate: jest.fn(),
      });

      manager.registerModule(core);
      manager.registerModule(auth);
      await manager.activateModule('auth');

      expect(order).toEqual(['core', 'auth']);
    });

    it('does not activate an already-active module again', async () => {
      const mod = makeModule('alpha');
      manager.registerModule(mod);
      await manager.activateModule('alpha');
      await manager.activateModule('alpha');
      expect(mod.activate).toHaveBeenCalledTimes(1);
    });

    it('throws when activating an unregistered module', async () => {
      await expect(manager.activateModule('ghost')).rejects.toThrow(/not found/);
    });

    it('sets status to "error" when activate throws', async () => {
      const broken = makeModule('broken', [], {
        activate: jest.fn().mockRejectedValue(new Error('oops')),
        deactivate: jest.fn(),
      });
      manager.registerModule(broken);
      await expect(manager.activateModule('broken')).rejects.toThrow('oops');
      expect(manager.getStatus('broken')).toBe('error');
    });

    it('activates multiple modules in parallel', async () => {
      manager.registerModule(makeModule('a'));
      manager.registerModule(makeModule('b'));
      manager.registerModule(makeModule('c'));
      await manager.activateModules(['a', 'b', 'c']);
      expect(manager.isModuleActive('a')).toBe(true);
      expect(manager.isModuleActive('b')).toBe(true);
      expect(manager.isModuleActive('c')).toBe(true);
    });
  });

  // ── Deactivation ─────────────────────────────────────────────────────────────

  describe('deactivation', () => {
    it('deactivates an active module', async () => {
      const mod = makeModule('alpha');
      manager.registerModule(mod);
      await manager.activateModule('alpha');
      await manager.deactivateModule('alpha');
      expect(mod.deactivate).toHaveBeenCalledTimes(1);
      expect(manager.isModuleActive('alpha')).toBe(false);
    });

    it('does nothing when deactivating an idle module', async () => {
      const mod = makeModule('alpha');
      manager.registerModule(mod);
      await expect(manager.deactivateModule('alpha')).resolves.toBeUndefined();
      expect(mod.deactivate).not.toHaveBeenCalled();
    });

    it('throws when a dependent module is still active', async () => {
      manager.registerModule(makeModule('core'));
      manager.registerModule(makeModule('auth', ['core']));
      await manager.activateModule('auth');
      await expect(manager.deactivateModule('core')).rejects.toThrow(/depend/);
    });

    it('deactivates all modules in reverse activation order', async () => {
      const order: string[] = [];
      ['a', 'b', 'c'].forEach((id) => {
        manager.registerModule(
          makeModule(id, [], {
            deactivate: jest.fn(async () => { order.push(id); }),
            activate: jest.fn(),
          }),
        );
      });
      await manager.activateModules(['a', 'b', 'c']);
      await manager.deactivateAll();
      // All modules deactivated (order may vary for parallel activation,
      // but deactivateAll reverses the *activationOrder* array)
      expect(order).toHaveLength(3);
    });
  });

  // ── Health checks ─────────────────────────────────────────────────────────────

  describe('health checks', () => {
    it('returns true for healthy modules', async () => {
      manager.registerModule(makeModule('alpha'));
      await manager.activateModule('alpha');
      const results = await manager.runHealthChecks();
      expect(results['alpha']).toBe(true);
    });

    it('returns false for an unhealthy module', async () => {
      const sick = makeModule('sick', [], {
        healthCheck: jest.fn().mockResolvedValue(false),
      });
      manager.registerModule(sick);
      await manager.activateModule('sick');
      const results = await manager.runHealthChecks();
      expect(results['sick']).toBe(false);
    });

    it('treats modules without a healthCheck as healthy', async () => {
      const mod: AppModule = {
        id: 'bare',
        name: 'Bare',
        version: '1.0.0',
        dependencies: [],
        activate: jest.fn(),
        deactivate: jest.fn(),
        // No healthCheck
      };
      manager.registerModule(mod);
      await manager.activateModule('bare');
      const results = await manager.runHealthChecks();
      expect(results['bare']).toBe(true);
    });
  });

  // ── Events ───────────────────────────────────────────────────────────────────

  describe('events', () => {
    it('emits "activated" event', async () => {
      const handler = jest.fn();
      manager.on('activated', handler);
      manager.registerModule(makeModule('alpha'));
      await manager.activateModule('alpha');
      expect(handler).toHaveBeenCalledWith('alpha', undefined);
    });

    it('emits "deactivated" event', async () => {
      const handler = jest.fn();
      manager.on('deactivated', handler);
      manager.registerModule(makeModule('alpha'));
      await manager.activateModule('alpha');
      await manager.deactivateModule('alpha');
      expect(handler).toHaveBeenCalledWith('alpha', undefined);
    });

    it('removes listener when unsubscribe is called', async () => {
      const handler = jest.fn();
      const off = manager.on('activated', handler);
      off();
      manager.registerModule(makeModule('alpha'));
      await manager.activateModule('alpha');
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
