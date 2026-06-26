import { AppModule } from './moduleTypes';

class ModuleManager {
  private modules: Map<string, AppModule> = new Map();
  private activeModules: Set<string> = new Set();
  private activationOrder: string[] = [];

  registerModule(module: AppModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`[moduleManager] Module "${module.id}" is already registered`);
    }
    this.modules.set(module.id, module);
  }

  unregisterModule(id: string): void {
    if (this.activeModules.has(id)) {
      this.deactivateModule(id);
    }
    this.modules.delete(id);
  }

  async activateModule(id: string): Promise<void> {
    const module = this.modules.get(id);
    if (!module) {
      throw new Error(`[moduleManager] Module "${id}" not found`);
    }
    if (this.activeModules.has(id)) {
      return;
    }

    for (const depId of module.dependencies) {
      if (!this.modules.has(depId)) {
        throw new Error(
          `[moduleManager] Module "${id}" depends on missing module "${depId}"`,
        );
      }
      await this.activateModule(depId);
    }

    await module.activate();
    this.activeModules.add(id);
    this.activationOrder.push(id);
  }

  async deactivateModule(id: string): Promise<void> {
    if (!this.activeModules.has(id)) {
      return;
    }

    if (this.hasDependentModules(id)) {
      throw new Error(
        `[moduleManager] Cannot deactivate module "${id}": other modules depend on it`,
      );
    }

    const module = this.modules.get(id);
    await module?.deactivate();
    this.activeModules.delete(id);
    this.activationOrder = this.activationOrder.filter((m) => m !== id);
  }

  private hasDependentModules(id: string): boolean {
    for (const [, module] of this.modules) {
      if (module.dependencies.includes(id) && this.activeModules.has(module.id)) {
        return true;
      }
    }
    return false;
  }

  getActiveModules(): AppModule[] {
    return this.activationOrder
      .filter((id) => this.activeModules.has(id))
      .map((id) => this.modules.get(id)!);
  }

  isModuleActive(id: string): boolean {
    return this.activeModules.has(id);
  }

  getModule(id: string): AppModule | undefined {
    return this.modules.get(id);
  }

  getRegisteredModules(): AppModule[] {
    return Array.from(this.modules.values());
  }
}

export const moduleManager = new ModuleManager();
export { ModuleManager };
