// ── Domain models (unchanged) ────────────────────────────────────────────────

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  status?: Contact['status'];
  company_id?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'prospect' | 'customer' | 'cold' | 'churned';
  company_id: string | null;
  owner_id: string;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFilter {
  status?: Contact['status'];
  company_id?: string;
  limit?: number;
  offset?: number;
}

export interface DealInput {
  name: string;
  value?: number;
  stage_id?: string;
  pipeline_id?: string;
  probability?: number;
  close_date?: string;
  contact_id?: string;
  company_id?: string;
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage_id: string | null;
  pipeline_id: string | null;
  probability: number;
  close_date: string | null;
  contact_id: string | null;
  company_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DealFilter {
  stage_id?: string;
  pipeline_id?: string;
  contact_id?: string;
  owner_id?: string;
  limit?: number;
  offset?: number;
}

export interface CompanyInput {
  name: string;
  industry?: string;
  location?: string;
  employee_count?: number;
  website?: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
  employee_count: number | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFilter {
  limit?: number;
  offset?: number;
}

export interface TaskInput {
  title: string;
  due_date?: string;
  assignee_id?: string;
  contact_id?: string;
  deal_id?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
  due_date: string | null;
  assignee_id: string;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFilter {
  status?: Task['status'];
  assignee_id?: string;
  contact_id?: string;
  deal_id?: string;
  limit?: number;
}

export interface ActivityInput {
  type: ActivityRecord['type'];
  body?: string;
  meta?: Record<string, unknown>;
  contact_id?: string;
  deal_id?: string;
}

export interface ActivityRecord {
  id: string;
  type: 'email' | 'call' | 'note' | 'meeting' | 'deal_change' | 'infra_alert';
  body: string | null;
  meta: Record<string, unknown> | null;
  user_id: string;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
}

export interface ActivityFilter {
  contact_id?: string;
  deal_id?: string;
  type?: ActivityRecord['type'];
  limit?: number;
}

export interface Server {
  id: string;
  name: string;
  region: string | null;
  ip_address: string | null;
  status: 'online' | 'degraded' | 'offline' | 'stopped';
  cpu_pct: number | null;
  mem_pct: number | null;
  disk_pct: number | null;
  uptime_seconds: number | null;
  last_ping_at: string | null;
}

export interface ServerFilter {
  status?: Server['status'];
  limit?: number;
}

export interface Website {
  id: string;
  url: string;
  label: string | null;
  status: 'online' | 'degraded' | 'offline';
  response_ms: number | null;
  uptime_pct_30d: number | null;
  ssl_expiry_date: string | null;
  last_checked_at: string | null;
}

export interface WebsiteFilter {
  status?: Website['status'];
  limit?: number;
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface PluginContext {
  workspace_id: string;
  user_id: string;
  page: string;
  record_id: string | null;
  record_type: string | null;
}

// ── Error + Result ───────────────────────────────────────────────────────────

export interface PluginError {
  code: string;
  message: string;
}

export type PluginResult<T> =
  | { data: T; error: null }
  | { data: null; error: PluginError };

// ── HTTP bridge types ────────────────────────────────────────────────────────

export interface HttpFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  ok: boolean;
}

export interface PluginHttpRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  params: Record<string, string>;
}

export interface PluginHttpResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
}

// ── Plugin table schema ──────────────────────────────────────────────────────

export type PluginColumnType =
  | 'uuid' | 'text' | 'integer' | 'bigint' | 'boolean'
  | 'decimal' | 'timestamptz' | 'jsonb';

export interface PluginColumnDef {
  name: string;
  type: PluginColumnType;
  nullable?: boolean;
  primary?: boolean;
  unique?: boolean;
  default?: string;
}

export interface PluginIndexDef {
  columns: string[];
  unique?: boolean;
}

export interface PluginTableDef {
  name: string;
  columns: PluginColumnDef[];
  indexes?: PluginIndexDef[];
  drop_on_uninstall?: boolean;
}

export interface PluginMigration {
  version: string;
  up: string;
  down?: string;
}

// ── Bridge types ─────────────────────────────────────────────────────────────

export interface BridgeCall {
  method: string;
  payload: unknown;
}

export interface BridgeResult {
  data: unknown;
  error: PluginError | null;
}

// ── PluginTableClient ────────────────────────────────────────────────────────

export interface PluginTableClient {
  list(opts?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<Record<string, unknown>[]>;
  get(id: string): Promise<Record<string, unknown>>;
  insert(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(id: string): Promise<void>;
  upsert(data: Record<string, unknown>, opts: { on_conflict: string }): Promise<Record<string, unknown>>;
  count(where?: Record<string, unknown>): Promise<number>;
}

// ── Bridge data-access permissions (unchanged union) ─────────────────────────

export type PluginPermission =
  | 'contacts:read' | 'contacts:write'
  | 'companies:read' | 'companies:write'
  | 'deals:read' | 'deals:write'
  | 'tasks:read' | 'tasks:write'
  | 'activity:read' | 'activity:write'
  | 'servers:read'
  | 'websites:read'
  | 'storage:read' | 'storage:write'
  | 'http:fetch';

// ── Hook events ──────────────────────────────────────────────────────────────

export type PluginHookEvent =
  | 'contact.created' | 'contact.updated' | 'contact.deleted'
  | 'deal.created' | 'deal.updated' | 'deal.deleted'
  | 'task.created' | 'task.updated'
  | (string & {});

// ── Hook provider system ──────────────────────────────────────────────────────

/**
 * Declares that this plugin can act as a CRM provider for one or more
 * hook features in a Vencore module.
 *
 * Example: a Salesforce plugin declares it can provide `customer_sync`
 * and `revenue_attribution` for the `projects` module.
 */
export interface HookProviderDef {
  /** Module the hook belongs to, e.g. "projects", "tasks". */
  module_id: string;
  /** Feature within that module, e.g. "customer_sync", "auto_project_from_deal". */
  feature_id: string;
}

/** Runtime state of a hook feature as seen by the current plugin. */
export interface HookFeatureState {
  /** Whether this plugin is the currently selected provider for this feature. */
  active: boolean;
  /** Whether the feature is enabled at all (may be enabled with a different provider). */
  enabled: boolean;
  /** The provider string ID that is currently selected, if any. */
  selected_provider_id: string | null;
}

/** Hooks namespace on `VencoreBackendAPI`. */
export interface VencoreHooksNamespace {
  /**
   * Check whether THIS plugin is the active provider for a hook feature.
   * Returns the resolved hook state. Returns null if the feature is not
   * configured or if a different plugin is the active provider.
   */
  resolve(moduleId: string, featureId: string): Promise<HookFeatureState | null>;

  /**
   * List all hook features this plugin provides, with their current state.
   * Useful for a plugin's own settings page.
   */
  listProvided(): Promise<Array<HookProviderDef & { state: HookFeatureState }>>;
}

// ── Plugin user-facing permission definition (NEW) ───────────────────────────

export interface PluginPermissionDef {
  key: string;
  label: string;
  defaultRoles: ('admin' | 'member')[];
}

// ── Plugin surfaces (NEW) ────────────────────────────────────────────────────

export interface PluginNavItem {
  label: string;
  path: string;
  icon?: string;
  group?: 'crm' | 'infra' | 'general';
}

export interface PluginPageDef {
  path: string;
  title: string;
}

export interface PluginWidgetDef {
  id: string;
  label: string;
}

export interface PluginPanelDef {
  record_type: string;
  id: string;
  label: string;
}

export interface PluginSurfaces {
  nav?: PluginNavItem[];
  pages?: PluginPageDef[];
  widgets?: PluginWidgetDef[];
  panels?: PluginPanelDef[];
}

// ── Plugin settings schema (NEW) ─────────────────────────────────────────────

interface PluginSettingsFieldBase {
  key: string;
  label: string;
  secret?: boolean;
}

export interface PluginSettingsTextField extends PluginSettingsFieldBase {
  type: 'text';
  default?: string;
}

export interface PluginSettingsBooleanField extends PluginSettingsFieldBase {
  type: 'boolean';
  default?: boolean;
}

export interface PluginSettingsNumberField extends PluginSettingsFieldBase {
  type: 'number';
  default?: number;
  min?: number;
  max?: number;
}

export interface PluginSettingsSelectField extends PluginSettingsFieldBase {
  type: 'select';
  options: string[];
  default?: string;
}

export type PluginSettingsField =
  | PluginSettingsTextField
  | PluginSettingsBooleanField
  | PluginSettingsNumberField
  | PluginSettingsSelectField;

export interface PluginBuildConfig {
  server?: string;
  client?: string;
}

// ── SDK namespace types (NEW) ────────────────────────────────────────────────

export interface VencoreUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface VencoreWorkspace {
  id: string;
  name: string;
  plan: string;
}

export interface VencoreFileRecord {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
}

export interface VencoreNotifyOptions {
  title: string;
  body?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface VencoreSettingsNamespace {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

export interface VencoreBusNamespace {
  emit(event: string, payload: unknown): Promise<void>;
  on(event: string, handler: (payload: unknown) => Promise<void> | void): void;
}

export interface VencoreFilesNamespace {
  upload(buffer: Uint8Array, opts: { name: string; mime: string }): Promise<VencoreFileRecord>;
  getUrl(fileId: string): Promise<string>;
  delete(fileId: string): Promise<void>;
}

export interface VencoreCronNamespace {
  register(schedule: string, name: string, handler: () => Promise<void> | void): void;
}

export interface VencorePermissionsNamespace {
  check(userId: string, permissionKey: string): Promise<boolean>;
}

// ── PluginManifest — updated (non-generic) ───────────────────────────────────

export interface PluginEndpointDef {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'ALL';
  auth?: boolean;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  author?: string;
  homepage?: string;
  /** User-facing permissions shown in Users & Groups settings. */
  permissions?: PluginPermissionDef[];
  /** Bridge data-access permissions — controls CRM/infra data the plugin can read/write. */
  data_access?: PluginPermission[];
  endpoints?: PluginEndpointDef[];
  tables?: PluginTableDef[];
  migrations?: PluginMigration[];
  hooks?: PluginHookEvent[];
  /**
   * Hook features this plugin can provide.
   * Each entry registers this plugin as a compatible provider for a module feature.
   * The workspace admin enables a hook and selects which installed provider to use.
   *
   * Example: a Salesforce CRM plugin that provides customer_sync and revenue_attribution
   * for the projects module declares:
   *   hook_providers: [
   *     { module_id: "projects", feature_id: "customer_sync" },
   *     { module_id: "projects", feature_id: "revenue_attribution" }
   *   ]
   */
  hook_providers?: HookProviderDef[];
  /** Events this plugin emits on the bus. Declarative — for discovery. */
  emits?: string[];
  /** Cross-plugin bus topics this plugin subscribes to. Format: "<pluginId>:<topic>". */
  listens?: string[];
  surfaces?: PluginSurfaces;
  settings_schema?: PluginSettingsField[];
  build?: PluginBuildConfig;
}

// ── VencoreBackendAPI — full backend SDK surface ─────────────────────────────

export interface VencoreBackendAPI {
  list(resource: string, filter?: unknown): Promise<unknown[]>;
  get(resource: string, id: string): Promise<unknown>;
  create(resource: string, data: unknown): Promise<unknown>;
  update(resource: string, id: string, data: unknown): Promise<unknown>;
  delete(resource: string, id: string): Promise<void>;
  action<T = unknown>(resource: string, action: string, payload?: unknown): Promise<T>;
  table(name: string): PluginTableClient;
  on(event: PluginHookEvent, handler: (payload: unknown) => Promise<void> | void): void;
  storage: {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  http: {
    fetch(url: string, options?: HttpFetchOptions): Promise<HttpResponse>;
    onEndpoint(
      path: string,
      handler: (req: PluginHttpRequest) => Promise<PluginHttpResponse> | PluginHttpResponse
    ): void;
  };
  settings: VencoreSettingsNamespace;
  bus: VencoreBusNamespace;
  user: { get(): Promise<VencoreUser> };
  workspace: { get(): Promise<VencoreWorkspace> };
  files: VencoreFilesNamespace;
  notify(opts: VencoreNotifyOptions): Promise<void>;
  cron: VencoreCronNamespace;
  permissions: VencorePermissionsNamespace;
  /** Hook provider system — check and list the features this plugin provides. */
  hooks: VencoreHooksNamespace;
  safe: {
    list(resource: string, filter?: unknown): Promise<PluginResult<unknown[]>>;
    get(resource: string, id: string): Promise<PluginResult<unknown>>;
    create(resource: string, data: unknown): Promise<PluginResult<unknown>>;
    update(resource: string, id: string, data: unknown): Promise<PluginResult<unknown>>;
    delete(resource: string, id: string): Promise<PluginResult<void>>;
    action<T = unknown>(resource: string, action: string, payload?: unknown): Promise<PluginResult<T>>;
  };
}

// ── PluginDefinition — no longer carries Perms generic ───────────────────────

export interface PluginDefinition {
  setup(vencore: VencoreBackendAPI): void | Promise<void>;
}

// ── Resource type map (kept for reference) ───────────────────────────────────

export type ResourceTypeMap = {
  contacts: { row: Contact; input: ContactInput; filter: ContactFilter };
  companies: { row: Company; input: CompanyInput; filter: CompanyFilter };
  deals: { row: Deal; input: DealInput; filter: DealFilter };
  tasks: { row: Task; input: TaskInput; filter: TaskFilter };
  activity: { row: ActivityRecord; input: ActivityInput; filter: ActivityFilter };
  servers: { row: Server; input: never; filter: ServerFilter };
  websites: { row: Website; input: never; filter: WebsiteFilter };
};

export type KnownResource = keyof ResourceTypeMap;
