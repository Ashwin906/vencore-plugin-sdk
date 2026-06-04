import type { PluginContext } from '@vencore/plugin-types';

export type AnyComponent = import('react').ComponentType<any>;

export interface FrontendSurfaceRegistry {
  pages: Map<string, AnyComponent>;
  widgets: Map<string, AnyComponent>;
  /** key = `${recordType}:${id}` */
  panels: Map<string, { recordType: string; id: string; label: string; component: AnyComponent }>;
}

export interface VencoreFrontendAPI {
  registerPage(path: string, component: AnyComponent): void;
  registerWidget(id: string, component: AnyComponent): void;
  registerPanel(recordType: string, id: string, component: AnyComponent): void;
  getContext(): Promise<PluginContext>;
  navigate(path: string): void;
  toast(message: string, type?: 'success' | 'error' | 'info' | 'warning'): void;
  modal: {
    open(opts: { title: string; content?: any }): void;
    close(): void;
  };
  settings: {
    get<T = unknown>(key: string): Promise<T | null>;
  };
  user: {
    get(): Promise<{ id: string; name: string; email: string; role: string }>;
  };
  workspace: {
    get(): Promise<{ id: string; name: string; plan: string }>;
  };
  bus: {
    on(event: string, handler: (payload: unknown) => void): () => void;
  };
  list(resource: string, filter?: unknown): Promise<unknown[]>;
  get(resource: string, id: string): Promise<unknown>;
  table(name: string): {
    list(opts?: { where?: Record<string, unknown>; limit?: number; offset?: number }): Promise<Record<string, unknown>[]>;
  };
  search: {
    register(handler: (query: string) => Promise<Array<{ label: string; description?: string; href: string }>>): void;
  };
  commands: {
    register(label: string, handler: () => void): void;
  };
}

export interface FrontendPluginDefinition {
  setup(vencore: VencoreFrontendAPI): void | Promise<void>;
}

/**
 * createFrontendPlugin — entry point for client bundles.
 * The bundle exports this as default. PluginRuntimeContext calls setup(vencore).
 */
export function createFrontendPlugin(config: FrontendPluginDefinition): FrontendPluginDefinition {
  return config;
}
