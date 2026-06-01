import type {
  PluginPermission,
  PluginResult,
  ResourceRow,
  ResourceInput,
  ResourceFilter,
  KnownResource,
  PluginTableClient,
  PluginHookEvent,
  PluginContext,
  HttpFetchOptions,
  HttpResponse,
  PluginManifest,
} from '@vantage/plugin-types';

// ── Compile-time permission helpers ─────────────────────────────────────────

type ExtractReadResource<P extends string> = P extends `${infer R}:read` ? R : never;
type ExtractWriteResource<P extends string> = P extends `${infer R}:write` ? R : never;

export type PermittedResource<Perms extends readonly PluginPermission[]> =
  ExtractReadResource<Perms[number]> & KnownResource;

export type PermittedWriteResource<Perms extends readonly PluginPermission[]> =
  ExtractWriteResource<Perms[number]> & KnownResource;

type HasPerm<Perms extends readonly PluginPermission[], P extends PluginPermission> =
  P extends Perms[number] ? true : false;

// ── Namespaces ───────────────────────────────────────────────────────────────

export interface StorageNamespace {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface HttpNamespace {
  fetch(url: string, options?: HttpFetchOptions): Promise<HttpResponse>;
}

export interface ModalNamespace {
  open(opts: { title: string; content?: string }): Promise<void>;
  close(): Promise<void>;
}

// ── Safe wrapper type ────────────────────────────────────────────────────────

export type SafePermittedVantage<Perms extends readonly PluginPermission[]> = {
  list<R extends PermittedResource<Perms>>(
    resource: R,
    filter?: ResourceFilter<R>,
  ): Promise<PluginResult<ResourceRow<R>[]>>;
  get<R extends PermittedResource<Perms>>(
    resource: R,
    id: string,
  ): Promise<PluginResult<ResourceRow<R>>>;
  create<R extends PermittedWriteResource<Perms>>(
    resource: R,
    data: ResourceInput<R>,
  ): Promise<PluginResult<ResourceRow<R>>>;
  update<R extends PermittedWriteResource<Perms>>(
    resource: R,
    id: string,
    data: Partial<ResourceInput<R>>,
  ): Promise<PluginResult<ResourceRow<R>>>;
  delete(
    resource: PermittedWriteResource<Perms>,
    id: string,
  ): Promise<PluginResult<void>>;
  action<T = unknown>(
    resource: string,
    action: string,
    payload?: unknown,
  ): Promise<PluginResult<T>>;
};

// ── PermittedVantage — backend ───────────────────────────────────────────────

export type PermittedVantage<Perms extends readonly PluginPermission[]> = {
  list<R extends PermittedResource<Perms>>(
    resource: R,
    filter?: ResourceFilter<R>,
  ): Promise<ResourceRow<R>[]>;
  get<R extends PermittedResource<Perms>>(
    resource: R,
    id: string,
  ): Promise<ResourceRow<R>>;
  create<R extends PermittedWriteResource<Perms>>(
    resource: R,
    data: ResourceInput<R>,
  ): Promise<ResourceRow<R>>;
  update<R extends PermittedWriteResource<Perms>>(
    resource: R,
    id: string,
    data: Partial<ResourceInput<R>>,
  ): Promise<ResourceRow<R>>;
  delete(resource: PermittedWriteResource<Perms>, id: string): Promise<void>;
  action<T = unknown>(resource: string, action: string, payload?: unknown): Promise<T>;
  table(name: string): PluginTableClient;
  on(event: PluginHookEvent, handler: (payload: unknown) => Promise<void> | void): void;
  storage: HasPerm<Perms, 'storage:read'> extends true ? StorageNamespace : never;
  http: HasPerm<Perms, 'http:fetch'> extends true ? HttpNamespace : never;
  safe: SafePermittedVantage<Perms>;
};

// ── PermittedVantageFrontend — adds frontend-only methods ────────────────────

export type PermittedVantageFrontend<Perms extends readonly PluginPermission[]> =
  Omit<PermittedVantage<Perms>, 'on'> & {
    getContext(): Promise<PluginContext>;
    navigate(path: string): void;
    modal: ModalNamespace;
    on(event: string, handler: (payload: unknown) => void): void;
  };

// ── Plugin definition types ──────────────────────────────────────────────────

export interface PluginDefinition<Perms extends readonly PluginPermission[]> {
  manifest: PluginManifest<Perms>;
  setup(vantage: PermittedVantage<Perms>): void | Promise<void>;
}

export interface FrontendPluginDefinition<Perms extends readonly PluginPermission[]> {
  manifest: PluginManifest<Perms>;
  setup(vantage: PermittedVantageFrontend<Perms>): void | Promise<void>;
}
