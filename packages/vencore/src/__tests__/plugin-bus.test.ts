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
    bus.registerPlugin('calendar', ['calendar:event.created'], [])
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
