# @vencore/plugin-cli

CLI for building and scaffolding Vencore plugins.

## Installation

```bash
npm install -g @vencore/plugin-cli
```

## Commands

### `vencore create <name>`

Scaffold a new plugin from the example template.

```bash
vencore create my-plugin
cd my-plugin
vencore dev
```

Creates `<name>/` with:
- `plugin.json` — manifest (id, name, version, surfaces, hooks)
- `src/index.ts` — backend entry (`createPlugin`)
- `src/client/index.tsx` — frontend entry (`createFrontendPlugin`)
- `src/client/App.tsx` — minimal React component
- `tsup.config.ts` — dual build config (CJS server + ESM client)
- `package.json`, `tsconfig.json`

---

### `vencore build`

Compile the plugin and output `<id>-<version>.zip`.

```bash
vencore build
# → my-plugin-0.0.1.zip
```

Zip contents:

| Path | Description |
|---|---|
| `dist/index.js` | Backend bundle (CJS) |
| `dist/client.mjs` | Frontend bundle (ESM) |
| `plugin.json` | Manifest |
| `package.json` | Package metadata |
| `assets/` | Static assets (if exists) |

Reads `id` and `version` from `plugin.json` to name the zip.

---

### `vencore dev`

Watch mode — rebuilds on file change. No zip output.

```bash
vencore dev
```

---

### `vencore validate`

Lint `plugin.json` against the manifest schema.

```bash
vencore validate
# ✓ plugin.json is valid
# ✗ emits[no-colon]: must match "<pluginId>:<topic>"
```

Checks:
- `id`, `name`, `version` required
- `emits` / `listens` topics match `<pluginId>:<topic>` format
- `data_access` only contains known permissions
- `surfaces.nav[].group` is `crm`, `infra`, or `general`

Exits 1 on failure.

---

## License

MIT
