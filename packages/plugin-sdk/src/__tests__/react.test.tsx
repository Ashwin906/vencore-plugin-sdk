import { describe, it, expect, vi } from 'vitest';
import { createFrontendPlugin } from '../react';
import { VencoreFrontendImpl } from '../frontend';
import type { BridgeFn } from '../bridge';
import type { FrontendSurfaceRegistry } from '../react';

function makeBridge(data: unknown = null): BridgeFn {
  return vi.fn().mockResolvedValue({ data, error: null });
}

function makeRegistry(): FrontendSurfaceRegistry {
  return {
    pages: new Map(),
    widgets: new Map(),
    panels: new Map(),
  };
}

describe('createFrontendPlugin', () => {
  it('returns the config object unchanged', () => {
    const setup = vi.fn();
    const plugin = createFrontendPlugin({ setup });
    expect(plugin.setup).toBe(setup);
  });

  it('setup is callable', async () => {
    const setup = vi.fn();
    const plugin = createFrontendPlugin({ setup });
    const vencore = new VencoreFrontendImpl(makeBridge(), makeRegistry());
    await plugin.setup(vencore);
    expect(setup).toHaveBeenCalledWith(vencore);
  });
});

describe('VencoreFrontendImpl', () => {
  it('registerPage stores component in registry', () => {
    const registry = makeRegistry();
    const vencore = new VencoreFrontendImpl(makeBridge(), registry);
    const Comp = () => null;
    vencore.registerPage('/test', Comp);
    expect(registry.pages.get('/test')).toBe(Comp);
  });

  it('registerWidget stores component in registry', () => {
    const registry = makeRegistry();
    const vencore = new VencoreFrontendImpl(makeBridge(), registry);
    const Comp = () => null;
    vencore.registerWidget('my-widget', Comp);
    expect(registry.widgets.get('my-widget')).toBe(Comp);
  });

  it('registerPanel stores panel with composite key', () => {
    const registry = makeRegistry();
    const vencore = new VencoreFrontendImpl(makeBridge(), registry);
    const Comp = () => null;
    vencore.registerPanel('contact', 'info', Comp);
    const panel = registry.panels.get('contact:info');
    expect(panel?.component).toBe(Comp);
    expect(panel?.recordType).toBe('contact');
    expect(panel?.id).toBe('info');
  });

  it('settings.get returns null on bridge error', async () => {
    const bridge: BridgeFn = vi.fn().mockResolvedValue({ data: null, error: { code: 'NOT_FOUND', message: 'nope' } });
    const vencore = new VencoreFrontendImpl(bridge, makeRegistry());
    const result = await vencore.settings.get('missing_key');
    expect(result).toBeNull();
  });

  it('list calls bridge with resource.list method', async () => {
    const bridge = makeBridge([{ id: '1' }]);
    const vencore = new VencoreFrontendImpl(bridge, makeRegistry());
    const result = await vencore.list('contacts');
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.list', payload: { filter: undefined } });
    expect(result).toEqual([{ id: '1' }]);
  });

  it('get calls bridge with resource.get method', async () => {
    const bridge = makeBridge({ id: '42' });
    const vencore = new VencoreFrontendImpl(bridge, makeRegistry());
    const result = await vencore.get('contacts', '42');
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.get', payload: { id: '42' } });
    expect(result).toEqual({ id: '42' });
  });

  it('bus.on registers handler and returns unsubscribe', () => {
    const vencore = new VencoreFrontendImpl(makeBridge(), makeRegistry());
    const handler = vi.fn();
    const unsub = vencore.bus.on('my-event', handler);
    vencore._dispatchBusEvent('my-event', { foo: 'bar' });
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
    unsub();
    vencore._dispatchBusEvent('my-event', { foo: 'baz' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('table.list calls bridge with table.list method', async () => {
    const bridge = makeBridge([{ id: 'r1' }]);
    const vencore = new VencoreFrontendImpl(bridge, makeRegistry());
    const result = await vencore.table('issues').list({ limit: 10 });
    expect(bridge).toHaveBeenCalledWith({ method: 'table.list', payload: { name: 'issues', limit: 10 } });
    expect(result).toEqual([{ id: 'r1' }]);
  });
});
