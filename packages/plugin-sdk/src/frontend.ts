import type { FrontendSurfaceRegistry, VantageFrontendAPI, AnyComponent } from './react';
import type { BridgeFn } from './bridge';
import type { PluginContext } from '@vantage/plugin-types';

export class VantageFrontendImpl implements VantageFrontendAPI {
  private _bridge: BridgeFn;
  private _registry: FrontendSurfaceRegistry;
  private _busHandlers = new Map<string, Set<(p: unknown) => void>>();

  readonly settings: VantageFrontendAPI['settings'];
  readonly user: VantageFrontendAPI['user'];
  readonly workspace: VantageFrontendAPI['workspace'];
  readonly bus: VantageFrontendAPI['bus'];
  readonly modal: VantageFrontendAPI['modal'];
  readonly search: VantageFrontendAPI['search'];
  readonly commands: VantageFrontendAPI['commands'];

  constructor(bridge: BridgeFn, registry: FrontendSurfaceRegistry) {
    this._bridge = bridge;
    this._registry = registry;

    this.settings = {
      get: async <T = unknown>(key: string) => {
        const r = await this._bridge({ method: 'settings.get', payload: { key } });
        if (r.error) return null;
        return r.data as T | null;
      },
    };

    this.user = {
      get: async () => {
        const r = await this._bridge({ method: 'user.get', payload: {} });
        if (r.error) throw r.error;
        return r.data as any;
      },
    };

    this.workspace = {
      get: async () => {
        const r = await this._bridge({ method: 'workspace.get', payload: {} });
        if (r.error) throw r.error;
        return r.data as any;
      },
    };

    this.bus = {
      on: (event: string, handler: (p: unknown) => void) => {
        const set = this._busHandlers.get(event) ?? new Set<(p: unknown) => void>();
        set.add(handler);
        this._busHandlers.set(event, set);
        return () => set.delete(handler);
      },
    };

    this.modal = {
      open: (opts) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vantage:modal:open', { detail: opts }));
        }
      },
      close: () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vantage:modal:close'));
        }
      },
    };

    this.search = {
      register: (handler) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vantage:search:register', { detail: handler }));
        }
      },
    };

    this.commands = {
      register: (label, handler) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vantage:commands:register', { detail: { label, handler } }));
        }
      },
    };
  }

  registerPage(path: string, component: AnyComponent): void {
    this._registry.pages.set(path, component);
  }

  registerWidget(id: string, component: AnyComponent): void {
    this._registry.widgets.set(id, component);
  }

  registerPanel(recordType: string, id: string, component: AnyComponent): void {
    this._registry.panels.set(`${recordType}:${id}`, { recordType, id, label: id, component });
  }

  navigate(path: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vantage:navigate', { detail: { path } }));
    }
  }

  toast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vantage:toast', { detail: { message, type } }));
    }
  }

  async getContext(): Promise<PluginContext> {
    const r = await this._bridge({ method: 'context.get', payload: {} });
    if (r.error) throw r.error;
    return r.data as PluginContext;
  }

  async list(resource: string, filter?: unknown): Promise<unknown[]> {
    const r = await this._bridge({ method: `${resource}.list`, payload: { filter } });
    if (r.error) throw r.error;
    return r.data as unknown[];
  }

  async get(resource: string, id: string): Promise<unknown> {
    const r = await this._bridge({ method: `${resource}.get`, payload: { id } });
    if (r.error) throw r.error;
    return r.data;
  }

  table(name: string) {
    return {
      list: async (opts?: { where?: Record<string, unknown>; limit?: number; offset?: number }) => {
        const r = await this._bridge({ method: 'table.list', payload: { name, ...opts } });
        if (r.error) throw r.error;
        return r.data as Record<string, unknown>[];
      },
    };
  }

  /** Called by PluginRuntimeContext when a bus event arrives. */
  _dispatchBusEvent(event: string, payload: unknown): void {
    const handlers = this._busHandlers.get(event);
    if (!handlers) return;
    handlers.forEach((h) => h(payload));
  }
}
