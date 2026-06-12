# Plugin SDK Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add plugin-to-plugin cross-plugin event routing (via typed topic registry) and a standalone `@vencore/plugin-cli` package with `create`, `build`, `dev`, and `validate` commands.

**Architecture:** `PluginBus` is a host-side routing class exported from `@vencore/plugin-sdk` — it tracks which plugins declare `emits`/`listens` topics and routes events between them. Plugin authors use the existing `bus.emit` / `bus.on` API unchanged; the host wires `PluginBus` into its dispatch loop. The CLI is a new workspace package with an embedded example template and `archiver`-based zip output.

**Tech Stack:** TypeScript 5.4, vitest, Node `EventEmitter`, commander, archiver, chalk, fs-extra, tsup.

---

## Task 1: Add `listens` to `PluginManifest`

**Files:**
- Modify: `packages/plugin-types/src/index.ts:457-478`

- [ ] **Step 1: Add `listens` field**

In `packages/plugin-types/src/index.ts`, find `PluginManifest` and add `listens` after `emits`:

```typescript
  /** Events this plugin emits on the bus. Declarative — for discovery. */
  emits?: string[];
  /** Cross-plugin bus topics this plugin subscribes to. Format: "<pluginId>:<topic>". */
  listens?: string[];
  surfaces?: PluginSurfaces;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/plugin-types && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/plugin-bus-and-cli
git add packages/plugin-types/src/index.ts
git commit -m "feat(types): add listens field to PluginManifest"
```

---

## Task 2: Implement `PluginBus` with tests

**Files:**
- Create: `packages/plugin-sdk/src/plugin-bus.ts`
- Create: `packages/plugin-sdk/src/__tests__/plugin-bus.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/plugin-sdk/src/__tests__/plugin-bus.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PluginBus } from '../plugin-bus'

describe('PluginBus', () => {
  let bus: PluginBus

  beforeEach(() => {
    bus = new PluginBus()
  })

  it('routes event from emitter to subscriber', async () => {
    bus.registerPlugin('calendar', ['calendar:event.created'], [])
    bus.registerPlugin('mail', [], ['calendar:event.created'])

    const handler = vi.fn()
    bus.on('mail', 'calendar:event.created', handler)
    bus.emit('calendar', 'calendar:event.created', { id: '1' })

    await new Promise(r => setTimeout(r, 0))
    expect(handler).toHaveBeenCalledWith({ id: '1' })
  })

  it('drops emit for undeclared topic and returns false', () => {
    bus.registerPlugin('calendar', [], [])
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = bus.emit('calendar', 'calendar:event.created', {})

    expect(result).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('ignores on() for undeclared listens topic', () => {
    bus.registerPlugin('mail', [], [])
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const handler = vi.fn()

    bus.on('mail', 'calendar:event.created', handler)
    bus.emit('calendar', 'calendar:event.created', {})

    expect(handler).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('isolates subscriber errors — emitter is not affected', async () => {
    bus.registerPlugin('calendar', ['calendar:event.created'], [])
    bus.registerPlugin('mail', [], ['calendar:event.created'])

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    bus.on('mail', 'calendar:event.created', () => { throw new Error('boom') })

    expect(() => bus.emit('calendar', 'calendar:event.created', {})).not.toThrow()
    await new Promise(r => setTimeout(r, 0))
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('removes all listeners on unregisterPlugin', async () => {
    bus.registerPlugin('calendar', ['calendar:event.created'], [])
    bus.registerPlugin('mail', [], ['calendar:event.created'])

    const handler = vi.fn()
    bus.on('mail', 'calendar:event.created', handler)
    bus.unregisterPlugin('mail')
    bus.emit('calendar', 'calendar:event.created', { id: '1' })

    await new Promise(r => setTimeout(r, 0))
    expect(handler).not.toHaveBeenCalled()
  })

  it('throws when payload is not JSON-serializable', () => {
    bus.registerPlugin('calendar', ['calendar:event.created'], [])

    expect(() =>
      bus.emit('calendar', 'calendar:event.created', { fn: () => {} })
    ).toThrow('not JSON-serializable')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/plugin-sdk && npx vitest run src/__tests__/plugin-bus.test.ts
```

Expected: FAIL — `Cannot find module '../plugin-bus'`

- [ ] **Step 3: Implement `PluginBus`**

Create `packages/plugin-sdk/src/plugin-bus.ts`:

```typescript
import { EventEmitter } from 'events'

interface PluginRegistration {
  emits: Set<string>
  listens: Set<string>
  handlers: Array<{ topic: string; fn: (payload: unknown) => void }>
}

export class PluginBus {
  private emitter = new EventEmitter()
  private plugins = new Map<string, PluginRegistration>()

  registerPlugin(pluginId: string, emits: string[], listens: string[]): void {
    this.plugins.set(pluginId, {
      emits: new Set(emits),
      listens: new Set(listens),
      handlers: [],
    })
  }

  unregisterPlugin(pluginId: string): void {
    const reg = this.plugins.get(pluginId)
    if (!reg) return
    for (const { topic, fn } of reg.handlers) {
      this.emitter.removeListener(topic, fn)
    }
    this.plugins.delete(pluginId)
  }

  emit(pluginId: string, topic: string, payload: unknown): boolean {
    const reg = this.plugins.get(pluginId)
    if (!reg?.emits.has(topic)) {
      console.warn(`[PluginBus] "${pluginId}" emitted undeclared topic "${topic}" — dropped`)
      return false
    }
    try {
      JSON.stringify(payload)
    } catch {
      throw new Error(`[PluginBus] Payload for topic "${topic}" is not JSON-serializable`)
    }
    this.emitter.emit(topic, payload)
    return true
  }

  on(pluginId: string, topic: string, handler: (payload: unknown) => void | Promise<void>): void {
    const reg = this.plugins.get(pluginId)
    if (!reg?.listens.has(topic)) {
      console.warn(`[PluginBus] "${pluginId}" attempted to subscribe to undeclared topic "${topic}" — ignored`)
      return
    }
    const safe = (payload: unknown) => {
      try {
        Promise.resolve(handler(payload)).catch((err: unknown) => {
          console.error(`[PluginBus] Handler error in "${pluginId}" for "${topic}":`, err)
        })
      } catch (err) {
        console.error(`[PluginBus] Handler error in "${pluginId}" for "${topic}":`, err)
      }
    }
    this.emitter.on(topic, safe)
    reg.handlers.push({ topic, fn: safe })
  }
}

export const pluginBus = new PluginBus()
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd packages/plugin-sdk && npx vitest run src/__tests__/plugin-bus.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-sdk/src/plugin-bus.ts packages/plugin-sdk/src/__tests__/plugin-bus.test.ts
git commit -m "feat(sdk): add PluginBus for cross-plugin event routing"
```

---

## Task 3: Export `PluginBus` from plugin-sdk

**Files:**
- Modify: `packages/plugin-sdk/src/index.ts`

- [ ] **Step 1: Add export**

In `packages/plugin-sdk/src/index.ts`, add after the first line:

```typescript
export { createPlugin, createVencoreBackend, VencoreBackendImpl } from './backend';
export { PluginBus, pluginBus } from './plugin-bus';
export { createPostMessageBridge } from './bridge';
```

- [ ] **Step 2: Build and verify**

```bash
cd packages/plugin-sdk && pnpm build
```

Expected: builds without errors, `dist/index.js` exports `PluginBus`.

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-sdk/src/index.ts
git commit -m "feat(sdk): export PluginBus and pluginBus singleton"
```

---

## Task 4: Create `@vencore/plugin-cli` package skeleton

**Files:**
- Create: `packages/plugin-cli/package.json`
- Create: `packages/plugin-cli/tsconfig.json`
- Create: `packages/plugin-cli/tsup.config.ts`

- [ ] **Step 1: Create `package.json`**

Create `packages/plugin-cli/package.json`:

```json
{
  "name": "@vencore/plugin-cli",
  "version": "0.0.1",
  "description": "CLI for building Vencore plugins",
  "author": "Vencore",
  "license": "MIT",
  "bin": {
    "vencore": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "files": ["dist", "template"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "archiver": "^7.0.1",
    "chalk": "^5.3.0",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.3",
    "@types/node": "^22.19.20",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

Create `packages/plugin-cli/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

Create `packages/plugin-cli/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

- [ ] **Step 4: Install dependencies**

```bash
cd packages/plugin-cli && pnpm install
```

Expected: `node_modules` created with commander, archiver, chalk.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-cli/package.json packages/plugin-cli/tsconfig.json packages/plugin-cli/tsup.config.ts
git commit -m "feat(cli): add @vencore/plugin-cli package skeleton"
```

---

## Task 5: Implement `validate` command with tests

**Files:**
- Create: `packages/plugin-cli/src/commands/validate.ts`
- Create: `packages/plugin-cli/src/__tests__/validate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/plugin-cli/src/__tests__/validate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateManifest } from '../commands/validate'

describe('validateManifest', () => {
  const valid = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '0.0.1',
  }

  it('passes a valid minimal manifest', () => {
    expect(validateManifest(valid)).toEqual([])
  })

  it('fails when id is missing', () => {
    const errors = validateManifest({ name: 'X', version: '1.0.0' })
    expect(errors.some(e => e.field === 'id')).toBe(true)
  })

  it('fails when name is missing', () => {
    const errors = validateManifest({ id: 'x', version: '1.0.0' })
    expect(errors.some(e => e.field === 'name')).toBe(true)
  })

  it('fails when version is missing', () => {
    const errors = validateManifest({ id: 'x', name: 'X' })
    expect(errors.some(e => e.field === 'version')).toBe(true)
  })

  it('fails when emits topic has wrong format', () => {
    const errors = validateManifest({ ...valid, emits: ['no-colon'] })
    expect(errors.some(e => e.field.startsWith('emits'))).toBe(true)
  })

  it('passes when emits topic has correct format', () => {
    const errors = validateManifest({ ...valid, emits: ['my-plugin:event.created'] })
    expect(errors).toEqual([])
  })

  it('fails when listens topic has wrong format', () => {
    const errors = validateManifest({ ...valid, listens: ['bad'] })
    expect(errors.some(e => e.field.startsWith('listens'))).toBe(true)
  })

  it('fails when data_access has unknown permission', () => {
    const errors = validateManifest({ ...valid, data_access: ['unknown:perm'] })
    expect(errors.some(e => e.field.startsWith('data_access'))).toBe(true)
  })

  it('passes known data_access permission', () => {
    const errors = validateManifest({ ...valid, data_access: ['contacts:read'] })
    expect(errors).toEqual([])
  })

  it('fails when surfaces.nav item has invalid group', () => {
    const errors = validateManifest({
      ...valid,
      surfaces: { nav: [{ label: 'X', path: '/x', group: 'invalid' }] },
    })
    expect(errors.some(e => e.field.includes('group'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/plugin-cli && npx vitest run src/__tests__/validate.test.ts
```

Expected: FAIL — `Cannot find module '../commands/validate'`

- [ ] **Step 3: Implement `validate` command**

Create `packages/plugin-cli/src/commands/validate.ts`:

```typescript
import { readFileSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'

export interface ValidationError {
  field: string
  message: string
}

const KNOWN_PERMISSIONS = new Set([
  'contacts:read', 'contacts:write', 'companies:read', 'companies:write',
  'deals:read', 'deals:write', 'tasks:read', 'tasks:write',
  'activity:read', 'activity:write', 'servers:read', 'websites:read',
  'storage:read', 'storage:write', 'http:fetch',
])

const TOPIC_RE = /^[a-z0-9-]+:.+$/

export function validateManifest(manifest: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof manifest !== 'object' || manifest === null) {
    return [{ field: 'root', message: 'plugin.json must be a JSON object' }]
  }

  const m = manifest as Record<string, unknown>

  if (!m.id || typeof m.id !== 'string') errors.push({ field: 'id', message: 'required string' })
  if (!m.name || typeof m.name !== 'string') errors.push({ field: 'name', message: 'required string' })
  if (!m.version || typeof m.version !== 'string') errors.push({ field: 'version', message: 'required string' })

  if (m.emits !== undefined) {
    if (!Array.isArray(m.emits)) {
      errors.push({ field: 'emits', message: 'must be an array' })
    } else {
      for (const topic of m.emits) {
        if (typeof topic !== 'string' || !TOPIC_RE.test(topic)) {
          errors.push({ field: `emits[${topic}]`, message: 'must match "<pluginId>:<topic>"' })
        }
      }
    }
  }

  if (m.listens !== undefined) {
    if (!Array.isArray(m.listens)) {
      errors.push({ field: 'listens', message: 'must be an array' })
    } else {
      for (const topic of m.listens) {
        if (typeof topic !== 'string' || !TOPIC_RE.test(topic)) {
          errors.push({ field: `listens[${topic}]`, message: 'must match "<pluginId>:<topic>"' })
        }
      }
    }
  }

  if (m.data_access !== undefined) {
    if (!Array.isArray(m.data_access)) {
      errors.push({ field: 'data_access', message: 'must be an array' })
    } else {
      for (const perm of m.data_access) {
        if (!KNOWN_PERMISSIONS.has(perm as string)) {
          errors.push({ field: `data_access[${perm}]`, message: `unknown permission "${perm}"` })
        }
      }
    }
  }

  if (m.surfaces && typeof m.surfaces === 'object') {
    const surfaces = m.surfaces as Record<string, unknown>
    if (Array.isArray(surfaces.nav)) {
      for (const item of surfaces.nav as Array<Record<string, unknown>>) {
        if (item.group && !['crm', 'infra', 'general'].includes(item.group as string)) {
          errors.push({
            field: `surfaces.nav[${item.label}].group`,
            message: 'must be "crm", "infra", or "general"',
          })
        }
      }
    }
  }

  return errors
}

export async function runValidate(): Promise<void> {
  const manifestPath = resolve(process.cwd(), 'plugin.json')

  let raw: string
  try {
    raw = readFileSync(manifestPath, 'utf-8')
  } catch {
    console.error(chalk.red('✗ plugin.json not found in current directory'))
    process.exit(1)
  }

  let manifest: unknown
  try {
    manifest = JSON.parse(raw)
  } catch {
    console.error(chalk.red('✗ plugin.json is not valid JSON'))
    process.exit(1)
  }

  const errors = validateManifest(manifest)

  if (errors.length === 0) {
    console.log(chalk.green('✓ plugin.json is valid'))
  } else {
    for (const err of errors) {
      console.error(chalk.red(`✗ ${err.field}: ${err.message}`))
    }
    process.exit(1)
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd packages/plugin-cli && npx vitest run src/__tests__/validate.test.ts
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-cli/src/commands/validate.ts packages/plugin-cli/src/__tests__/validate.test.ts
git commit -m "feat(cli): add validate command with manifest schema checks"
```

---

## Task 6: Implement `create` command and embedded template

**Files:**
- Create: `packages/plugin-cli/src/commands/create.ts`
- Create: `packages/plugin-cli/template/plugin.json`
- Create: `packages/plugin-cli/template/package.json`
- Create: `packages/plugin-cli/template/tsconfig.json`
- Create: `packages/plugin-cli/template/tsup.config.ts`
- Create: `packages/plugin-cli/template/src/index.ts`
- Create: `packages/plugin-cli/template/src/client/index.tsx`
- Create: `packages/plugin-cli/template/src/client/App.tsx`

- [ ] **Step 1: Create template files**

Create `packages/plugin-cli/template/plugin.json`:

```json
{
  "id": "example-plugin",
  "name": "Example Plugin",
  "version": "0.0.1",
  "description": "A minimal Vencore plugin",
  "emits": [],
  "listens": [],
  "hooks": ["contact.created"],
  "surfaces": {
    "nav": [
      { "label": "Example", "path": "/example", "group": "general" }
    ],
    "pages": [
      { "path": "/example", "title": "Example" }
    ]
  },
  "build": {
    "server": "src/index.ts",
    "client": "src/client/index.tsx"
  }
}
```

Create `packages/plugin-cli/template/package.json`:

```json
{
  "name": "example-plugin",
  "version": "0.0.1",
  "scripts": {
    "build": "vencore build",
    "dev": "vencore dev",
    "validate": "vencore validate"
  },
  "dependencies": {
    "@vencore/plugin-sdk": "^0.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.4.0"
  }
}
```

Create `packages/plugin-cli/template/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Create `packages/plugin-cli/template/tsup.config.ts`:

```typescript
import { defineClientBuild } from '@vencore/plugin-sdk/build'

export default defineClientBuild({
  server: 'src/index.ts',
  client: 'src/client/index.tsx',
})
```

Create `packages/plugin-cli/template/src/index.ts`:

```typescript
import { createPlugin } from '@vencore/plugin-sdk'

export default createPlugin({
  setup(vencore) {
    vencore.cron.register('0 * * * *', 'hourly-log', async () => {
      const contacts = await vencore.list('contacts')
      console.log(`[example-plugin] contacts: ${contacts.length}`)
    })

    vencore.on('contact.created', async (payload) => {
      console.log('[example-plugin] contact.created:', payload)
    })
  },
})
```

Create `packages/plugin-cli/template/src/client/App.tsx`:

```tsx
export default function App() {
  return <div style={{ padding: 24 }}>Example Plugin</div>
}
```

Create `packages/plugin-cli/template/src/client/index.tsx`:

```tsx
import { createFrontendPlugin } from '@vencore/plugin-sdk/react'
import App from './App'

export default createFrontendPlugin({
  setup(vencore) {
    vencore.registerPage('/example', App)
  },
})
```

- [ ] **Step 2: Implement `create` command**

Create `packages/plugin-cli/src/commands/create.ts`:

```typescript
import { cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import chalk from 'chalk'

function replaceInFile(filePath: string, from: string, to: string): void {
  const content = readFileSync(filePath, 'utf-8')
  writeFileSync(filePath, content.replaceAll(from, to))
}

function replaceInDir(dir: string, from: string, to: string): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      replaceInDir(full, from, to)
    } else if (/\.(ts|tsx|json)$/.test(full)) {
      replaceInFile(full, from, to)
    }
  }
}

export async function runCreate(name: string): Promise<void> {
  const templateDir = join(__dirname, '..', '..', 'template')
  const targetDir = resolve(process.cwd(), name)

  console.log(chalk.cyan(`Creating plugin "${name}"...`))

  cpSync(templateDir, targetDir, { recursive: true })
  replaceInDir(targetDir, 'example-plugin', name)
  replaceInDir(targetDir, 'Example Plugin', name)

  console.log(chalk.cyan('Installing dependencies...'))
  try {
    execSync('pnpm install', { stdio: 'inherit', cwd: targetDir })
  } catch {
    console.log(chalk.yellow('pnpm not found, skipping install. Run: npm install'))
  }

  console.log(chalk.green(`✓ Created "${name}" at ./${name}`))
  console.log(`  cd ${name} && vencore dev`)
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-cli/template packages/plugin-cli/src/commands/create.ts
git commit -m "feat(cli): add create command with embedded example template"
```

---

## Task 7: Implement `build` and `dev` commands

**Files:**
- Create: `packages/plugin-cli/src/commands/build.ts`
- Create: `packages/plugin-cli/src/commands/dev.ts`

- [ ] **Step 1: Implement `build` command**

Create `packages/plugin-cli/src/commands/build.ts`:

```typescript
import { execSync } from 'child_process'
import { readFileSync, existsSync, createWriteStream } from 'fs'
import { resolve, join } from 'path'
import archiver from 'archiver'
import chalk from 'chalk'

export async function runBuild(): Promise<void> {
  const cwd = process.cwd()

  console.log(chalk.cyan('Building...'))
  try {
    execSync('npx tsup', { stdio: 'inherit', cwd })
  } catch {
    process.exit(1)
  }

  let manifest: { id: string; version: string }
  try {
    manifest = JSON.parse(readFileSync(resolve(cwd, 'plugin.json'), 'utf-8'))
  } catch {
    console.error(chalk.red('✗ plugin.json not found or invalid'))
    process.exit(1)
  }

  const { id, version } = manifest
  const zipName = `${id}-${version}.zip`
  const zipPath = resolve(cwd, zipName)

  await new Promise<void>((res, rej) => {
    const output = createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', res)
    archive.on('error', rej)
    archive.pipe(output)

    archive.directory(join(cwd, 'dist'), 'dist')
    archive.file(join(cwd, 'plugin.json'), { name: 'plugin.json' })
    archive.file(join(cwd, 'package.json'), { name: 'package.json' })

    if (existsSync(join(cwd, 'assets'))) {
      archive.directory(join(cwd, 'assets'), 'assets')
    }

    archive.finalize()
  })

  console.log(chalk.green(`✓ ${zipName}`))
}
```

- [ ] **Step 2: Implement `dev` command**

Create `packages/plugin-cli/src/commands/dev.ts`:

```typescript
import { execSync } from 'child_process'

export function runDev(): void {
  execSync('npx tsup --watch', { stdio: 'inherit', cwd: process.cwd() })
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugin-cli/src/commands/build.ts packages/plugin-cli/src/commands/dev.ts
git commit -m "feat(cli): add build (tsup + zip) and dev commands"
```

---

## Task 8: Wire CLI entry point and build

**Files:**
- Create: `packages/plugin-cli/src/index.ts`

- [ ] **Step 1: Create CLI entry**

Create `packages/plugin-cli/src/index.ts`:

```typescript
import { Command } from 'commander'
import { runCreate } from './commands/create'
import { runBuild } from './commands/build'
import { runDev } from './commands/dev'
import { runValidate } from './commands/validate'

const program = new Command()

program
  .name('vencore')
  .description('Vencore Plugin CLI')
  .version('0.0.1')

program
  .command('create <name>')
  .description('Scaffold a new plugin')
  .action(runCreate)

program
  .command('build')
  .description('Build plugin → <id>-<version>.zip')
  .action(runBuild)

program
  .command('dev')
  .description('Watch mode (no zip)')
  .action(runDev)

program
  .command('validate')
  .description('Lint plugin.json manifest')
  .action(runValidate)

program.parse()
```

- [ ] **Step 2: Build the CLI package**

```bash
cd packages/plugin-cli && pnpm build
```

Expected: `dist/index.js` created, starts with `#!/usr/bin/env node`.

- [ ] **Step 3: Smoke-test validate**

```bash
cd packages/plugin-cli && node dist/index.js validate
```

Expected: `✗ plugin.json not found in current directory` (correct — no plugin.json in cli package).

- [ ] **Step 4: Run all tests across both packages**

```bash
cd packages/plugin-sdk && pnpm test
cd packages/plugin-cli && pnpm test
```

Expected: all tests pass in both packages.

- [ ] **Step 5: Final commit**

```bash
git add packages/plugin-cli/src/index.ts
git commit -m "feat(cli): wire CLI entry point, all commands registered"
```
