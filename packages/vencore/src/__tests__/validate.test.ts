import { describe, it, expect } from 'vitest'
import { validateManifest } from '../cli/commands/validate'

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
