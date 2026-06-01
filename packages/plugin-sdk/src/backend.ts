import type {
  PluginPermission,
  PluginManifest,
  PluginResult,
  PluginTableClient,
  HttpFetchOptions,
  HttpResponse,
} from '@vantage/plugin-types';
import type { BridgeFn, BridgeResult } from './bridge';
import type {
  PermittedVantage,
  SafePermittedVantage,
  StorageNamespace,
  StorageReadNamespace,
  HttpNamespace,
  PluginDefinition,
} from './permissions';

export class VantageBackendImpl {
  protected _bridge: BridgeFn;
  private _handlers = new Map<string, Array<(p: unknown) => Promise<void> | void>>();
  readonly storage: StorageNamespace;
  readonly http: HttpNamespace;
  readonly safe: SafePermittedVantage<readonly PluginPermission[]>;

  constructor(bridge: BridgeFn) {
    this._bridge = bridge;

    this.storage = {
      get: <T = unknown>(key: string) =>
        this._call<T | null>('storage.get', { key }),
      set: (key: string, value: unknown) =>
        this._call<void>('storage.set', { key, value }),
      delete: (key: string) =>
        this._call<void>('storage.delete', { key }),
    };

    this.http = {
      fetch: (url: string, options?: HttpFetchOptions) =>
        this._call<HttpResponse>('http.fetch', { url, options }),
    };

    const wrap = <T>(fn: () => Promise<T>): Promise<PluginResult<T>> =>
      fn()
        .then((data) => ({ data, error: null } as PluginResult<T>))
        .catch((error) => ({ data: null, error } as PluginResult<T>));

    this.safe = {
      list: (resource, filter?) => wrap(() => this.list(resource as string, filter) as Promise<any>),
      get: (resource, id) => wrap(() => this.get(resource as string, id) as Promise<any>),
      create: (resource, data) => wrap(() => this.create(resource as string, data) as Promise<any>),
      update: (resource, id, data) => wrap(() => this.update(resource as string, id, data) as Promise<any>),
      delete: (resource, id) => wrap(() => this.delete(resource as string, id)),
      action: (resource, action, payload?) => wrap(() => this.action(resource, action, payload)),
    };
  }

  protected async _call<T>(method: string, payload: unknown): Promise<T> {
    const result: BridgeResult = await this._bridge({ method, payload });
    if (result.error !== null) throw result.error;
    return result.data as T;
  }

  async list(resource: string, filter?: unknown): Promise<unknown[]> {
    return this._call(`${resource}.list`, { filter });
  }

  async get(resource: string, id: string): Promise<unknown> {
    return this._call(`${resource}.get`, { id });
  }

  async create(resource: string, data: unknown): Promise<unknown> {
    return this._call(`${resource}.create`, { data });
  }

  async update(resource: string, id: string, data: unknown): Promise<unknown> {
    return this._call(`${resource}.update`, { id, data });
  }

  async delete(resource: string, id: string): Promise<void> {
    return this._call<void>(`${resource}.delete`, { id });
  }

  async action<T = unknown>(resource: string, action: string, payload?: unknown): Promise<T> {
    return this._call<T>(`${resource}.${action}`, { payload });
  }

  table(name: string): PluginTableClient {
    return {
      list: (opts?) => this._call<Record<string, unknown>[]>('table.list', { name, ...opts }),
      get: (id) => this._call<Record<string, unknown>>('table.get', { name, id }),
      insert: (data) => this._call<Record<string, unknown>>('table.insert', { name, data }),
      update: (id, data) => this._call<Record<string, unknown>>('table.update', { name, id, data }),
      delete: (id) => this._call<void>('table.delete', { name, id }),
      upsert: (data, opts) => this._call<Record<string, unknown>>('table.upsert', { name, data, ...opts }),
      count: (where?) => this._call<number>('table.count', { name, where }),
    };
  }

  on(event: string, handler: (payload: unknown) => Promise<void> | void): void {
    const existing = this._handlers.get(event) ?? [];
    this._handlers.set(event, [...existing, handler]);
  }

  /** Called by the runtime when an event fires. Invokes all registered handlers in parallel. */
  async _dispatchEvent(event: string, payload: unknown): Promise<void> {
    const handlers = this._handlers.get(event) ?? [];
    await Promise.allSettled(handlers.map((h) => h(payload)));
  }


}

/**
 * createVantageBackend — factory for the runtime to instantiate a vantage object.
 * The runtime provides a BridgeFn scoped to the current plugin + workspace.
 */
export function createVantageBackend(bridge: BridgeFn): VantageBackendImpl {
  return new VantageBackendImpl(bridge);
}

/**
 * createPlugin (backend) — validates manifest types at compile time.
 * Returns a PluginDefinition the runtime imports and calls setup() on.
 * No side effects on call.
 */
export function createPlugin<Perms extends readonly PluginPermission[]>(config: {
  manifest: PluginManifest<Perms>;
  setup(vantage: PermittedVantage<Perms>): void | Promise<void>;
}): PluginDefinition<Perms> {
  return config;
}
