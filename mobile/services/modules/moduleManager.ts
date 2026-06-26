// ─────────────────────────────────────────────────────────────────────────────
// ModuleManager — core of the micro-frontend module system
//
// Responsibilities:
//   1. Register / unregister feature modules
//   2. Activate / deactivate modules in dependency order
//   3. Expose observable state for the UI layer
//   4. Surface module health for deployment verification
// ─────────────────────────────────────────────────────────────────────────────

import { AppModule, ModuleRegistration, ModuleStatus } from './moduleTypes';

type ModuleEventType =
  | 'activated'
  | 'deactivated'
  | 'error'
  | 'registered'
  | 'unregistered';

type ModuleEventHandler = (moduleId: string, payload?: unknown) => void;

class ModuleManager {
  private registry: Map<string, ModuleRegistration> = new Map();
  private activationOrder: string[] = [];
  private listeners: Map<ModuleEventType, Set<ModuleEventHandler>> = new Map();

  // ── Registration ────────────────────────────────────────────────────────────

  registerModule(module: AppModule): void {
    if (this.registry.has(module.id)) {
      throw new Error(`[ModuleManager] Module "${module.id}" is already registered`);
    }
    this.registry.set(module.id, { module, status: 'idle' });
    this.emit('registered', module.id);
  }

  unregisterModule(id: string): void {
    const reg = this.registry.get(id);
    if (!reg) return;

    if (reg.status === 'active') {
      // Deactivate synchronously if possible; fire-and-forget async
      void this.deactivateModule(id);
    }
    this.registry.delete(id);
    this.emit('unregistered', id);
  }

  // ── Activation ──────────────────────────────────────────────────────────────

  async activateModule(id: string): Promise<void> {
    const reg = this.registry.get(id);
    if (!reg) {
      throw new Error(`[ModuleManager] Module "${id}" not found`);
    }
    if (reg.status === 'active') return;
    if (reg.status === 'activating') {
      // Already in flight — wait by polling (avoids circular promise chains)
      await this.waitForStatus(id, 'active');
      return;
    }

    // Activate dependencies first
    for (const depId of reg.module.dependencies) {
      if (!this.registry.has(depId)) {
        throw new Error(
          `[ModuleManager] Module "${id}" depends on unregistered module "${depId}"`,
        );
      }
      await this.activateModule(depId);
    }

    this.setStatus(id, 'activating');
    try {
      await reg.module.activate();
      this.setStatus(id, 'active');
      reg.activatedAt = Date.now();
      this.activationOrder.push(id);
      this.emit('activated', id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus(id, 'error', message);
      this.emit('error', id, err);
      throw err;
    }
  }

  async deactivateModule(id: string): Promise<void> {
    const reg = this.registry.get(id);
    if (!reg || reg.status !== 'active') return;

    if (this.hasDependents(id)) {
      throw new Error(
        `[ModuleManager] Cannot deactivate "${id}": other active modules depend on it`,
      );
    }

    this.setStatus(id, 'deactivating');
    try {
      await reg.module.deactivate();
      this.setStatus(id, 'idle');
      this.activationOrder = this.activationOrder.filter((m) => m !== id);
      this.emit('deactivated', id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setStatus(id, 'error', message);
      this.emit('error', id, err);
      throw err;
    }
  }

  /** Activate a set of modules in parallel where possible (respects deps) */
  async activateModules(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.activateModule(id)));
  }

  /** Deactivate all active modules in reverse activation order */
  async deactivateAll(): Promise<void> {
    const reversed = [...this.activationOrder].reverse();
    for (const id of reversed) {
      await this.deactivateModule(id);
    }
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  getActiveModules(): AppModule[] {
    return this.activationOrder
      .filter((id) => this.getStatus(id) === 'active')
      .map((id) => this.registry.get(id)!.module);
  }

  getRegisteredModules(): AppModule[] {
    return Array.from(this.registry.values()).map((r) => r.module);
  }

  getModule(id: string): AppModule | undefined {
    return this.registry.get(id)?.module;
  }

  getRegistration(id: string): ModuleRegistration | undefined {
    return this.registry.get(id);
  }

  isModuleActive(id: string): boolean {
    return this.getStatus(id) === 'active';
  }

  getStatus(id: string): ModuleStatus {
    return this.registry.get(id)?.status ?? 'idle';
  }

  /** Run health checks on all active modules. Returns per-module results. */
  async runHealthChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const id of this.activationOrder) {
      const reg = this.registry.get(id);
      if (!reg || reg.status !== 'active') continue;
      try {
        results[id] = reg.module.healthCheck
          ? await reg.module.healthCheck()
          : true;
      } catch {
        results[id] = false;
      }
    }
    return results;
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  on(event: ModuleEventType, handler: ModuleEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private setStatus(id: string, status: ModuleStatus, error?: string): void {
    const reg = this.registry.get(id);
    if (reg) {
      reg.status = status;
      if (error) reg.error = error;
    }
  }

  private hasDependents(id: string): boolean {
    for (const [, reg] of this.registry) {
      if (
        reg.status === 'active' &&
        reg.module.dependencies.includes(id)
      ) {
        return true;
      }
    }
    return false;
  }

  private emit(event: ModuleEventType, moduleId: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((h) => h(moduleId, payload));
  }

  private waitForStatus(id: string, target: ModuleStatus, maxMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (this.getStatus(id) === target) {
          resolve();
          return;
        }
        if (this.getStatus(id) === 'error') {
          reject(new Error(`[ModuleManager] Module "${id}" errored while waiting`));
          return;
        }
        if (Date.now() - start > maxMs) {
          reject(new Error(`[ModuleManager] Timed out waiting for "${id}" to reach "${target}"`));
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }
}

export const moduleManager = new ModuleManager();
export { ModuleManager };
