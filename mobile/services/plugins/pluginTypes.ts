export interface PluginContext {
  app: unknown;
  logger: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };
}

export interface PluginHook {
  before?: (data: unknown) => unknown | Promise<unknown>;
  after?: (data: unknown) => unknown | Promise<unknown>;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  init: (context: PluginContext) => void | Promise<void>;
  hooks: Record<string, PluginHook>;
  onActivate?: () => void | Promise<void>;
  onDeactivate?: () => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}
