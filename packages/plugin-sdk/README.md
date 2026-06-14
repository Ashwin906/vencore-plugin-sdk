# @vencore/plugin-sdk

Official SDK for building Vencore plugins.

## Installation

```bash
npm install @vencore/plugin-sdk @vencore/plugin-types
```

---

## Exports

| Entry | Purpose |
|---|---|
| `@vencore/plugin-sdk` | Backend plugin API (`createPlugin`, `VencoreBackendImpl`, `PluginBus`) |
| `@vencore/plugin-sdk/react` | React hooks for frontend panels |
| `@vencore/plugin-sdk/build` | tsup build helpers — `defineClientBuild`, `reactWindowPlugin` |

---

## Backend

Plugins export a `setup` function via `createPlugin`. The host calls it on load and passes a `VencoreBackendAPI` instance.

```typescript
// src/index.ts
import { createPlugin } from '@vencore/plugin-sdk';

export default createPlugin({
  setup(vencore) {
    // Register HTTP endpoint — reachable at /api/plugins/route/<pluginId>/<path>
    vencore.http.onEndpoint('/accounts', async (req) => {
      const accounts = await vencore.table('mail_accounts').list();
      return { status: 200, body: { data: accounts } };
    });

    // Storage
    vencore.storage.set('key', 'value');

    // Cron
    vencore.cron.register('0 * * * *', 'hourly-sync', async () => {
      // ...
    });

    // Subscribe to system hook
    vencore.bus.on('contact.created', async (payload) => {
      // ...
    });

    // Emit a cross-plugin event (must be declared in plugin.json emits)
    vencore.bus.emit('my-plugin:data.synced', { count: 42 });

    // Subscribe to another plugin's event (must be declared in plugin.json listens)
    vencore.bus.on('calendar:event.created', async (payload) => {
      // ...
    });
  },
});
```

### `vencore.http.onEndpoint(path, handler)`

Registers an HTTP handler for the plugin. The host mounts a router at `/api/plugins/route/:pluginId` — all registered paths are relative to that mount.

- `path` — Express-style path pattern (`:param`, `*` wildcards)
- `handler(req: PluginHttpRequest): PluginHttpResponse | Promise<PluginHttpResponse>`

```typescript
vencore.http.onEndpoint('/users/:id', async (req) => {
  const { id } = req.params;
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { data: { id } },
  };
});
```

---

## Cross-Plugin Events

Plugins communicate via a typed topic registry. Topics are namespaced `<pluginId>:<topic>` and declared in `plugin.json`.

**Declare in `plugin.json`:**

```json
{
  "emits": ["my-plugin:data.synced"],
  "listens": ["calendar:event.created"]
}
```

**Emit / subscribe in plugin code:**

```typescript
// Emit (topic must be in emits[])
vencore.bus.emit('my-plugin:data.synced', { count: 42 })

// Subscribe (topic must be in listens[])
vencore.bus.on('calendar:event.created', async (payload) => {
  console.log('calendar event:', payload)
})
```

The host uses `PluginBus` (exported from `@vencore/plugin-sdk`) to route events:

```typescript
import { PluginBus } from '@vencore/plugin-sdk'

const bus = new PluginBus()

// On plugin load:
bus.registerPlugin('my-plugin', manifest.emits ?? [], manifest.listens ?? [])

// On plugin unload:
bus.unregisterPlugin('my-plugin')

// Route emits from bridge handler:
bus.emit(pluginId, topic, payload)

// Route to subscribers:
bus.on(pluginId, topic, (payload) => pluginInstance._dispatchBusEvent(topic, payload))
```

Payload must be JSON-serializable. Subscriber errors are isolated — a crashing subscriber does not affect the emitter or other subscribers.

---

## Frontend (React)

Plugin frontends are loaded by the host as ES modules in the same JS context. The host exposes `window.React` and `window.ReactDOM` before loading — plugins must **not** bundle their own React copy.

### Build config

Use `defineClientBuild` from `@vencore/plugin-sdk/build` in `tsup.config.ts`:

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';
import { defineClientBuild } from '@vencore/plugin-sdk/build';

export default defineConfig([
  // Backend bundle (CJS, self-contained)
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs'],
    noExternal: [/(.*)/],
    outDir: 'dist',
    bundle: true,
    clean: true,
  },
  // Frontend bundle (ESM, React from host globals)
  defineClientBuild() as any,
]);
```

`defineClientBuild` options:

| Option | Default | Description |
|---|---|---|
| `entry` | `'src/client.tsx'` | Frontend entry file |
| `outDir` | `'dist'` | Output directory |

### Writing a frontend panel

```tsx
// src/client.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

function MailPanel() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Clicks: {count}</button>;
}

export function mount(container: HTMLElement) {
  ReactDOM.render(<MailPanel />, container);
}

export function unmount(container: HTMLElement) {
  ReactDOM.unmountComponentAtNode(container);
}
```

The host calls `mount(container)` / `unmount(container)` from the plugin's client bundle.

### How React sharing works

`reactWindowPlugin()` is an esbuild plugin injected by `defineClientBuild`. It intercepts all `react` and `react-dom` imports and redirects them to `globalThis.React` / `globalThis.ReactDOM`. This eliminates the duplicate-React problem ("Invalid hook call") without requiring the host to provide React as a separate file.

Classic JSX transform (`React.createElement`) is used — not the automatic transform — so no `react/jsx-runtime` import is generated at build time.

---

## tsconfig for plugins

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "CommonJS",
    "jsx": "react"
  }
}
```

`"jsx": "react"` (classic transform) is required. `"lib": ["ES2022", "DOM"]` provides browser globals for the frontend entry.

---

## Plugin manifest

`plugin.json` in the plugin root — metadata, permissions, and table schemas. Example:

```json
{
  "id": "com.vencore.mail",
  "name": "Mail",
  "version": "0.1.0",
  "description": "Email accounts and inbox",
  "data_access": ["contacts:read"],
  "emits": ["com.vencore.mail:message.received"],
  "listens": ["calendar:event.created"],
  "tables": [
    { "name": "mail_accounts", "columns": [] }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique plugin identifier |
| `name` | `string` | Display name |
| `version` | `string` | Semver |
| `emits` | `string[]` | Cross-plugin topics this plugin publishes. Format: `<pluginId>:<topic>` |
| `listens` | `string[]` | Cross-plugin topics this plugin subscribes to. Format: `<pluginId>:<topic>` |
| `data_access` | `PluginPermission[]` | CRM/infra data the plugin can read/write |
| `tables` | `PluginTableDef[]` | Plugin-owned DB tables |
| `hooks` | `PluginHookEvent[]` | System hook events to listen for |
| `surfaces` | `PluginSurfaces` | Nav items, pages, panels |
| `settings_schema` | `PluginSettingsField[]` | Configuration fields shown in admin UI |

---

## License

MIT — see [LICENSE](LICENSE).
