# vencore

The all-in-one toolkit for building [Vencore](https://github.com/kavin-charles/vencore-plugin-sdk) plugins — CLI, backend/frontend SDK, and type definitions in a single package.

## Install

```bash
# CLI (global) — scaffold, build, validate plugins
npm install -g vencore

# Inside a plugin project — SDK + types
npm install vencore
```

## CLI

```bash
vencore create my-plugin   # scaffold a new plugin from the template
vencore dev                # watch mode (tsup, no zip)
vencore build              # compile → <id>-<version>.zip
vencore validate           # lint plugin.json
```

## Subpath exports

| Import | Use |
|---|---|
| `vencore/backend` | Backend plugin API — `createPlugin`, `VencoreBackendImpl` |
| `vencore/react` | Frontend client plugins — `createFrontendPlugin` |
| `vencore/build` | tsup helpers — `defineClientBuild`, `reactWindowPlugin` |
| `vencore/bridge` | postMessage bridge — `createPostMessageBridge` |
| `vencore/types` | All Vencore domain + API type definitions |
| `vencore` | Barrel re-export of the above |

## Backend plugin

```ts
import { createPlugin } from 'vencore/backend';

export default createPlugin({
  setup(vencore) {
    vencore.cron.register('0 * * * *', 'hourly-log', async () => {
      const contacts = await vencore.list('contacts');
      console.log(`contacts: ${contacts.length}`);
    });

    vencore.on('contact.created', async (payload) => {
      console.log('contact.created:', payload);
    });
  },
});
```

## Frontend plugin

```tsx
import { createFrontendPlugin } from 'vencore/react';
import App from './App';

export default createFrontendPlugin({
  setup(vencore) {
    vencore.registerPage('/example', App);
  },
});
```

## Build config

```ts
import { defineClientBuild } from 'vencore/build';
import { defineConfig } from 'tsup';

export default [
  defineConfig({ entry: ['src/index.ts'], format: ['cjs'], platform: 'node' }),
  defineClientBuild({ entry: 'src/client/index.tsx' }),
];
```

## License

MIT
