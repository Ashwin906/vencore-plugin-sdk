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
