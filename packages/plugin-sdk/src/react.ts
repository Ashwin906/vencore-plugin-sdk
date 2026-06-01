import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type {
  PluginContext,
  ResourceRow,
  ResourceInput,
  ResourceFilter,
  PluginError,
  KnownResource,
} from '@vantage/plugin-types';
import { getVantageInstance } from './_store';

// ── usePluginContext — suspends until sdk:init received ───────────────────────

let _contextPromise: Promise<PluginContext> | null = null;
let _resolvedContext: PluginContext | null = null;

/**
 * Returns the PluginContext injected by the host via sdk:init.
 * Uses React Suspense — wrap the consuming component in a <Suspense> boundary.
 */
export function usePluginContext(): PluginContext {
  if (_resolvedContext) return _resolvedContext;
  if (!_contextPromise) {
    _contextPromise = (getVantageInstance() as any)
      .getContext()
      .then((ctx: PluginContext) => {
        _resolvedContext = ctx;
        return ctx;
      });
  }
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw _contextPromise; // React Suspense protocol
}

// ── Shared state shapes ──────────────────────────────────────────────────────

type QueryState<T> = { data: T | null; loading: boolean; error: PluginError | null };
type MutationState<T> = { data: T | null; loading: boolean; error: PluginError | null };

// ── useList ──────────────────────────────────────────────────────────────────

export function useList<R extends KnownResource>(
  resource: R,
  filter?: ResourceFilter<R>,
  opts?: { skip?: boolean },
): QueryState<ResourceRow<R>[]> & { refetch(): void } {
  const [state, setState] = useState<QueryState<ResourceRow<R>[]>>({
    data: null,
    loading: !opts?.skip,
    error: null,
  });
  const refetchCounter = useRef(0);
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    if (opts?.skip) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (getVantageInstance().list(resource, filter) as Promise<ResourceRow<R>[]>)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: PluginError) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, filterKey, refetchCounter.current, opts?.skip]);

  const refetch = useCallback(() => { refetchCounter.current++; }, []);
  return { ...state, refetch };
}

// ── useGet ───────────────────────────────────────────────────────────────────

export function useGet<R extends KnownResource>(
  resource: R,
  id: string | null | undefined,
): QueryState<ResourceRow<R>> {
  const [state, setState] = useState<QueryState<ResourceRow<R>>>({
    data: null,
    loading: !!id,
    error: null,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (getVantageInstance().get(resource, id) as Promise<ResourceRow<R>>)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: PluginError) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => { cancelled = true; };
  }, [resource, id]);

  return state;
}

// ── useCreate ────────────────────────────────────────────────────────────────

export function useCreate<R extends KnownResource>(
  resource: R,
): MutationState<ResourceRow<R>> & { mutate(data: ResourceInput<R>): Promise<ResourceRow<R>> } {
  const [state, setState] = useState<MutationState<ResourceRow<R>>>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(
    async (data: ResourceInput<R>): Promise<ResourceRow<R>> => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await (getVantageInstance().create(resource, data) as Promise<ResourceRow<R>>);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        setState({ loading: false, error: error as PluginError, data: null });
        throw error;
      }
    },
    [resource],
  );

  return { ...state, mutate };
}

// ── useUpdate ────────────────────────────────────────────────────────────────

export function useUpdate<R extends KnownResource>(
  resource: R,
): MutationState<ResourceRow<R>> & {
  mutate(id: string, data: Partial<ResourceInput<R>>): Promise<ResourceRow<R>>;
} {
  const [state, setState] = useState<MutationState<ResourceRow<R>>>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(
    async (id: string, data: Partial<ResourceInput<R>>): Promise<ResourceRow<R>> => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await (getVantageInstance().update(resource, id, data) as Promise<ResourceRow<R>>);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        setState({ loading: false, error: error as PluginError, data: null });
        throw error;
      }
    },
    [resource],
  );

  return { ...state, mutate };
}

// ── useDelete ────────────────────────────────────────────────────────────────

export function useDelete<R extends KnownResource>(
  resource: R,
): { loading: boolean; error: PluginError | null; mutate(id: string): Promise<void> } {
  const [state, setState] = useState({ loading: false, error: null as PluginError | null });

  const mutate = useCallback(
    async (id: string): Promise<void> => {
      setState({ loading: true, error: null });
      try {
        await getVantageInstance().delete(resource, id);
        setState({ loading: false, error: null });
      } catch (error) {
        setState({ loading: false, error: error as PluginError });
        throw error;
      }
    },
    [resource],
  );

  return { ...state, mutate };
}

// ── useAction ────────────────────────────────────────────────────────────────

export function useAction<T = unknown>(
  resource: string,
  action: string,
): MutationState<T> & { mutate(payload?: unknown): Promise<T> } {
  const [state, setState] = useState<MutationState<T>>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(
    async (payload?: unknown): Promise<T> => {
      setState({ loading: true, error: null, data: null });
      try {
        const result = await getVantageInstance().action<T>(resource, action, payload);
        setState({ loading: false, error: null, data: result });
        return result;
      } catch (error) {
        setState({ loading: false, error: error as PluginError, data: null });
        throw error;
      }
    },
    [resource, action],
  );

  return { ...state, mutate };
}

// ── usePluginTable ───────────────────────────────────────────────────────────

type TableQueryOpts = {
  where?: Record<string, unknown>;
  orderBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export function usePluginTable(
  tableName: string,
  query?: TableQueryOpts,
): QueryState<Record<string, unknown>[]> & { refetch(): void } {
  const [state, setState] = useState<QueryState<Record<string, unknown>[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const queryKey = JSON.stringify(query);
  const refetchCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    getVantageInstance()
      .table(tableName)
      .list(query)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: PluginError) => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, queryKey, refetchCounter.current]);

  const refetch = useCallback(() => { refetchCounter.current++; }, []);
  return { ...state, refetch };
}
