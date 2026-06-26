export interface AppModule {
  id: string;
  dependencies: string[];
  activate: () => void | Promise<void>;
  deactivate: () => void | Promise<void>;
}
