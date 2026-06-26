import { Plugin, PluginContext } from './pluginTypes';

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private initializedPlugins: Set<string> = new Set();
  private context: PluginContext = {
    app: {},
    logger: {
      info: (msg: string) => console.log(`[plugins] ${msg}`),
      warn: (msg: string) => console.warn(`[plugins] ${msg}`),
      error: (msg: string) => console.error(`[plugins] ${msg}`),
    },
  };

  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`[pluginRegistry] Plugin "${plugin.id}" is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
    this.context.logger.info(`Registered plugin "${plugin.id}" v${plugin.version}`);
  }

  unregisterPlugin(id: string): void {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      this.context.logger.warn(`[pluginRegistry] Plugin "${id}" not found for unregistration`);
      return;
    }
    if (this.initializedPlugins.has(id)) {
      plugin.onDeactivate?.();
      this.initializedPlugins.delete(id);
    }
    this.plugins.delete(id);
    this.context.logger.info(`Unregistered plugin "${id}"`);
  }

  async initializePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`[pluginRegistry] Plugin "${id}" not found`);
    }
    if (this.initializedPlugins.has(id)) {
      return;
    }
    try {
      await plugin.init(this.context);
      await plugin.onActivate?.();
      this.initializedPlugins.add(id);
      this.context.logger.info(`Initialized plugin "${id}"`);
    } catch (error) {
      this.context.logger.error(`Failed to initialize plugin "${id}": ${error}`);
      await plugin.onError?.(error as Error);
    }
  }

  async executeHook(hookName: string, data: unknown): Promise<unknown> {
    let result = data;
    for (const [id, plugin] of this.plugins) {
      const hook = plugin.hooks[hookName];
      if (!hook) continue;
      try {
        if (hook.before) {
          result = await hook.before(result);
        }
        if (hook.after) {
          result = await hook.after(result);
        }
        this.context.logger.info(`Plugin "${id}" executed hook "${hookName}"`);
      } catch (error) {
        this.context.logger.error(`Plugin "${id}" hook "${hookName}" failed: ${error}`);
        await plugin.onError?.(error as Error);
      }
    }
    return result;
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getRegisteredPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getInitializedPlugins(): Plugin[] {
    return Array.from(this.initializedPlugins).map((id) => this.plugins.get(id)!);
  }
}

export const pluginRegistry = new PluginRegistry();
export { PluginRegistry };
