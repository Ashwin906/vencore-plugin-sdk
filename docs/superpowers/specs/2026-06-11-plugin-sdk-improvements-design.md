# Plugin SDK Improvements — Design Spec
_2026-06-11_

## Scope

Two independent features:
1. **Plugin-to-plugin events** — cross-plugin pub/sub via typed topic registry
2. **Plugin CLI** — `@vencore/plugin-cli` package with `create`, `build`, `dev`, `validate`

---

## 1. Plugin-to-Plugin Events

### Manifest (`plugin.json`)

```json
{
  "emits": ["calendar:event.created", "calendar:event.deleted"],
  "listens": ["tasks:task.created"]
}
```

- `emits`: topics this plugin publishes. Format: `<pluginId>:<topic>`.
- `listens`: topics this plugin subscribes to. Host validates at install — warns if emitting plugin absent.

### API

No new surface. Extends existing `bus.emit` / `bus.on`:

```typescript
// Emit cross-plugin event
vencore.bus.emit('calendar:event.created', { id, title, date })

// Subscribe to another plugin's event
vencore.bus.on('calendar:event.created', (payload) => { ... })
```

### Host Routing (internal to API)

Central `PluginBus` (Node `EventEmitter`) instantiated once in the API process.

On `bus.emit(topic, payload)`:
1. Validate topic is declared in plugin's `emits` → drop + warn if not
2. Emit on internal bus with full namespaced key
3. Host delivers to all plugins declaring the topic in `listens`

On plugin uninstall: all listeners auto-removed.

Payload must be JSON-serializable. No shared object references.

### Error Handling

| Scenario | Behavior |
|---|---|
| Emit undeclared topic | Warning logged, event dropped |
| Subscriber throws | Isolated — does not affect emitter |
| Emitting plugin not installed | Host warns at subscriber install time |
| Payload not serializable | Runtime error thrown to emitter |

### Types (`plugin-types`)

```typescript
// Extend PluginManifest
listens?: string[]

// Extend VencoreBackendAPI bus
bus: {
  emit(topic: string, payload: unknown): void
  on(topic: string, handler: (payload: unknown) => void | Promise<void>): void
}
```

---

## 2. Plugin CLI (`@vencore/plugin-cli`)

### Package

New package: `packages/plugin-cli` in the monorepo.
Published as `@vencore/plugin-cli`. Exposes `vencore` binary.

Install: `npm i -g @vencore/plugin-cli`

### Commands

#### `vencore create <name>`

Copies embedded example template into `./<name>/`, then:
1. Replace all `example-plugin` occurrences with `<name>`
2. Update `plugin.json` `id` and `name` fields
3. Run `pnpm install`

**Embedded template structure:**
```
example-plugin/
  plugin.json           # id, name, version, permissions, surfaces, emits, listens
  src/
    index.ts            # createPlugin — one cron job + one hook listener
    client/
      index.tsx         # createFrontendPlugin — one registered page
      App.tsx           # minimal React component
  tsup.config.ts        # uses defineClientBuild()
  package.json
  tsconfig.json
```

#### `vencore build`

1. Run `tsup` using project's `tsup.config.ts`
2. Read `id` + `version` from `plugin.json`
3. Zip: `dist/` + `plugin.json` + `package.json` + `assets/` (if exists)
4. Output: `<id>-<version>.zip` in project root

#### `vencore dev`

Run `tsup --watch`. No zip. Fast iteration only.

#### `vencore validate`

Load `plugin.json`, check:
- Required fields: `id`, `name`, `version`
- `emits` topics match `<pluginId>:*` format
- `listens` topics are valid format
- `permissions` reference known built-ins or declared custom permissions
- `surfaces` nav items have valid group values (`crm` / `infra` / `general`)

Print errors with field paths. Exit code 1 on failure.

### Dependencies

| Dep | Purpose |
|---|---|
| `commander` | CLI argument parsing |
| `archiver` | Zip creation |
| `fs-extra` | File copy/replace |
| `chalk` | Terminal output |

---

## Out of Scope

- Batch operations, real-time subscriptions, frontend mutations, HTTP middleware (future)
- Remote template fetch
- Plugin registry / publish command
- Multi-instance Redis-backed event bus
