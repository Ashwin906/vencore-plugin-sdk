import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useList, useGet, useCreate, useDelete, useAction, usePluginTable } from '../react';
import * as store from '../_store';
import type { VantageFrontendImpl } from '../frontend';

function makeVantage(overrides: Partial<VantageFrontendImpl> = {}): VantageFrontendImpl {
  return {
    list: vi.fn().mockResolvedValue([{ id: '1' }]),
    get: vi.fn().mockResolvedValue({ id: '1' }),
    create: vi.fn().mockResolvedValue({ id: 'new' }),
    update: vi.fn().mockResolvedValue({ id: '1' }),
    delete: vi.fn().mockResolvedValue(undefined),
    action: vi.fn().mockResolvedValue({ ok: true }),
    table: vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue([{ id: 'r1' }]),
    }),
    storage: {} as any,
    http: {} as any,
    safe: {} as any,
    on: vi.fn(),
    _dispatchEvent: vi.fn(),
    ...overrides,
  } as unknown as VantageFrontendImpl;
}

beforeEach(() => {
  vi.spyOn(store, 'getVantageInstance').mockReturnValue(makeVantage());
});

describe('useList', () => {
  it('fetches on mount and returns data', async () => {
    const { result } = renderHook(() => useList('contacts'));
    expect(result.current.loading).toBe(true);
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([{ id: '1' }]);
    expect(result.current.error).toBeNull();
  });

  it('skips fetch when opts.skip is true', () => {
    const { result } = renderHook(() => useList('contacts', undefined, { skip: true }));
    expect(result.current.loading).toBe(false);
    expect(store.getVantageInstance().list).not.toHaveBeenCalled();
  });
});

describe('useGet', () => {
  it('fetches when id is provided', async () => {
    const { result } = renderHook(() => useGet('contacts', 'abc'));
    await act(async () => {});
    expect(result.current.data).toEqual({ id: '1' });
  });

  it('skips fetch when id is null', () => {
    const { result } = renderHook(() => useGet('contacts', null));
    expect(result.current.loading).toBe(false);
    expect(store.getVantageInstance().get).not.toHaveBeenCalled();
  });
});

describe('useCreate', () => {
  it('mutate() calls create and returns data', async () => {
    const { result } = renderHook(() => useCreate('tasks'));
    let created: unknown;
    await act(async () => {
      created = await result.current.mutate({ title: 'New task' });
    });
    expect(created).toEqual({ id: 'new' });
    expect(result.current.data).toEqual({ id: 'new' });
    expect(result.current.loading).toBe(false);
  });
});

describe('useDelete', () => {
  it('mutate(id) calls delete', async () => {
    const { result } = renderHook(() => useDelete('contacts'));
    await act(async () => { await result.current.mutate('x'); });
    expect(store.getVantageInstance().delete).toHaveBeenCalledWith('contacts', 'x');
    expect(result.current.loading).toBe(false);
  });
});

describe('useAction', () => {
  it('mutate(payload) calls action with resource + action name', async () => {
    const { result } = renderHook(() => useAction('alerts', 'acknowledge'));
    await act(async () => { await result.current.mutate({ id: 'a1' }); });
    expect(store.getVantageInstance().action).toHaveBeenCalledWith('alerts', 'acknowledge', { id: 'a1' });
  });
});

describe('usePluginTable', () => {
  it('fetches from plugin-owned table', async () => {
    const { result } = renderHook(() => usePluginTable('issues'));
    await act(async () => {});
    expect(store.getVantageInstance().table).toHaveBeenCalledWith('issues');
    expect(result.current.data).toEqual([{ id: 'r1' }]);
  });
});
