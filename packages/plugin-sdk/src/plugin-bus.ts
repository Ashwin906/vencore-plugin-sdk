import { EventEmitter } from 'events'

interface PluginRegistration {
  emits: Set<string>
  listens: Set<string>
  handlers: Array<{ topic: string; fn: (payload: unknown) => void }>
}

export class PluginBus {
  private emitter = new EventEmitter()
  private plugins = new Map<string, PluginRegistration>()

  constructor() {
    this.emitter.setMaxListeners(0)
  }

  registerPlugin(pluginId: string, emits: string[], listens: string[]): void {
    this.unregisterPlugin(pluginId)
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
      JSON.stringify(payload, (_key, value) => {
        if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
          throw new Error('non-serializable value')
        }
        return value
      })
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
