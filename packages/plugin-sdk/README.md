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
| `@vencore/plugin-sdk` | Backend plugin API (`createPlugin`, `VencoreBackendImpl`) |
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

    // Bus events
    vencore.bus.on('contact.created', async (payload) => {
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
  "permissions": ["storage", "http"],
  "data_access": [],
  "tables": [
    { "name": "mail_accounts", "columns": [] }
  ]
}
```

---

## License

MIT — see [LICENSE](LICENSE).
