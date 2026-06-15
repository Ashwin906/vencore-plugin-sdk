import { describe, it, expect, vi } from 'vitest';
import { createVencoreBackend } from '../backend';
import type { BridgeFn } from '../bridge';

function makeBridge(data: unknown = {}): BridgeFn {
  return vi.fn().mockResolvedValue({ data, error: null });
}

function makeErrorBridge(code: string, message: string): BridgeFn {
  return vi.fn().mockResolvedValue({ data: null, error: { code, message } });
}

describe('VencoreBackend.list', () => {
  it('calls bridge with {resource}.list method', async () => {
    const bridge = makeBridge([{ id: '1' }]);
    const v = createVencoreBackend(bridge);
    const result = await v.list('contacts', { limit: 10 });
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.list', payload: { filter: { limit: 10 } } });
    expect(result).toEqual([{ id: '1' }]);
  });
});

describe('VencoreBackend.get', () => {
  it('calls bridge with {resource}.get method', async () => {
    const bridge = makeBridge({ id: 'abc' });
    const v = createVencoreBackend(bridge);
    const result = await v.get('deals', 'abc');
    expect(bridge).toHaveBeenCalledWith({ method: 'deals.get', payload: { id: 'abc' } });
    expect(result).toEqual({ id: 'abc' });
  });
});

describe('VencoreBackend.create', () => {
  it('calls bridge with {resource}.create method', async () => {
    const bridge = makeBridge({ id: 'new' });
    const v = createVencoreBackend(bridge);
    await v.create('tasks', { title: 'Test' });
    expect(bridge).toHaveBeenCalledWith({ method: 'tasks.create', payload: { data: { title: 'Test' } } });
  });
});

describe('VencoreBackend.update', () => {
  it('calls bridge with {resource}.update method', async () => {
    const bridge = makeBridge({ id: 'x' });
    const v = createVencoreBackend(bridge);
    await v.update('contacts', 'x', { name: 'New' });
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.update', payload: { id: 'x', data: { name: 'New' } } });
  });
});

describe('VencoreBackend.delete', () => {
  it('calls bridge with {resource}.delete method', async () => {
    const bridge = makeBridge(undefined);
    const v = createVencoreBackend(bridge);
    await v.delete('contacts', 'x');
    expect(bridge).toHaveBeenCalledWith({ method: 'contacts.delete', payload: { id: 'x' } });
  });
});

describe('VencoreBackend error handling', () => {
  it('throws PluginError when bridge returns error', async () => {
    const bridge = makeErrorBridge('NOT_FOUND', 'Contact not found');
    const v = createVencoreBackend(bridge);
    await expect(v.get('contacts', 'x')).rejects.toEqual({ code: 'NOT_FOUND', message: 'Contact not found' });
  });
});

describe('VencoreBackend.safe', () => {
  it('returns PluginResult instead of throwing', async () => {
    const bridge = makeErrorBridge('NOT_FOUND', 'Not found');
    const v = createVencoreBackend(bridge);
    const result = await v.safe.get('contacts', 'x');
    expect(result).toEqual({ data: null, error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('returns {data, error: null} on success', async () => {
    const bridge = makeBridge([{ id: '1' }]);
    const v = createVencoreBackend(bridge);
    const result = await v.safe.list('contacts');
    expect(result).toEqual({ data: [{ id: '1' }], error: null });
  });
});

describe('VencoreBackend.storage', () => {
  it('dispatches storage.get', async () => {
    const bridge = makeBridge('stored-value');
    const v = createVencoreBackend(bridge);
    const val = await v.storage.get('my-key');
    expect(bridge).toHaveBeenCalledWith({ method: 'storage.get', payload: { key: 'my-key' } });
    expect(val).toBe('stored-value');
  });

  it('dispatches storage.set', async () => {
    const bridge = makeBridge(null);
    const v = createVencoreBackend(bridge);
    await v.storage.set('my-key', { foo: 1 });
    expect(bridge).toHaveBeenCalledWith({ method: 'storage.set', payload: { key: 'my-key', value: { foo: 1 } } });
  });
});

describe('VencoreBackend.on + _dispatchHook', () => {
  it('registers and dispatches event handlers', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
    const handler = vi.fn();
    v.on('contact.created', handler);
    await v._dispatchHook('contact.created', { id: 'c1' });
    expect(handler).toHaveBeenCalledWith({ id: 'c1' });
  });

  it('dispatches to multiple handlers for same event', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
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
    const v = createVencoreBackend(bridge);
    const handler = vi.fn();
    v.on('contact.created', handler);
    await v._dispatchHook('deal.created', { id: 'd1' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('VencoreBackend.table', () => {
  it('dispatches table.list with name', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
    await v.table('cache').list({ limit: 5 });
    expect(bridge).toHaveBeenCalledWith({
      method: 'table.list',
      payload: expect.objectContaining({ name: 'cache', limit: 5 }),
    });
  });
});

describe('VencoreBackend.http.onEndpoint + _dispatchHttpEndpoint', () => {
  it('registers and dispatches HTTP requests based on path', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
    
    const handler = vi.fn().mockResolvedValue({ status: 200, body: 'ok' });
    v.http.onEndpoint('/webhooks/stripe', handler);
    
    const req = {
      method: 'POST',
      path: '/webhooks/stripe',
      query: {},
      headers: {},
      body: '{}',
      params: {}
    };
    
    const res = await v._dispatchHttpEndpoint(req);
    expect(handler).toHaveBeenCalledWith(req);
    expect(res).toEqual({ status: 200, body: 'ok' });
  });

  it('extracts params from dynamic paths', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
    
    const handler = vi.fn().mockResolvedValue({ status: 200 });
    v.http.onEndpoint('/users/:userId/settings/:settingId', handler);
    
    const req = {
      method: 'GET',
      path: '/users/u_123/settings/s_456',
      query: {},
      headers: {},
      body: null,
      params: {} // initial empty params
    };
    
    await v._dispatchHttpEndpoint(req);
    
    expect(handler).toHaveBeenCalledWith({
      ...req,
      params: {
        userId: 'u_123',
        settingId: 's_456'
      }
    });
  });

  it('supports wildcard paths', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
    
    const handler = vi.fn().mockResolvedValue({ status: 200 });
    v.http.onEndpoint('/assets/*', handler);
    
    const req = {
      method: 'GET',
      path: '/assets/images/logo.png',
      query: {},
      headers: {},
      body: null,
      params: {}
    };
    
    await v._dispatchHttpEndpoint(req);
    
    expect(handler).toHaveBeenCalledWith(req);
  });

  it('returns 404 for unknown endpoints', async () => {
    const bridge = makeBridge([]);
    const v = createVencoreBackend(bridge);
    
    v.http.onEndpoint('/known', vi.fn());
    
    const req = {
      method: 'GET',
      path: '/unknown',
      query: {},
      headers: {},
      body: null,
      params: {}
    };
    
    const res = await v._dispatchHttpEndpoint(req);
    expect(res.status).toBe(404);
  });
});

