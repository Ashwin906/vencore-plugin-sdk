import type { PluginError } from './types';

export interface BridgeCall {
  method: string;   // e.g. "contacts.list", "table.insert", "storage.get"
  payload: unknown;
}

export type BridgeResult<T = unknown> =
  | { data: T; error: null }
  | { data: null; error: PluginError };

/** Function injected by the runtime to handle all vencore.* calls */
export type BridgeFn = (call: BridgeCall) => Promise<BridgeResult>;

/**
 * Creates a bridge that sends calls to the parent iframe via postMessage.
 * Used by the frontend SDK — the host page receives the message and
 * forwards it to the API, then posts the response back.
 */
export function createPostMessageBridge(timeoutMs = 30_000, targetOrigin = '*'): BridgeFn {
  return ({ method, payload }) =>
    new Promise((resolve) => {
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);

      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({
          data: null,
          error: { code: 'TIMEOUT', message: `[plugin-sdk] bridge call '${method}' timed out after ${timeoutMs}ms` },
        });
      }, timeoutMs);

      function handler(event: MessageEvent) {
        if (
          event.source !== window.parent ||
          event.data?.type !== 'bridge:response' ||
          event.data?.id !== id
        ) return;
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve(event.data.result as BridgeResult);
      }

      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'bridge:request', id, method, payload }, targetOrigin);
    });
}
