import { describe, it, expect, vi } from 'vitest';
import { createVantageBackend } from '../backend';
import type { BridgeFn } from '../bridge';

function makeBridge(data: unknown = {}): BridgeFn {
  return vi.fn().mockResolvedValue({ data, error: null });
}

function makeErrorBridge(code: string, message: string): BridgeFn {
  return vi.fn().mockResolvedValue({ data: null, error: { code, message } });
}

describe('VantageBackend.list', () => {
  it('calls bridge with {resource}.list method', async () => {
    const bridge = makeBridge([{ id: '1' }]);
    const v = createVantageBackend(bridge);
    const result = await v.list('contacts', { limit: 10 });
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.list', payload: { filter: { limit: 10 } } });
    expect(result).toEqual([{ id: '1' }]);
  });
});

describe('VantageBackend.get', () => {
  it('calls bridge with {resource}.get method', async () => {
    const bridge = makeBridge({ id: 'abc' });
    const v = createVantageBackend(bridge);
    const result = await v.get('deals', 'abc');
    expect(bridge).toHaveBeenCalledWith({ method: 'deals.get', payload: { id: 'abc' } });
    expect(result).toEqual({ id: 'abc' });
  });
});

describe('VantageBackend.create', () => {
  it('calls bridge with {resource}.create method', async () => {
    const bridge = makeBridge({ id: 'new' });
    const v = createVantageBackend(bridge);
    await v.create('tasks', { title: 'Test' });
    expect(bridge).toHaveBeenCalledWith({ method: 'tasks.create', payload: { data: { title: 'Test' } } });
  });
});

describe('VantageBackend.update', () => {
  it('calls bridge with {resource}.update method', async () => {
    const bridge = makeBridge({ id: 'x' });
    const v = createVantageBackend(bridge);
    await v.update('contacts', 'x', { name: 'New' });
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.update', payload: { id: 'x', data: { name: 'New' } } });
  });
});

describe('VantageBackend.delete', () => {
  it('calls bridge with {resource}.delete method', async () => {
    const bridge = makeBridge(undefined);
    const v = createVantageBackend(bridge);
    await v.delete('contacts', 'x');
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.delete', payload: { id: 'x' } });
  });
});

describe('VantageBackend error handling', () => {
  it('throws PluginError when bridge returns error', async () => {
    const bridge = makeErrorBridge('NOT_FOUND', 'Contact not found');
    const v = createVantageBackend(bridge);
    await expect(v.get('contacts', 'x')).rejects.toEqual({ code: 'NOT_FOUND', message: 'Contact not found' });
  });
});

describe('VantageBackend.safe', () => {
  it('returns PluginResult instead of throwing', async () => {
    const bridge = makeErrorBridge('NOT_FOUND', 'Not found');
    const v = createVantageBackend(bridge);
    const result = await v.safe.get('contacts', 'x');
    expect(result).toEqual({ data: null, error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('returns {data, error: null} on success', async () => {
    const bridge = makeBridge([{ id: '1' }]);
    const v = createVantageBackend(bridge);
    const result = await v.safe.list('contacts');
    expect(result).toEqual({ data: [{ id: '1' }], error: null });
  });
});

describe('VantageBackend.storage', () => {
  it('dispatches storage.get', async () => {
    const bridge = makeBridge('stored-value');
    const v = createVantageBackend(bridge);
    const val = await v.storage.get('my-key');
    expect(bridge).toHaveBeenCalledWith({ method: 'storage.get', payload: { key: 'my-key' } });
    expect(val).toBe('stored-value');
  });

  it('dispatches storage.set', async () => {
    const bridge = makeBridge(null);
    const v = createVantageBackend(bridge);
    await v.storage.set('my-key', { foo: 1 });
    expect(bridge).toHaveBeenCalledWith({ method: 'storage.set', payload: { key: 'my-key', value: { foo: 1 } } });
  });
});

describe('VantageBackend.on + _dispatchHook', () => {
  it('registers and dispatches event handlers', async () => {
    const bridge = makeBridge([]);
    const v = createVantageBackend(bridge);
    const handler = vi.fn();
    v.on('contact.created', handler);
    await v._dispatchHook('contact.created', { id: 'c1' });
    expect(handler).toHaveBeenCalledWith({ id: 'c1' });
  });

  it('dispatches to multiple handlers for same event', async () => {
    const bridge = makeBridge([]);
    const v = createVantageBackend(bridge);
    const h1 = vi.fn();
    const h2 = vi.fn();
    v.on('deal.created', h1);
    v.on('deal.created', h2);
    await v._dispatchHook('deal.created', { id: 'd1' });
    expect(h1).toHaveBeenCalledWith({ id: 'd1' });
    expect(h2).toHaveBeenCalledWith({ id: 'd1' });
  });

  it('does not dispatch to wrong event', async () => {
    const bridge = makeBridge([]);
    const v = createVantageBackend(bridge);
    const handler = vi.fn();
    v.on('contact.created', handler);
    await v._dispatchHook('deal.created', { id: 'd1' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('VantageBackend.table', () => {
  it('dispatches table.list with name', async () => {
    const bridge = makeBridge([]);
    const v = createVantageBackend(bridge);
    await v.table('cache').list({ limit: 5 });
    expect(bridge).toHaveBeenCalledWith({
      method: 'table.list',
      payload: expect.objectContaining({ name: 'cache', limit: 5 }),
    });
  });
});
