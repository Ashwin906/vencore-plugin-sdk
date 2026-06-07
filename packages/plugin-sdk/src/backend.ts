import type {
  PluginResult,
  PluginTableClient,
  HttpFetchOptions,
  HttpResponse,
  VencoreBackendAPI,
  VencoreSettingsNamespace,
  VencoreBusNamespace,
  VencoreFilesNamespace,
  VencoreCronNamespace,
  VencorePermissionsNamespace,
  VencoreUser,
  VencoreWorkspace,
  VencoreFileRecord,
  VencoreNotifyOptions,
  PluginDefinition,
  PluginHookEvent,
  PluginHttpRequest,
  PluginHttpResponse,
} from '@vencore/plugin-types';
import type { BridgeFn, BridgeResult } from './bridge';

type CronEntry = { schedule: string; name: string; handler: () => Promise<void> | void };

interface HttpHandlerEntry {
  path: string;
  handler: (req: PluginHttpRequest) => Promise<PluginHttpResponse> | PluginHttpResponse;
}

// Minimal path matcher for route patterns like /users/:id or /webhooks/*
function matchPath(routePattern: string, path: string): Record<string, string> | null {
  const paramNames: string[] = [];
  
  // Replace parameters like :id with regex capture groups
  let regexStr = routePattern.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  
  // Replace * with catch-all capture group
  regexStr = regexStr.replace(/\*/g, '(.*)');
  
  const regex = new RegExp(`^${regexStr}/?$`); // allow optional trailing slash
  const match = path.match(regex);
  
  if (!match) return null;
  
  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1] ?? '';
  });
  
  return params;
}

export class VencoreBackendImpl implements VencoreBackendAPI {
  private _bridge: BridgeFn;
  private _hookHandlers = new Map<string, Array<(p: unknown) => Promise<void> | void>>();
  private _cronJobs: CronEntry[] = [];
  private _httpHandlers: HttpHandlerEntry[] = [];

  readonly storage: VencoreBackendAPI['storage'];
  readonly http: VencoreBackendAPI['http'];
  readonly settings: VencoreSettingsNamespace;
  readonly bus: VencoreBusNamespace;
  readonly files: VencoreFilesNamespace;
  readonly cron: VencoreCronNamespace;
  readonly permissions: VencorePermissionsNamespace;
  readonly user: { get(): Promise<VencoreUser> };
  readonly workspace: { get(): Promise<VencoreWorkspace> };
  readonly safe: VencoreBackendAPI['safe'];

  constructor(bridge: BridgeFn) {
    this._bridge = bridge;

    this.storage = {
      get: <T = unknown>(key: string) => this._call<T | null>('storage.get', { key }),
      set: (key: string, value: unknown) => this._call<void>('storage.set', { key, value }),
      delete: (key: string) => this._call<void>('storage.delete', { key }),
    };

    this.http = {
      fetch: (url: string, options?: HttpFetchOptions) =>
        this._call<HttpResponse>('http.fetch', { url, ...options }),
      onEndpoint: (path: string, handler: (req: PluginHttpRequest) => Promise<PluginHttpResponse> | PluginHttpResponse) => {
        this._httpHandlers.push({ path, handler });
      },
    };

    this.settings = {
      get: <T = unknown>(key: string) => this._call<T | null>('settings.get', { key }),
      set: (key: string, value: unknown) => this._call<void>('settings.set', { key, value }),
    };

    this.bus = {
      emit: (event: string, payload: unknown) =>
        this._call<void>('bus.emit', { event, payload }),
      on: (event: string, handler: (payload: unknown) => Promise<void> | void) => {
        const existing = this._hookHandlers.get(`bus:${event}`) ?? [];
        this._hookHandlers.set(`bus:${event}`, [...existing, handler]);
      },
    };

    this.files = {
      upload: (buffer: Uint8Array, opts: { name: string; mime: string }) =>
        this._call<VencoreFileRecord>('files.upload', {
          buffer: Buffer.from(buffer).toString('base64'),
          ...opts,
        }),
      getUrl: (fileId: string) => this._call<string>('files.getUrl', { fileId }),
      delete: (fileId: string) => this._call<void>('files.delete', { fileId }),
    };

    this.cron = {
      register: (schedule: string, name: string, handler: () => Promise<void> | void) => {
        this._cronJobs.push({ schedule, name, handler });
      },
    };

    this.permissions = {
      check: (userId: string, permissionKey: string) =>
        this._call<boolean>('permissions.check', { userId, permissionKey }),
    };

    this.user = {
      get: () => this._call<VencoreUser>('user.get', {}),
    };

    this.workspace = {
      get: () => this._call<VencoreWorkspace>('workspace.get', {}),
    };

    const wrap = <T>(fn: () => Promise<T>): Promise<PluginResult<T>> =>
      fn()
        .then((data) => ({ data, error: null } as PluginResult<T>))
        .catch((error) => ({ data: null, error } as PluginResult<T>));

    this.safe = {
      list: (resource, filter?) => wrap(() => this.list(resource, filter)),
      get: (resource, id) => wrap(() => this.get(resource, id)),
      create: (resource, data) => wrap(() => this.create(resource, data)),
      update: (resource, id, data) => wrap(() => this.update(resource, id, data)),
      delete: (resource, id) => wrap(() => this.delete(resource, id)),
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

  on(event: PluginHookEvent, handler: (payload: unknown) => Promise<void> | void): void {
    const existing = this._hookHandlers.get(event as string) ?? [];
    this._hookHandlers.set(event as string, [...existing, handler]);
  }

  notify(opts: VencoreNotifyOptions): Promise<void> {
    return this._call<void>('notify', opts);
  }

  /** Called by runtime when a system event fires. */
  async _dispatchHook(event: string, payload: unknown): Promise<void> {
    const handlers = this._hookHandlers.get(event) ?? [];
    await Promise.allSettled(handlers.map((h) => h(payload)));
  }

  /** Called by runtime when a bus event fires. */
  async _dispatchBusEvent(event: string, payload: unknown): Promise<void> {
    const handlers = this._hookHandlers.get(`bus:${event}`) ?? [];
    await Promise.allSettled(handlers.map((h) => h(payload)));
  }

  /** Called by runtime to retrieve registered cron jobs. */
  getCronJobs(): CronEntry[] {
    return this._cronJobs;
  }

  /** Called by runtime (bridge) to dispatch an HTTP request to a registered endpoint handler. */
  async _dispatchHttpEndpoint(req: PluginHttpRequest): Promise<PluginHttpResponse> {
    // Find the first handler that matches the requested path
    for (const entry of this._httpHandlers) {
      const params = matchPath(entry.path, req.path);
      if (params !== null) {
        // Path matches, attach parsed params to request
        const reqWithParams = { ...req, params };
        try {
          const response = await entry.handler(reqWithParams);
          return response;
        } catch (error) {
          console.error(`[Plugin SDK] Error handling HTTP endpoint ${req.path}:`, error);
          return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error' })
          };
        }
      }
    }
    
    // No matching handler found
    return {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Endpoint Not Found' })
    };
  }
}

export function createVencoreBackend(bridge: BridgeFn): VencoreBackendImpl {
  return new VencoreBackendImpl(bridge);
}

/**
 * createPlugin — entry point for plugin backend bundles.
 * No manifest parameter; plugin.json is the source of truth.
 */
export function createPlugin(config: {
  setup(vencore: VencoreBackendAPI): void | Promise<void>;
}): PluginDefinition {
  return config;
}
